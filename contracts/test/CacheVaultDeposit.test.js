const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const FEE_BPS = 20; // 0.2%, matches the real deployment default

describe("CacheVaultDeposit", function () {
  async function deployFixture() {
    const [owner, alice, bob, stranger, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdgToken = await MockERC20.deploy("Mock USDG", "mUSDG");
    const otherToken = await MockERC20.deploy("Mock Other", "mOTHER");

    const MockVault = await ethers.getContractFactory("MockERC4626Vault");
    const vault = await MockVault.deploy(await usdgToken.getAddress());

    const CacheVaultDeposit = await ethers.getContractFactory("CacheVaultDeposit");
    const cache = await CacheVaultDeposit.deploy(
      await usdgToken.getAddress(),
      await vault.getAddress(),
      treasury.address,
      FEE_BPS,
      owner.address
    );

    for (const user of [alice, bob, stranger]) {
      await usdgToken.mint(user.address, ethers.parseEther("1000"));
      await usdgToken.connect(user).approve(await cache.getAddress(), ethers.MaxUint256);
    }

    return { owner, alice, bob, stranger, treasury, usdgToken, otherToken, vault, cache };
  }

  describe("deployment", function () {
    it("sets USDG, the vault, the fee recipient, and the fee rate", async function () {
      const { cache, usdgToken, vault, treasury } = await loadFixture(deployFixture);
      expect(await cache.usdgToken()).to.equal(await usdgToken.getAddress());
      expect(await cache.vault()).to.equal(await vault.getAddress());
      expect(await cache.feeRecipient()).to.equal(treasury.address);
      expect(await cache.feeBps()).to.equal(FEE_BPS);
    });

    it("rejects zero-address constructor args", async function () {
      const { owner, usdgToken, vault, treasury } = await loadFixture(deployFixture);
      const CacheVaultDeposit = await ethers.getContractFactory("CacheVaultDeposit");
      await expect(
        CacheVaultDeposit.deploy(ethers.ZeroAddress, await vault.getAddress(), treasury.address, FEE_BPS, owner.address)
      ).to.be.revertedWith("USDG token is zero address");
      await expect(
        CacheVaultDeposit.deploy(await usdgToken.getAddress(), ethers.ZeroAddress, treasury.address, FEE_BPS, owner.address)
      ).to.be.revertedWith("vault is zero address");
      await expect(
        CacheVaultDeposit.deploy(await usdgToken.getAddress(), await vault.getAddress(), ethers.ZeroAddress, FEE_BPS, owner.address)
      ).to.be.revertedWith("fee recipient is zero address");
    });

    it("rejects a fee above MAX_FEE_BPS at deploy time", async function () {
      const { owner, usdgToken, vault, treasury } = await loadFixture(deployFixture);
      const CacheVaultDeposit = await ethers.getContractFactory("CacheVaultDeposit");
      await expect(
        CacheVaultDeposit.deploy(await usdgToken.getAddress(), await vault.getAddress(), treasury.address, 201, owner.address)
      )
        .to.be.revertedWithCustomError(CacheVaultDeposit, "FeeTooHigh")
        .withArgs(201, 200);
    });

    it("rejects a vault whose declared asset is not USDG -- catches a wrong vault address at deploy time", async function () {
      const { owner, usdgToken, otherToken, treasury } = await loadFixture(deployFixture);
      const MockVault = await ethers.getContractFactory("MockERC4626Vault");
      const wrongVault = await MockVault.deploy(await otherToken.getAddress());
      const CacheVaultDeposit = await ethers.getContractFactory("CacheVaultDeposit");
      await expect(
        CacheVaultDeposit.deploy(await usdgToken.getAddress(), await wrongVault.getAddress(), treasury.address, FEE_BPS, owner.address)
      ).to.be.revertedWith("vault asset is not USDG");
    });
  });

  describe("deposit", function () {
    it("skims the fee to feeRecipient, deposits the rest into the vault with the CALLER as receiver", async function () {
      const { alice, cache, usdgToken, vault, treasury } = await loadFixture(deployFixture);
      const assets = ethers.parseEther("100");
      const expectedFee = (assets * BigInt(FEE_BPS)) / 10_000n;
      const expectedNet = assets - expectedFee;

      await expect(cache.connect(alice).deposit(assets, 0))
        .to.emit(cache, "Deposited")
        .withArgs(alice.address, assets, expectedFee, expectedNet, expectedNet); // mock vault is 1:1 shares on first deposit

      expect(await usdgToken.balanceOf(treasury.address)).to.equal(expectedFee);
      // Alice herself holds the vault shares -- not the CacheVaultDeposit
      // contract. This is the whole point: non-custodial, receiver =
      // msg.sender, never this contract.
      expect(await vault.balanceOf(alice.address)).to.equal(expectedNet);
      expect(await vault.balanceOf(await cache.getAddress())).to.equal(0);
      // Alice's own USDG actually left her wallet -- not a free mint.
      expect(await usdgToken.balanceOf(alice.address)).to.equal(ethers.parseEther("900"));
    });

    it("never leaves USDG sitting in the contract between transactions", async function () {
      const { alice, cache, usdgToken } = await loadFixture(deployFixture);
      await cache.connect(alice).deposit(ethers.parseEther("100"), 0);
      expect(await usdgToken.balanceOf(await cache.getAddress())).to.equal(0);
    });

    it("rejects a zero-amount deposit", async function () {
      const { alice, cache } = await loadFixture(deployFixture);
      await expect(cache.connect(alice).deposit(0, 0)).to.be.revertedWithCustomError(cache, "ZeroAmount");
    });

    it("does not let one caller's deposit spend another caller's USDG", async function () {
      const { alice, bob, cache, usdgToken } = await loadFixture(deployFixture);
      // Bob never sent this deposit -- deposit() pulls from msg.sender,
      // never from an address passed as an argument, so there's no way
      // for Alice's call to reach Bob's balance at all.
      await cache.connect(alice).deposit(ethers.parseEther("50"), 0);
      expect(await usdgToken.balanceOf(bob.address)).to.equal(ethers.parseEther("1000"));
    });

    it("handles a 0 feeBps deployment with no fee skimmed at all", async function () {
      const { owner, alice, usdgToken, vault, treasury } = await loadFixture(deployFixture);
      const CacheVaultDeposit = await ethers.getContractFactory("CacheVaultDeposit");
      const zeroFeeCache = await CacheVaultDeposit.deploy(
        await usdgToken.getAddress(),
        await vault.getAddress(),
        treasury.address,
        0,
        owner.address
      );
      await usdgToken.connect(alice).approve(await zeroFeeCache.getAddress(), ethers.MaxUint256);

      const assets = ethers.parseEther("100");
      await zeroFeeCache.connect(alice).deposit(assets, 0);

      expect(await usdgToken.balanceOf(treasury.address)).to.equal(0);
      expect(await vault.balanceOf(alice.address)).to.equal(assets);
    });

    it("reverts if the vault would mint fewer shares than minShares -- the slippage floor", async function () {
      const { alice, cache } = await loadFixture(deployFixture);
      const assets = ethers.parseEther("100");
      const expectedNet = assets - (assets * BigInt(FEE_BPS)) / 10_000n; // mock vault is 1:1, so net == shares out

      // Ask for one more share than the mock vault will actually mint --
      // must revert instead of silently accepting the shortfall.
      await expect(cache.connect(alice).deposit(assets, expectedNet + 1n))
        .to.be.revertedWithCustomError(cache, "SlippageTooHigh")
        .withArgs(expectedNet, expectedNet + 1n);
    });

    it("succeeds when minShares is exactly met", async function () {
      const { alice, cache, vault } = await loadFixture(deployFixture);
      const assets = ethers.parseEther("100");
      const expectedNet = assets - (assets * BigInt(FEE_BPS)) / 10_000n;
      await cache.connect(alice).deposit(assets, expectedNet);
      expect(await vault.balanceOf(alice.address)).to.equal(expectedNet);
    });
  });

  describe("setFeeRecipient", function () {
    it("is owner-only", async function () {
      const { cache, stranger } = await loadFixture(deployFixture);
      await expect(
        cache.connect(stranger).setFeeRecipient(stranger.address)
      ).to.be.revertedWithCustomError(cache, "OwnableUnauthorizedAccount");
    });

    it("rejects the zero address", async function () {
      const { owner, cache } = await loadFixture(deployFixture);
      await expect(cache.connect(owner).setFeeRecipient(ethers.ZeroAddress)).to.be.revertedWith(
        "fee recipient is zero address"
      );
    });

    it("lets the owner repoint where the fee cut goes, without affecting shares already minted", async function () {
      const { owner, alice, cache, usdgToken, vault, stranger } = await loadFixture(deployFixture);
      await cache.connect(alice).deposit(ethers.parseEther("100"), 0);
      const aliceShares = await vault.balanceOf(alice.address);

      await cache.connect(owner).setFeeRecipient(stranger.address);
      expect(await cache.feeRecipient()).to.equal(stranger.address);

      await cache.connect(alice).deposit(ethers.parseEther("100"), 0);
      expect(await usdgToken.balanceOf(stranger.address)).to.be.gt(0);
      // Alice's earlier position is untouched by the recipient change.
      expect(await vault.balanceOf(alice.address)).to.be.gt(aliceShares);
    });
  });

  describe("setFeeBps", function () {
    it("is owner-only", async function () {
      const { cache, stranger } = await loadFixture(deployFixture);
      await expect(cache.connect(stranger).setFeeBps(50)).to.be.revertedWithCustomError(
        cache,
        "OwnableUnauthorizedAccount"
      );
    });

    it("hard-caps at MAX_FEE_BPS regardless of what the owner requests", async function () {
      const { owner, cache } = await loadFixture(deployFixture);
      await expect(cache.connect(owner).setFeeBps(201))
        .to.be.revertedWithCustomError(cache, "FeeTooHigh")
        .withArgs(201, 200);
      // The ceiling itself is accepted.
      await cache.connect(owner).setFeeBps(200);
      expect(await cache.feeBps()).to.equal(200);
    });
  });

  describe("sweepStranded", function () {
    it("is owner-only", async function () {
      const { cache, stranger, otherToken } = await loadFixture(deployFixture);
      await expect(
        cache.connect(stranger).sweepStranded(await otherToken.getAddress(), stranger.address)
      ).to.be.revertedWithCustomError(cache, "OwnableUnauthorizedAccount");
    });

    it("recovers a token stranded by a direct transfer, not by deposit()", async function () {
      const { owner, alice, cache, otherToken } = await loadFixture(deployFixture);
      await otherToken.mint(alice.address, ethers.parseEther("5"));
      await otherToken.connect(alice).transfer(await cache.getAddress(), ethers.parseEther("5"));

      await cache.connect(owner).sweepStranded(await otherToken.getAddress(), owner.address);
      expect(await otherToken.balanceOf(owner.address)).to.equal(ethers.parseEther("5"));
      expect(await otherToken.balanceOf(await cache.getAddress())).to.equal(0);
    });

    it("rejects sweeping to the zero address", async function () {
      const { owner, cache, otherToken } = await loadFixture(deployFixture);
      await expect(
        cache.connect(owner).sweepStranded(await otherToken.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("cannot sweep to zero address");
    });
  });
});
