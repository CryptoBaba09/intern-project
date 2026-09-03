const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_HOUR = 3600;

describe("InternStakingRewards", function () {
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

    for (const user of [alice, bob, stranger]) {
      await internToken.mint(user.address, ethers.parseEther("10000"));
      await internToken
        .connect(user)
        .approve(await staking.getAddress(), ethers.MaxUint256);
    }
    await beToken.mint(owner.address, ethers.parseEther("1000000"));
    await beToken
      .connect(owner)
      .approve(await staking.getAddress(), ethers.MaxUint256);

    return { owner, alice, bob, stranger, internToken, beToken, staking };
  }

  describe("deployment", function () {
    it("sets staking and reward tokens, and a default rewards duration", async function () {
      const { staking, internToken, beToken } = await loadFixture(deployFixture);
      expect(await staking.stakingToken()).to.equal(await internToken.getAddress());
      expect(await staking.rewardToken()).to.equal(await beToken.getAddress());
      expect(await staking.rewardsDuration()).to.equal(ONE_HOUR);
    });

    it("rejects a zero-address staking or reward token", async function () {
      const { owner, internToken } = await loadFixture(deployFixture);
      const StakingRewards = await ethers.getContractFactory("InternStakingRewards");
      await expect(
        StakingRewards.deploy(ethers.ZeroAddress, await internToken.getAddress(), owner.address)
      ).to.be.revertedWith("staking token is zero address");
      await expect(
        StakingRewards.deploy(await internToken.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("reward token is zero address");
    });

    it("rejects identical staking and reward tokens", async function () {
      const { owner, internToken } = await loadFixture(deployFixture);
      const StakingRewards = await ethers.getContractFactory("InternStakingRewards");
      await expect(
        StakingRewards.deploy(
          await internToken.getAddress(),
          await internToken.getAddress(),
          owner.address
        )
      ).to.be.revertedWith("staking and reward token must differ");
    });
  });

  describe("staking and withdrawing", function () {
    it("lets a user stake and tracks totalStaked", async function () {
      const { alice, staking, internToken } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("100"));

      expect(await staking.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("100"));
      expect(await internToken.balanceOf(await staking.getAddress())).to.equal(
        ethers.parseEther("100")
      );
    });

    it("rejects staking 0", async function () {
      const { alice, staking } = await loadFixture(deployFixture);
      await expect(staking.connect(alice).stake(0)).to.be.revertedWith("cannot stake 0");
    });

    it("lets a user withdraw staked tokens back", async function () {
      const { alice, staking, internToken } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("100"));
      await staking.connect(alice).withdraw(ethers.parseEther("40"));

      expect(await staking.balanceOf(alice.address)).to.equal(ethers.parseEther("60"));
      expect(await staking.totalStaked()).to.equal(ethers.parseEther("60"));
      expect(await internToken.balanceOf(alice.address)).to.equal(ethers.parseEther("9940"));
    });

    it("rejects withdrawing more than staked, or 0", async function () {
      const { alice, staking } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("10"));
      await expect(
        staking.connect(alice).withdraw(ethers.parseEther("11"))
      ).to.be.revertedWith("insufficient staked balance");
      await expect(staking.connect(alice).withdraw(0)).to.be.revertedWith("cannot withdraw 0");
    });
  });

  describe("reward streaming", function () {
    it("streams the full notified amount to a single staker over rewardsDuration", async function () {
      const { owner, alice, staking } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("1"));

      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));

      // Halfway through the hour, roughly half should have accrued.
      await time.increase(ONE_HOUR / 2);
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("1800"),
        ethers.parseEther("1")
      );

      // Past the full duration, the whole deposit should be earned.
      await time.increase(ONE_HOUR / 2 + 10);
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("3600"),
        ethers.parseEther("1")
      );
    });

    it("splits a stream pro-rata between multiple stakers by time-weighted balance", async function () {
      const { owner, alice, bob, staking } = await loadFixture(deployFixture);
      // Alice stakes 3x what Bob stakes, for the whole period -> 3x the reward.
      await staking.connect(alice).stake(ethers.parseEther("300"));
      await staking.connect(bob).stake(ethers.parseEther("100"));

      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("400"));
      await time.increase(ONE_HOUR + 10);

      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("300"),
        ethers.parseEther("0.5")
      );
      expect(await staking.earned(bob.address)).to.be.closeTo(
        ethers.parseEther("100"),
        ethers.parseEther("0.5")
      );
    });

    it("does not pay a staker for time before they staked", async function () {
      const { owner, alice, bob, staking } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("100"));
      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));

      // Bob joins halfway through the stream.
      await time.increase(ONE_HOUR / 2);
      await staking.connect(bob).stake(ethers.parseEther("100"));

      await time.increase(ONE_HOUR / 2 + 10);

      // Alice earned the first half solo (~1800) plus half of the second
      // half split 50/50 with Bob (~900) = ~2700. Bob only earns the
      // second-half share (~900).
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("2700"),
        ethers.parseEther("2")
      );
      expect(await staking.earned(bob.address)).to.be.closeTo(
        ethers.parseEther("900"),
        ethers.parseEther("2")
      );
    });

    it("blends a new deposit into an already-active stream", async function () {
      const { owner, alice, staking } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("1"));

      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));
      await time.increase(ONE_HOUR / 2); // half of the first deposit streamed (~1800)

      // A second deposit mid-stream blends its own amount with the
      // leftover from the first, restarting a fresh full-duration stream.
      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));
      await time.increase(ONE_HOUR + 10);

      // Total in: 7200. First half already streamed ~1800 before the
      // second deposit; the remaining ~1800 leftover + 3600 new = ~5400
      // streams over the new hour. Sole staker throughout, so eventually
      // earns everything deposited: ~7200.
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("7200"),
        ethers.parseEther("3")
      );
    });

    it("restricts notifyRewardAmount to the owner", async function () {
      const { alice, staking } = await loadFixture(deployFixture);
      await expect(
        staking.connect(alice).notifyRewardAmount(ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });

    it("rejects notifying a 0 reward", async function () {
      const { owner, staking } = await loadFixture(deployFixture);
      await expect(staking.connect(owner).notifyRewardAmount(0)).to.be.revertedWith(
        "cannot notify 0"
      );
    });

    it("parks rewards notified while nobody is staked, then streams them once swept", async function () {
      const { owner, alice, staking } = await loadFixture(deployFixture);

      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));
      expect(await staking.unallocatedRewards()).to.equal(ethers.parseEther("3600"));
      expect(await staking.periodFinish()).to.equal(0); // no stream started

      await staking.connect(alice).stake(ethers.parseEther("100"));
      expect(await staking.earned(alice.address)).to.equal(0); // not swept yet

      await staking.sweepUnallocated(); // callable by anyone
      expect(await staking.unallocatedRewards()).to.equal(0);

      await time.increase(ONE_HOUR + 10);
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("3600"),
        ethers.parseEther("1")
      );
    });

    it("rejects sweeping when there is nothing unallocated or nobody staked", async function () {
      const { alice, staking } = await loadFixture(deployFixture);
      await expect(staking.sweepUnallocated()).to.be.revertedWith("no stakers to receive it");

      await staking.connect(alice).stake(ethers.parseEther("10"));
      await expect(staking.sweepUnallocated()).to.be.revertedWith("nothing unallocated");
    });
  });

  describe("JIT reward-sniping resistance", function () {
    it("gives a snipe-and-exit staker only a sliver of the stream, not a pro-rata lump sum", async function () {
      const { owner, alice, stranger, staking } = await loadFixture(deployFixture);
      // Alice is a genuine long-term staker, already in before the deposit.
      await staking.connect(alice).stake(ethers.parseEther("100"));
      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));

      // Attacker stakes a much larger amount right after the deposit lands...
      await staking.connect(stranger).stake(ethers.parseEther("10000"));
      // ...and exits almost immediately (one block later).
      await time.increase(1);
      const snipedBefore = await staking.earned(stranger.address);
      await staking.connect(stranger).exit();

      // Under the OLD instant-lump-sum design, staking 100x alice's
      // position would have captured ~99% of the entire 3600 reward in a
      // single block. Under streaming, one second of a 3600-second stream
      // caps the attacker's take at roughly reward/duration, regardless
      // of stake size dominance.
      expect(snipedBefore).to.be.lt(ethers.parseEther("5"));

      // The long-term staker still earns almost the entire deposit once
      // the stream completes, essentially undiluted by the snipe attempt.
      await time.increase(ONE_HOUR);
      expect(await staking.earned(alice.address)).to.be.closeTo(
        ethers.parseEther("3600"),
        ethers.parseEther("5")
      );
    });
  });

  describe("setRewardsDuration", function () {
    it("lets the owner change it before any stream starts", async function () {
      const { owner, staking } = await loadFixture(deployFixture);
      await staking.connect(owner).setRewardsDuration(7200);
      expect(await staking.rewardsDuration()).to.equal(7200);
    });

    it("rejects changing it while a stream is active", async function () {
      const { owner, alice, staking } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("1"));
      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("100"));

      await expect(
        staking.connect(owner).setRewardsDuration(7200)
      ).to.be.revertedWith("reward period still active");
    });

    it("restricts it to the owner", async function () {
      const { alice, staking } = await loadFixture(deployFixture);
      await expect(
        staking.connect(alice).setRewardsDuration(7200)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });

  describe("exit", function () {
    it("withdraws the full stake and claims all earned BE in one call", async function () {
      const { owner, alice, staking, internToken, beToken } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("100"));
      await staking.connect(owner).notifyRewardAmount(ethers.parseEther("3600"));
      await time.increase(ONE_HOUR + 10);

      await staking.connect(alice).exit();

      expect(await staking.balanceOf(alice.address)).to.equal(0);
      expect(await internToken.balanceOf(alice.address)).to.equal(ethers.parseEther("10000"));
      expect(await beToken.balanceOf(alice.address)).to.be.closeTo(
        ethers.parseEther("3600"),
        ethers.parseEther("1")
      );
    });
  });

  describe("getReward with nothing earned", function () {
    it("does not revert and transfers nothing", async function () {
      const { alice, staking, beToken } = await loadFixture(deployFixture);
      await staking.connect(alice).stake(ethers.parseEther("10"));
      await expect(staking.connect(alice).getReward()).to.not.be.reverted;
      expect(await beToken.balanceOf(alice.address)).to.equal(0);
    });
  });
});
