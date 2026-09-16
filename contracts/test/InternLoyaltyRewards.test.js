const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_HOUR = 3600;
const TEN_K = ethers.parseEther("10000");
const HUNDRED_K = ethers.parseEther("100000");
const ONE_M = ethers.parseEther("1000000");

describe("InternLoyaltyRewards", function () {
  async function deployFixture() {
    const [owner, alice, bob, stranger] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const internToken = await MockERC20.deploy("Mock INTERN", "mINTERN");
    const beToken = await MockERC20.deploy("Mock BE", "mBE");

    const StakingRewards = await ethers.getContractFactory("InternStakingRewards");
    const staking = await StakingRewards.deploy(
      await internToken.getAddress(),
      await beToken.getAddress(),
      owner.address
    );

    const LoyaltyRewards = await ethers.getContractFactory("InternLoyaltyRewards");
    const loyalty = await LoyaltyRewards.deploy(
      await staking.getAddress(),
      await beToken.getAddress(),
      owner.address
    );

    for (const user of [alice, bob, stranger]) {
      await internToken.mint(user.address, ethers.parseEther("10000000"));
      await internToken.connect(user).approve(await staking.getAddress(), ethers.MaxUint256);
    }
    await beToken.mint(owner.address, ethers.parseEther("1000000"));
    await beToken.connect(owner).approve(await loyalty.getAddress(), ethers.MaxUint256);

    return { owner, alice, bob, stranger, internToken, beToken, staking, loyalty };
  }

  describe("deployment", function () {
    it("rejects zero-address staking-rewards or reward token", async function () {
      const { owner, staking, beToken } = await loadFixture(deployFixture);
      const LoyaltyRewards = await ethers.getContractFactory("InternLoyaltyRewards");
      await expect(
        LoyaltyRewards.deploy(ethers.ZeroAddress, await beToken.getAddress(), owner.address)
      ).to.be.revertedWith("staking rewards is zero address");
      await expect(
        LoyaltyRewards.deploy(await staking.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("reward token is zero address");
    });
  });

  describe("tierWeight", function () {
    it("matches the site-wide 10k/100k/1M thresholds", async function () {
      const { loyalty } = await loadFixture(deployFixture);
      expect(await loyalty.tierWeight(ethers.parseEther("9999"))).to.equal(0);
      expect(await loyalty.tierWeight(TEN_K)).to.equal(100);
      expect(await loyalty.tierWeight(ethers.parseEther("99999"))).to.equal(100);
      expect(await loyalty.tierWeight(HUNDRED_K)).to.equal(150);
      expect(await loyalty.tierWeight(ethers.parseEther("999999"))).to.equal(150);
      expect(await loyalty.tierWeight(ONE_M)).to.equal(200);
    });
  });

  describe("sync", function () {
    it("reads the real staked balance from InternStakingRewards and weights it", async function () {
      const { alice, staking, loyalty } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(HUNDRED_K);
      await loyalty.sync(alice.address);
      // 100k staked * 1.5x weight = 150k weighted
      expect(await loyalty.weightedBalanceOf(alice.address)).to.equal(
        (HUNDRED_K * 150n) / 100n
      );
      expect(await loyalty.totalWeightedStaked()).to.equal((HUNDRED_K * 150n) / 100n);
    });

    it("is callable by anyone on anyone's behalf", async function () {
      const { alice, stranger, staking, loyalty } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(TEN_K);
      await loyalty.connect(stranger).sync(alice.address);
      expect(await loyalty.weightedBalanceOf(alice.address)).to.equal(TEN_K);
    });

    it("zeroes out weight for a balance under the eligibility floor", async function () {
      const { alice, staking, loyalty } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("500"));
      await loyalty.sync(alice.address);
      expect(await loyalty.weightedBalanceOf(alice.address)).to.equal(0);
    });
  });

  describe("reward distribution", function () {
    it("splits a stream proportional to WEIGHT, not raw stake", async function () {
      const { alice, bob, staking, loyalty, beToken } = await loadFixture(deployFixture);
      // Alice: 100k staked -> 1.5x weight -> 150k weighted
      // Bob: 100k staked, but syncs while only 10k is staked -> 1x weight -> 10k weighted
      // Total weighted = 160k. If raw stake decided this, they'd split
      // evenly (each staked 100k) -- weight-based, Alice gets 150/160.
      await staking.connect(alice).stake(HUNDRED_K);
      await staking.connect(bob).stake(TEN_K);
      await loyalty.sync(alice.address);
      await loyalty.sync(bob.address);

      await loyalty.notifyRewardAmount(ethers.parseEther("1600"));
      await time.increase(ONE_HOUR);

      const aliceEarned = await loyalty.earned(alice.address);
      const bobEarned = await loyalty.earned(bob.address);
      // Alice: 150k/160k * 1600 = 1500; Bob: 10k/160k * 1600 = 100
      expect(aliceEarned).to.be.closeTo(ethers.parseEther("1500"), ethers.parseEther("1"));
      expect(bobEarned).to.be.closeTo(ethers.parseEther("100"), ethers.parseEther("1"));

      await loyalty.connect(alice).getReward();
      expect(await beToken.balanceOf(alice.address)).to.be.closeTo(
        ethers.parseEther("1500"),
        ethers.parseEther("1")
      );
    });

    it("parks a deposit when nobody is synced yet, sweepable once someone is", async function () {
      const { alice, staking, loyalty, beToken } = await loadFixture(deployFixture);
      await loyalty.notifyRewardAmount(ethers.parseEther("100"));
      expect(await loyalty.unallocatedRewards()).to.equal(ethers.parseEther("100"));

      await staking.connect(alice).stake(TEN_K);
      await loyalty.sync(alice.address);
      await loyalty.sweepUnallocated();
      await time.increase(ONE_HOUR);
      expect(await loyalty.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("100"),
        ethers.parseEther("1")
      );
    });
  });

  // See InternLoyaltyRewards.sol's contract-level NatSpec: this is the
  // gaming vector docs/loyalty-rewards-spec.md explicitly flags as an
  // open, unresolved risk. This test PASSES today because the gap is
  // real -- it exists to prove the disclosure is accurate, not to
  // celebrate the behavior. If a future change closes this vector
  // (e.g. a minimum tier-hold duration), this assertion needs to be
  // rewritten to prove the FIX, not deleted.
  describe("KNOWN GAP: stale tier snapshot after unstaking (see NatSpec)", function () {
    it("keeps paying a wallet's locked-in tier weight after it fully unstakes, until its next sync", async function () {
      const { alice, bob, staking, loyalty } = await loadFixture(deployFixture);

      // Alice stakes to Tier 3 (2x), locks it in with a sync...
      await staking.connect(alice).stake(ONE_M);
      await loyalty.sync(alice.address);
      expect(await loyalty.weightedBalanceOf(alice.address)).to.equal(ONE_M * 2n);

      // ...then withdraws EVERYTHING from the real staking contract.
      await staking.connect(alice).withdraw(ONE_M);
      expect(await staking.balanceOf(alice.address)).to.equal(0);

      // Bob stakes a modest, real amount and syncs honestly.
      await staking.connect(bob).stake(TEN_K);
      await loyalty.sync(bob.address);

      // A reward stream starts now, with Alice holding ZERO real stake.
      await loyalty.notifyRewardAmount(ethers.parseEther("100"));
      await time.increase(ONE_HOUR);

      // Alice still earns her stale Tier-3 share despite having
      // unstaked entirely -- the gap, demonstrated, not hidden.
      const aliceEarned = await loyalty.earned(alice.address);
      const bobEarned = await loyalty.earned(bob.address);
      expect(aliceEarned).to.be.gt(0);
      expect(aliceEarned).to.be.gt(bobEarned); // her stale 2M weighted still dwarfs Bob's real 10k

      // A fresh sync immediately corrects it going forward (proving the
      // fix IS "call sync more" for past-this-point accrual, just not
      // for what already streamed while stale).
      await loyalty.sync(alice.address);
      expect(await loyalty.weightedBalanceOf(alice.address)).to.equal(0);
    });
  });
});
