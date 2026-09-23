const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const FEE_BPS = 20; // 0.2%, matches the proposed real deployment default
const LLTV_625 = ethers.parseEther("0.625"); // 62.5%, a real LLTV used on-chain

// Builds a valid AuthBundle for `signer` to authorize `cacheAddress` --
// grant at signer's current nonce, revoke at nonce+1, exactly what
// CacheBorrow's _grantAuth/_revokeAuth require. MockMorpho skips real
// EIP-712 signature verification (documented on the mock itself), so
// the signature fields are dummy zeros here -- what's actually under
// test is CacheBorrow's own bundle validation and Morpho's real nonce
// semantics (both faithfully modeled), not cryptography.
const DUMMY_SIG = { v: 0, r: ethers.ZeroHash, s: ethers.ZeroHash };
async function buildAuthBundle(morpho, cacheAddress, signer) {
  const nonce = await morpho.nonce(signer.address);
  return {
    grant: { authorizer: signer.address, authorized: cacheAddress, isAuthorized: true, nonce, deadline: ethers.MaxUint256 },
    grantSig: DUMMY_SIG,
    revoke: {
      authorizer: signer.address,
      authorized: cacheAddress,
      isAuthorized: false,
      nonce: nonce + 1n,
      deadline: ethers.MaxUint256,
    },
    revokeSig: DUMMY_SIG,
  };
}

describe("CacheBorrow", function () {
  async function deployFixture() {
    const [owner, alice, bob, stranger, treasury] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdgToken = await MockERC20.deploy("Mock USDG", "mUSDG");
    const tslaToken = await MockERC20.deploy("Mock TSLA", "mTSLA");
    const otherToken = await MockERC20.deploy("Mock Other", "mOTHER");

    const MockMorpho = await ethers.getContractFactory("MockMorpho");
    const morpho = await MockMorpho.deploy();

    const CacheBorrow = await ethers.getContractFactory("CacheBorrow");
    const cache = await CacheBorrow.deploy(
      await morpho.getAddress(),
      await usdgToken.getAddress(),
      treasury.address,
      FEE_BPS,
      owner.address
    );

    // The real MarketParams tuple this test market resolves to --
    // order matters, matches IMorpho.MarketParams exactly.
    const marketParams = {
      loanToken: await usdgToken.getAddress(),
      collateralToken: await tslaToken.getAddress(),
      oracle: stranger.address, // stand-in address, mock never reads it
      irm: stranger.address, // stand-in address, mock never reads it
      lltv: LLTV_625,
    };
    const wrongLoanMarket = { ...marketParams, loanToken: await otherToken.getAddress() };

    // Mock Morpho needs real USDG liquidity to lend out, same as a
    // real market needs real supplied liquidity before anyone can
    // borrow from it.
    await usdgToken.mint(await morpho.getAddress(), ethers.parseEther("1000000"));

    for (const user of [alice, bob, stranger]) {
      await tslaToken.mint(user.address, ethers.parseEther("1000"));
      await tslaToken.connect(user).approve(await cache.getAddress(), ethers.MaxUint256);
      await usdgToken.mint(user.address, ethers.parseEther("1000"));
      await usdgToken.connect(user).approve(await cache.getAddress(), ethers.MaxUint256);
    }

    return {
      owner,
      alice,
      bob,
      stranger,
      treasury,
      usdgToken,
      tslaToken,
      otherToken,
      morpho,
      cache,
      marketParams,
      wrongLoanMarket,
    };
  }

  describe("deployment", function () {
    it("sets morpho, USDG, the fee recipient, and the fee rate", async function () {
      const { cache, morpho, usdgToken, treasury } = await loadFixture(deployFixture);
      expect(await cache.morpho()).to.equal(await morpho.getAddress());
      expect(await cache.usdgToken()).to.equal(await usdgToken.getAddress());
      expect(await cache.feeRecipient()).to.equal(treasury.address);
      expect(await cache.feeBps()).to.equal(FEE_BPS);
    });

    it("rejects zero-address constructor args", async function () {
      const { owner, morpho, usdgToken, treasury } = await loadFixture(deployFixture);
      const CacheBorrow = await ethers.getContractFactory("CacheBorrow");
      await expect(
        CacheBorrow.deploy(ethers.ZeroAddress, await usdgToken.getAddress(), treasury.address, FEE_BPS, owner.address)
      ).to.be.revertedWith("morpho is zero address");
      await expect(
        CacheBorrow.deploy(await morpho.getAddress(), ethers.ZeroAddress, treasury.address, FEE_BPS, owner.address)
      ).to.be.revertedWith("USDG token is zero address");
      await expect(
        CacheBorrow.deploy(await morpho.getAddress(), await usdgToken.getAddress(), ethers.ZeroAddress, FEE_BPS, owner.address)
      ).to.be.revertedWith("fee recipient is zero address");
    });

    it("rejects a fee above MAX_FEE_BPS at deploy time", async function () {
      const { owner, morpho, usdgToken, treasury } = await loadFixture(deployFixture);
      const CacheBorrow = await ethers.getContractFactory("CacheBorrow");
      await expect(
        CacheBorrow.deploy(await morpho.getAddress(), await usdgToken.getAddress(), treasury.address, 201, owner.address)
      )
        .to.be.revertedWithCustomError(CacheBorrow, "FeeTooHigh")
        .withArgs(201, 200);
    });
  });

  describe("market id", function () {
    it("derives the same id for the same MarketParams from Solidity and off-chain ABI encoding", async function () {
      const { cache, marketParams } = await loadFixture(deployFixture);
      const onChainId = await cache.id(marketParams);
      const offChainId = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ["tuple(address loanToken,address collateralToken,address oracle,address irm,uint256 lltv)"],
          [marketParams]
        )
      );
      expect(onChainId).to.equal(offChainId);
    });
  });

  describe("setMarketAllowed", function () {
    it("is owner-only", async function () {
      const { cache, stranger, marketParams } = await loadFixture(deployFixture);
      await expect(
        cache.connect(stranger).setMarketAllowed(marketParams, true)
      ).to.be.revertedWithCustomError(cache, "OwnableUnauthorizedAccount");
    });

    it("rejects a market whose loanToken isn't USDG", async function () {
      const { owner, cache, usdgToken, wrongLoanMarket } = await loadFixture(deployFixture);
      await expect(cache.connect(owner).setMarketAllowed(wrongLoanMarket, true))
        .to.be.revertedWithCustomError(cache, "WrongLoanToken")
        .withArgs(wrongLoanMarket.loanToken, await usdgToken.getAddress());
    });

    it("allowlists a market and stores its params, retrievable by id", async function () {
      const { owner, cache, marketParams } = await loadFixture(deployFixture);
      const marketId = await cache.id(marketParams);
      expect(await cache.isMarketAllowed(marketId)).to.equal(false);

      await cache.connect(owner).setMarketAllowed(marketParams, true);
      expect(await cache.isMarketAllowed(marketId)).to.equal(true);
      const stored = await cache.marketParamsById(marketId);
      expect(stored.collateralToken).to.equal(marketParams.collateralToken);
      expect(stored.lltv).to.equal(marketParams.lltv);
    });

    it("can disallow a previously allowed market", async function () {
      const { owner, cache, marketParams } = await loadFixture(deployFixture);
      const marketId = await cache.id(marketParams);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      await cache.connect(owner).setMarketAllowed(marketParams, false);
      expect(await cache.isMarketAllowed(marketId)).to.equal(false);
    });
  });

  describe("depositCollateral", function () {
    it("rejects a market that isn't allowlisted", async function () {
      const { alice, cache, marketParams } = await loadFixture(deployFixture);
      const marketId = await cache.id(marketParams);
      await expect(cache.connect(alice).depositCollateral(marketParams, ethers.parseEther("10")))
        .to.be.revertedWithCustomError(cache, "MarketNotAllowed")
        .withArgs(marketId);
    });

    it("posts collateral under the CALLER's own address in Morpho, not this contract's", async function () {
      const { owner, alice, cache, morpho, tslaToken, marketParams } = await loadFixture(deployFixture);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      const marketId = await cache.id(marketParams);

      await cache.connect(alice).depositCollateral(marketParams, ethers.parseEther("10"));

      expect(await morpho.collateral(marketId, alice.address)).to.equal(ethers.parseEther("10"));
      expect(await morpho.collateral(marketId, await cache.getAddress())).to.equal(0);
      // The token itself actually moved -- not a free mint.
      expect(await tslaToken.balanceOf(alice.address)).to.equal(ethers.parseEther("990"));
      // This contract never ends a transaction holding the token.
      expect(await tslaToken.balanceOf(await cache.getAddress())).to.equal(0);
    });

    it("rejects a zero-amount deposit", async function () {
      const { owner, alice, cache, marketParams } = await loadFixture(deployFixture);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      await expect(cache.connect(alice).depositCollateral(marketParams, 0)).to.be.revertedWithCustomError(
        cache,
        "ZeroAmount"
      );
    });
  });

  describe("borrow", function () {
    async function withCollateral() {
      const fx = await deployFixture();
      await fx.cache.connect(fx.owner).setMarketAllowed(fx.marketParams, true);
      await fx.cache.connect(fx.alice).depositCollateral(fx.marketParams, ethers.parseEther("100"));
      return fx;
    }

    it("rejects a market that isn't allowlisted", async function () {
      const { bob, cache, morpho, wrongLoanMarket } = await loadFixture(deployFixture);
      const auth = await buildAuthBundle(morpho, await cache.getAddress(), bob);
      // wrongLoanMarket was never allowlisted (setMarketAllowed itself
      // would reject it too, but this checks the borrow-time gate
      // independently).
      await expect(
        cache.connect(bob).borrow(wrongLoanMarket, ethers.parseEther("10"), 0, auth)
      ).to.be.revertedWithCustomError(cache, "MarketNotAllowed");
    });

    it("skims the fee, borrows on the CALLER's own Morpho position, and sends the net amount to the caller", async function () {
      const fx = await withCollateral();
      const { alice, cache, morpho, usdgToken, treasury, marketParams } = fx;
      const marketId = await cache.id(marketParams);
      const cacheAddress = await cache.getAddress();

      const borrowAmount = ethers.parseEther("50");
      const expectedFee = (borrowAmount * BigInt(FEE_BPS)) / 10_000n;
      const expectedNet = borrowAmount - expectedFee;

      const aliceBalanceBefore = await usdgToken.balanceOf(alice.address);
      const auth = await buildAuthBundle(morpho, cacheAddress, alice);

      await expect(cache.connect(alice).borrow(marketParams, borrowAmount, 0, auth))
        .to.emit(cache, "Borrowed")
        .withArgs(alice.address, marketId, borrowAmount, expectedFee, expectedNet);

      // The DEBT position is Alice's, in Morpho's own ledger.
      expect(await morpho.borrowShares(marketId, alice.address)).to.equal(borrowAmount);
      expect(await morpho.borrowShares(marketId, cacheAddress)).to.equal(0);

      expect(await usdgToken.balanceOf(treasury.address)).to.equal(expectedFee);
      expect(await usdgToken.balanceOf(alice.address)).to.equal(aliceBalanceBefore + expectedNet);
      // Never leaves USDG sitting in the contract between transactions.
      expect(await usdgToken.balanceOf(cacheAddress)).to.equal(0);
      // And never leaves CacheBorrow with standing authorization over
      // Alice's Morpho account -- exactly the gap the first deployed
      // version of this contract got wrong.
      expect(await morpho.isAuthorized(alice.address, cacheAddress)).to.equal(false);
    });

    it("reverts if the fee rate would leave the caller with less than minReceived", async function () {
      const fx = await withCollateral();
      const { alice, cache, morpho, marketParams } = fx;
      const borrowAmount = ethers.parseEther("50");
      const expectedNet = borrowAmount - (borrowAmount * BigInt(FEE_BPS)) / 10_000n;
      const auth = await buildAuthBundle(morpho, await cache.getAddress(), alice);

      await expect(cache.connect(alice).borrow(marketParams, borrowAmount, expectedNet + 1n, auth))
        .to.be.revertedWithCustomError(cache, "SlippageTooHigh")
        .withArgs(expectedNet, expectedNet + 1n);
    });

    it("protects against a feeBps change landing between signing and mining", async function () {
      const fx = await withCollateral();
      const { owner, alice, cache, morpho, marketParams } = fx;
      const borrowAmount = ethers.parseEther("50");
      const originalNet = borrowAmount - (borrowAmount * BigInt(FEE_BPS)) / 10_000n;
      const auth = await buildAuthBundle(morpho, await cache.getAddress(), alice);

      // Owner bumps the fee to the max right before Alice's tx would land.
      await cache.connect(owner).setFeeBps(200);

      // Alice's minReceived was computed against the ORIGINAL fee rate
      // -- the higher fee now in effect must cause a revert, not a
      // silent worse deal.
      await expect(
        cache.connect(alice).borrow(marketParams, borrowAmount, originalNet, auth)
      ).to.be.revertedWithCustomError(cache, "SlippageTooHigh");
    });

    it("rejects a zero-amount borrow", async function () {
      const fx = await withCollateral();
      const auth = await buildAuthBundle(fx.morpho, await fx.cache.getAddress(), fx.alice);
      await expect(fx.cache.connect(fx.alice).borrow(fx.marketParams, 0, 0, auth)).to.be.revertedWithCustomError(
        fx.cache,
        "ZeroAmount"
      );
    });

    it("rejects an AuthBundle signed by someone other than the caller", async function () {
      const fx = await withCollateral();
      const { alice, bob, cache, morpho, marketParams } = fx;
      // Bob's own valid bundle, used while Alice is the actual caller --
      // must be rejected, not silently authorize Alice's borrow with
      // Bob's signature.
      const bobsAuth = await buildAuthBundle(morpho, await cache.getAddress(), bob);
      await expect(
        cache.connect(alice).borrow(marketParams, ethers.parseEther("10"), 0, bobsAuth)
      ).to.be.revertedWithCustomError(cache, "InvalidAuthBundle");
    });

    it("rejects a bundle whose revoke nonce doesn't immediately follow the grant's", async function () {
      const fx = await withCollateral();
      const { alice, cache, morpho, marketParams } = fx;
      const auth = await buildAuthBundle(morpho, await cache.getAddress(), alice);
      auth.revoke.nonce = auth.grant.nonce + 2n; // skips a nonce -- not a real matched pair
      await expect(
        cache.connect(alice).borrow(marketParams, ethers.parseEther("10"), 0, auth)
      ).to.be.revertedWithCustomError(cache, "InvalidAuthBundle");
    });
  });

  describe("repay", function () {
    async function withDebt() {
      const fx = await deployFixture();
      await fx.cache.connect(fx.owner).setMarketAllowed(fx.marketParams, true);
      await fx.cache.connect(fx.alice).depositCollateral(fx.marketParams, ethers.parseEther("100"));
      const auth = await buildAuthBundle(fx.morpho, await fx.cache.getAddress(), fx.alice);
      await fx.cache.connect(fx.alice).borrow(fx.marketParams, ethers.parseEther("50"), 0, auth);
      return fx;
    }

    it("repays by exact assets and refunds any unused portion of maxAssetsIn in the same transaction", async function () {
      const fx = await withDebt();
      const { alice, cache, morpho, usdgToken, marketParams } = fx;
      const marketId = await cache.id(marketParams);

      const aliceBalanceBefore = await usdgToken.balanceOf(alice.address);
      const repayAmount = ethers.parseEther("20");
      const maxAssetsIn = ethers.parseEther("25"); // deliberately over-estimated

      await expect(cache.connect(alice).repay(marketParams, repayAmount, 0, maxAssetsIn))
        .to.emit(cache, "Repaid")
        .withArgs(alice.address, marketId, repayAmount, repayAmount);

      expect(await morpho.borrowShares(marketId, alice.address)).to.equal(ethers.parseEther("30")); // 50 - 20
      // Alice only actually paid 20, not the 25 she approved/pulled.
      expect(await usdgToken.balanceOf(alice.address)).to.equal(aliceBalanceBefore - repayAmount);
      expect(await usdgToken.balanceOf(await cache.getAddress())).to.equal(0);
    });

    it("rejects a zero maxAssetsIn", async function () {
      const fx = await withDebt();
      await expect(fx.cache.connect(fx.alice).repay(fx.marketParams, ethers.parseEther("10"), 0, 0)).to.be.revertedWithCustomError(
        fx.cache,
        "ZeroAmount"
      );
    });
  });

  describe("withdrawCollateral", function () {
    async function withCollateral() {
      const fx = await deployFixture();
      await fx.cache.connect(fx.owner).setMarketAllowed(fx.marketParams, true);
      await fx.cache.connect(fx.alice).depositCollateral(fx.marketParams, ethers.parseEther("100"));
      return fx;
    }

    it("sends withdrawn collateral straight to the caller -- this contract never touches it", async function () {
      const fx = await withCollateral();
      const { alice, cache, morpho, tslaToken, marketParams } = fx;
      const marketId = await cache.id(marketParams);
      const cacheAddress = await cache.getAddress();
      const auth = await buildAuthBundle(morpho, cacheAddress, alice);

      await cache.connect(alice).withdrawCollateral(marketParams, ethers.parseEther("40"), auth);

      expect(await morpho.collateral(marketId, alice.address)).to.equal(ethers.parseEther("60"));
      expect(await tslaToken.balanceOf(alice.address)).to.equal(ethers.parseEther("940")); // 1000 - 100 + 40
      expect(await tslaToken.balanceOf(cacheAddress)).to.equal(0);
      expect(await morpho.isAuthorized(alice.address, cacheAddress)).to.equal(false);
    });

    it("rejects a zero-amount withdrawal", async function () {
      const fx = await withCollateral();
      const auth = await buildAuthBundle(fx.morpho, await fx.cache.getAddress(), fx.alice);
      await expect(
        fx.cache.connect(fx.alice).withdrawCollateral(fx.marketParams, 0, auth)
      ).to.be.revertedWithCustomError(fx.cache, "ZeroAmount");
    });

    it("rejects an AuthBundle signed by someone other than the caller", async function () {
      const fx = await withCollateral();
      const { alice, bob, cache, morpho, marketParams } = fx;
      const bobsAuth = await buildAuthBundle(morpho, await cache.getAddress(), bob);
      await expect(
        cache.connect(alice).withdrawCollateral(marketParams, ethers.parseEther("10"), bobsAuth)
      ).to.be.revertedWithCustomError(cache, "InvalidAuthBundle");
    });
  });

  describe("supply", function () {
    it("rejects a market that isn't allowlisted", async function () {
      const { bob, cache, marketParams } = await loadFixture(deployFixture);
      const marketId = await cache.id(marketParams);
      await expect(cache.connect(bob).supply(marketParams, ethers.parseEther("10"), 0))
        .to.be.revertedWithCustomError(cache, "MarketNotAllowed")
        .withArgs(marketId);
    });

    it("skims the fee, supplies on the CALLER's own Morpho position, and never leaves USDG in the contract", async function () {
      const { owner, alice, cache, morpho, usdgToken, treasury, marketParams } = await loadFixture(deployFixture);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      const marketId = await cache.id(marketParams);

      const assets = ethers.parseEther("100");
      const expectedFee = (assets * BigInt(FEE_BPS)) / 10_000n;
      const expectedNet = assets - expectedFee; // mock is 1:1 assets:shares

      await expect(cache.connect(alice).supply(marketParams, assets, 0))
        .to.emit(cache, "Supplied")
        .withArgs(alice.address, marketId, assets, expectedFee, expectedNet, expectedNet);

      // The SUPPLY position is Alice's, in Morpho's own ledger -- not this contract's.
      expect(await morpho.supplyShares(marketId, alice.address)).to.equal(expectedNet);
      expect(await morpho.supplyShares(marketId, await cache.getAddress())).to.equal(0);

      expect(await usdgToken.balanceOf(treasury.address)).to.equal(expectedFee);
      expect(await usdgToken.balanceOf(await cache.getAddress())).to.equal(0);
    });

    it("reverts if the fee would leave the caller with fewer shares than minSharesOut", async function () {
      const { owner, alice, cache, marketParams } = await loadFixture(deployFixture);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      const assets = ethers.parseEther("100");
      const expectedShares = assets - (assets * BigInt(FEE_BPS)) / 10_000n;

      await expect(cache.connect(alice).supply(marketParams, assets, expectedShares + 1n))
        .to.be.revertedWithCustomError(cache, "SlippageTooHigh")
        .withArgs(expectedShares, expectedShares + 1n);
    });

    it("rejects a zero-amount supply", async function () {
      const { owner, alice, cache, marketParams } = await loadFixture(deployFixture);
      await cache.connect(owner).setMarketAllowed(marketParams, true);
      await expect(cache.connect(alice).supply(marketParams, 0, 0)).to.be.revertedWithCustomError(cache, "ZeroAmount");
    });
  });

  describe("withdrawSupply", function () {
    async function withSupply() {
      const fx = await deployFixture();
      await fx.cache.connect(fx.owner).setMarketAllowed(fx.marketParams, true);
      await fx.cache.connect(fx.alice).supply(fx.marketParams, ethers.parseEther("100"), 0);
      return fx;
    }

    it("sends withdrawn USDG straight to the caller -- this contract never touches it", async function () {
      const fx = await withSupply();
      const { alice, cache, morpho, usdgToken, marketParams } = fx;
      const marketId = await cache.id(marketParams);
      const cacheAddress = await cache.getAddress();
      const suppliedShares = await morpho.supplyShares(marketId, alice.address); // 99.8 (post-fee)
      const aliceBalanceBefore = await usdgToken.balanceOf(alice.address);
      const auth = await buildAuthBundle(morpho, cacheAddress, alice);

      await cache.connect(alice).withdrawSupply(marketParams, 0, suppliedShares, auth);

      expect(await morpho.supplyShares(marketId, alice.address)).to.equal(0);
      expect(await usdgToken.balanceOf(alice.address)).to.equal(aliceBalanceBefore + suppliedShares);
      expect(await usdgToken.balanceOf(cacheAddress)).to.equal(0);
      expect(await morpho.isAuthorized(alice.address, cacheAddress)).to.equal(false);
    });

    it("rejects a market that isn't allowlisted", async function () {
      const { bob, cache, morpho, wrongLoanMarket } = await loadFixture(deployFixture);
      const auth = await buildAuthBundle(morpho, await cache.getAddress(), bob);
      await expect(
        cache.connect(bob).withdrawSupply(wrongLoanMarket, 0, ethers.parseEther("1"), auth)
      ).to.be.revertedWithCustomError(cache, "MarketNotAllowed");
    });

    it("rejects an AuthBundle signed by someone other than the caller", async function () {
      const fx = await withSupply();
      const { alice, bob, cache, morpho, marketParams } = fx;
      const bobsAuth = await buildAuthBundle(morpho, await cache.getAddress(), bob);
      await expect(
        cache.connect(alice).withdrawSupply(marketParams, 0, ethers.parseEther("1"), bobsAuth)
      ).to.be.revertedWithCustomError(cache, "InvalidAuthBundle");
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

    it("recovers a token stranded by a direct transfer", async function () {
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
