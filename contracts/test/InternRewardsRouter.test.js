const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const BE_USDG_FEE = 3000; // 0.30%, matches the real live BE/USDG pool
const TARGET_FEE = 500; // 0.05%, matches the real live NVDA/USDG and SPCX/USDG pools

describe("InternRewardsRouter", function () {
  async function deployFixture() {
    const [owner, alice, bob, stranger] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const beToken = await MockERC20.deploy("Mock BE", "mBE");
    const usdgToken = await MockERC20.deploy("Mock USDG", "mUSDG");
    const tslaToken = await MockERC20.deploy("Mock TSLA", "mTSLA");
    const nvdaToken = await MockERC20.deploy("Mock NVDA", "mNVDA");

    const MockSwapRouter = await ethers.getContractFactory("MockSwapRouter");
    const swapRouter = await MockSwapRouter.deploy();

    const Router = await ethers.getContractFactory("InternRewardsRouter");
    const router = await Router.deploy(
      await beToken.getAddress(),
      await usdgToken.getAddress(),
      await swapRouter.getAddress(),
      BE_USDG_FEE,
      owner.address
    );

    await router.connect(owner).setTargetAsset(await tslaToken.getAddress(), TARGET_FEE);

    for (const user of [alice, bob, stranger]) {
      await beToken.mint(user.address, ethers.parseEther("1000"));
      await beToken.connect(user).approve(await router.getAddress(), ethers.MaxUint256);
    }

    return { owner, alice, bob, stranger, beToken, usdgToken, tslaToken, nvdaToken, swapRouter, router };
  }

  describe("deployment", function () {
    it("sets BE, USDG, the swap router, and the BE/USDG fee", async function () {
      const { router, beToken, usdgToken, swapRouter } = await loadFixture(deployFixture);
      expect(await router.beToken()).to.equal(await beToken.getAddress());
      expect(await router.usdgToken()).to.equal(await usdgToken.getAddress());
      expect(await router.swapRouter()).to.equal(await swapRouter.getAddress());
      expect(await router.beUsdgFee()).to.equal(BE_USDG_FEE);
    });

    it("rejects zero-address constructor args and a zero BE/USDG fee", async function () {
      const { owner, beToken, usdgToken, swapRouter } = await loadFixture(deployFixture);
      const Router = await ethers.getContractFactory("InternRewardsRouter");
      await expect(
        Router.deploy(ethers.ZeroAddress, await usdgToken.getAddress(), await swapRouter.getAddress(), BE_USDG_FEE, owner.address)
      ).to.be.revertedWith("BE token is zero address");
      await expect(
        Router.deploy(await beToken.getAddress(), ethers.ZeroAddress, await swapRouter.getAddress(), BE_USDG_FEE, owner.address)
      ).to.be.revertedWith("USDG token is zero address");
      await expect(
        Router.deploy(await beToken.getAddress(), await usdgToken.getAddress(), ethers.ZeroAddress, BE_USDG_FEE, owner.address)
      ).to.be.revertedWith("swap router is zero address");
      await expect(
        Router.deploy(await beToken.getAddress(), await usdgToken.getAddress(), await swapRouter.getAddress(), 0, owner.address)
      ).to.be.revertedWith("BE/USDG fee must be set");
    });
  });

  describe("setTargetAsset", function () {
    it("is owner-only", async function () {
      const { router, stranger, nvdaToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(stranger).setTargetAsset(await nvdaToken.getAddress(), TARGET_FEE)
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });

    it("refuses to target BE or USDG directly", async function () {
      const { owner, router, beToken, usdgToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(owner).setTargetAsset(await beToken.getAddress(), TARGET_FEE)
      ).to.be.revertedWith("cannot target BE or USDG directly");
      await expect(
        router.connect(owner).setTargetAsset(await usdgToken.getAddress(), TARGET_FEE)
      ).to.be.revertedWith("cannot target BE or USDG directly");
    });

    it("lets the owner add a new target asset without redeploying", async function () {
      const { owner, router, nvdaToken } = await loadFixture(deployFixture);
      expect(await router.targetFee(await nvdaToken.getAddress())).to.equal(0);
      await router.connect(owner).setTargetAsset(await nvdaToken.getAddress(), TARGET_FEE);
      expect(await router.targetFee(await nvdaToken.getAddress())).to.equal(TARGET_FEE);
    });

    it("lets the owner remove a target asset by setting fee to 0", async function () {
      const { owner, router, tslaToken } = await loadFixture(deployFixture);
      expect(await router.targetFee(await tslaToken.getAddress())).to.equal(TARGET_FEE);
      await router.connect(owner).setTargetAsset(await tslaToken.getAddress(), 0);
      expect(await router.targetFee(await tslaToken.getAddress())).to.equal(0);
    });
  });

  describe("convert", function () {
    it("swaps the caller's own BE into an allowlisted asset, landing in their own wallet", async function () {
      const { alice, router, beToken, tslaToken } = await loadFixture(deployFixture);
      const beAmount = ethers.parseEther("100");

      await expect(router.connect(alice).convert(await tslaToken.getAddress(), beAmount, 0))
        .to.emit(router, "Converted")
        .withArgs(alice.address, await tslaToken.getAddress(), beAmount, beAmount); // mock router is 1:1 by default

      expect(await tslaToken.balanceOf(alice.address)).to.equal(beAmount);
      // The caller's BE actually left their wallet -- this isn't a free mint.
      expect(await beToken.balanceOf(alice.address)).to.equal(ethers.parseEther("900"));
    });

    it("rejects a target asset that was never allowlisted", async function () {
      const { alice, router, nvdaToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(alice).convert(await nvdaToken.getAddress(), ethers.parseEther("10"), 0)
      )
        .to.be.revertedWithCustomError(router, "UnsupportedAsset")
        .withArgs(await nvdaToken.getAddress());
    });

    it("rejects converting 0 BE", async function () {
      const { alice, router, tslaToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(alice).convert(await tslaToken.getAddress(), 0, 0)
      ).to.be.revertedWithCustomError(router, "ZeroAmount");
    });

    it("reverts on slippage below the caller's own minimum, and never pulls their BE", async function () {
      const { alice, router, swapRouter, beToken, tslaToken } = await loadFixture(deployFixture);
      const beAmount = ethers.parseEther("100");

      // Real pool conditions can pay out less than 1:1 -- simulate that,
      // then demand more than the mock router will actually deliver.
      await swapRouter.setExchangeRateBps(9000); // 90% -- a real, if unfavorable, price
      await expect(
        router.connect(alice).convert(await tslaToken.getAddress(), beAmount, beAmount) // demands full 1:1
      ).to.be.revertedWith("Too little received");

      // Reverted transactions roll back state -- the caller's BE was
      // never actually spent, same as any other failed on-chain call.
      expect(await beToken.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
    });

    it("does not let one caller's convert() spend another caller's BE", async function () {
      const { alice, bob, router, beToken, tslaToken } = await loadFixture(deployFixture);
      // Bob never approved the router for more than his own default max
      // approval set in the fixture -- convert() pulls from msg.sender,
      // never from an address passed as an argument, so there's no way
      // for Alice's call to reach Bob's balance at all.
      await router.connect(alice).convert(await tslaToken.getAddress(), ethers.parseEther("50"), 0);
      expect(await beToken.balanceOf(bob.address)).to.equal(ethers.parseEther("1000"));
    });
  });

  describe("sweepStranded", function () {
    it("is owner-only", async function () {
      const { router, stranger, beToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(stranger).sweepStranded(await beToken.getAddress(), stranger.address)
      ).to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });

    it("recovers tokens sent to the router by mistake outside of convert()", async function () {
      const { owner, alice, router, beToken } = await loadFixture(deployFixture);
      await beToken.connect(alice).transfer(await router.getAddress(), ethers.parseEther("25"));
      expect(await beToken.balanceOf(await router.getAddress())).to.equal(ethers.parseEther("25"));

      await router.connect(owner).sweepStranded(await beToken.getAddress(), owner.address);
      expect(await beToken.balanceOf(owner.address)).to.equal(ethers.parseEther("25"));
      expect(await beToken.balanceOf(await router.getAddress())).to.equal(0);
    });

    it("refuses to sweep to the zero address", async function () {
      const { owner, router, beToken } = await loadFixture(deployFixture);
      await expect(
        router.connect(owner).sweepStranded(await beToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("cannot sweep to zero address");
    });
  });
});
