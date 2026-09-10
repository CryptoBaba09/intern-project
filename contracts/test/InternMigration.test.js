const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
const THIRTY_DAYS = 30 * 24 * 60 * 60;
const ONE_TO_ONE = ethers.parseEther("1"); // ratio scaled by 1e18

describe("InternMigration", function () {
  async function deployFixture() {
    const [owner, alice, bob, stranger] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const v1Token = await MockERC20.deploy("Mock INTERN v1", "mINTERNv1");
    const v2Token = await MockERC20.deploy("Mock INTERN v2", "mINTERNv2");

    const Migration = await ethers.getContractFactory("InternMigration");
    const migration = await Migration.deploy(
      await v1Token.getAddress(),
      await v2Token.getAddress(),
      ONE_TO_ONE,
      THIRTY_DAYS,
      owner.address
    );

    for (const user of [alice, bob, stranger]) {
      await v1Token.mint(user.address, ethers.parseEther("1000"));
      await v1Token.connect(user).approve(await migration.getAddress(), ethers.MaxUint256);
    }
    // Fund the migration pool -- enough for alice and bob, not everyone.
    await v2Token.mint(await migration.getAddress(), ethers.parseEther("1500"));

    return { owner, alice, bob, stranger, v1Token, v2Token, migration };
  }

  describe("deployment", function () {
    it("sets both tokens, ratio, and a future claim deadline", async function () {
      const { migration, v1Token, v2Token } = await loadFixture(deployFixture);
      expect(await migration.v1Token()).to.equal(await v1Token.getAddress());
      expect(await migration.v2Token()).to.equal(await v2Token.getAddress());
      expect(await migration.ratio()).to.equal(ONE_TO_ONE);
      expect(await migration.claimDeadline()).to.be.greaterThan(await time.latest());
    });

    it("rejects a zero-address v1 or v2 token", async function () {
      const { owner, v1Token } = await loadFixture(deployFixture);
      const Migration = await ethers.getContractFactory("InternMigration");
      await expect(
        Migration.deploy(ethers.ZeroAddress, await v1Token.getAddress(), ONE_TO_ONE, THIRTY_DAYS, owner.address)
      ).to.be.revertedWith("v1 token is zero address");
      await expect(
        Migration.deploy(await v1Token.getAddress(), ethers.ZeroAddress, ONE_TO_ONE, THIRTY_DAYS, owner.address)
      ).to.be.revertedWith("v2 token is zero address");
    });

    it("rejects identical v1 and v2 tokens", async function () {
      const { owner, v1Token } = await loadFixture(deployFixture);
      const Migration = await ethers.getContractFactory("InternMigration");
      await expect(
        Migration.deploy(
          await v1Token.getAddress(),
          await v1Token.getAddress(),
          ONE_TO_ONE,
          THIRTY_DAYS,
          owner.address
        )
      ).to.be.revertedWith("v1 and v2 token must differ");
    });

    it("rejects a zero ratio or zero-length claim window", async function () {
      const { owner, v1Token, v2Token } = await loadFixture(deployFixture);
      const Migration = await ethers.getContractFactory("InternMigration");
      await expect(
        Migration.deploy(await v1Token.getAddress(), await v2Token.getAddress(), 0, THIRTY_DAYS, owner.address)
      ).to.be.revertedWith("ratio must be positive");
      await expect(
        Migration.deploy(await v1Token.getAddress(), await v2Token.getAddress(), ONE_TO_ONE, 0, owner.address)
      ).to.be.revertedWith("claim window must be positive");
    });
  });

  describe("migrating", function () {
    it("burns v1 and pays out v2 1:1 by default", async function () {
      const { alice, migration, v1Token, v2Token } = await loadFixture(deployFixture);
      await migration.connect(alice).migrate(ethers.parseEther("100"));

      expect(await v1Token.balanceOf(DEAD_ADDRESS)).to.equal(ethers.parseEther("100"));
      expect(await v1Token.balanceOf(alice.address)).to.equal(ethers.parseEther("900"));
      expect(await v2Token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
      expect(await migration.migrated(alice.address)).to.equal(ethers.parseEther("100"));
      expect(await migration.totalMigrated()).to.equal(ethers.parseEther("100"));
    });

    it("emits Migrated with both amounts", async function () {
      const { alice, migration } = await loadFixture(deployFixture);
      await expect(migration.connect(alice).migrate(ethers.parseEther("50")))
        .to.emit(migration, "Migrated")
        .withArgs(alice.address, ethers.parseEther("50"), ethers.parseEther("50"));
    });

    it("accumulates across multiple migrations from the same user", async function () {
      const { alice, migration } = await loadFixture(deployFixture);
      await migration.connect(alice).migrate(ethers.parseEther("30"));
      await migration.connect(alice).migrate(ethers.parseEther("20"));
      expect(await migration.migrated(alice.address)).to.equal(ethers.parseEther("50"));
    });

    it("rejects migrating 0", async function () {
      const { alice, migration } = await loadFixture(deployFixture);
      await expect(migration.connect(alice).migrate(0)).to.be.revertedWith("cannot migrate 0");
    });

    it("rejects migrating without prior v1 approval", async function () {
      const { stranger, migration, v1Token } = await loadFixture(deployFixture);
      await v1Token.connect(stranger).approve(await migration.getAddress(), 0);
      await expect(migration.connect(stranger).migrate(ethers.parseEther("10"))).to.be.reverted;
    });

    it("rejects migrating more v1 than the pool can pay out in v2", async function () {
      const { alice, migration, v1Token } = await loadFixture(deployFixture);
      // Pool was funded with 1500 v2; ask for more v1 than that at 1:1.
      await v1Token.mint(alice.address, ethers.parseEther("2000"));
      await expect(
        migration.connect(alice).migrate(ethers.parseEther("1600"))
      ).to.be.revertedWith("migration pool underfunded -- contact the team");
    });

    it("rejects migrating after the claim window closes", async function () {
      const { alice, migration } = await loadFixture(deployFixture);
      await time.increase(THIRTY_DAYS + 1);
      await expect(
        migration.connect(alice).migrate(ethers.parseEther("10"))
      ).to.be.revertedWith("migration window closed");
    });
  });

  describe("non-1:1 ratio", function () {
    it("applies a configured ratio, e.g. 2 v2 per 1 v1", async function () {
      const { owner, alice, v1Token, v2Token } = await loadFixture(deployFixture);
      const Migration = await ethers.getContractFactory("InternMigration");
      const doubleRatio = ethers.parseEther("2");
      const migration = await Migration.deploy(
        await v1Token.getAddress(),
        await v2Token.getAddress(),
        doubleRatio,
        THIRTY_DAYS,
        owner.address
      );
      await v2Token.mint(await migration.getAddress(), ethers.parseEther("1000"));
      await v1Token.connect(alice).approve(await migration.getAddress(), ethers.MaxUint256);

      expect(await migration.previewMigrate(ethers.parseEther("10"))).to.equal(ethers.parseEther("20"));
      await migration.connect(alice).migrate(ethers.parseEther("10"));
      expect(await v2Token.balanceOf(alice.address)).to.equal(ethers.parseEther("20"));
    });
  });

  describe("sweepUnclaimed", function () {
    it("rejects sweeping while the window is still open", async function () {
      const { owner, migration } = await loadFixture(deployFixture);
      await expect(migration.connect(owner).sweepUnclaimed(owner.address)).to.be.revertedWith(
        "migration window still open"
      );
    });

    it("rejects a non-owner sweeping, even after the window closes", async function () {
      const { alice, migration } = await loadFixture(deployFixture);
      await time.increase(THIRTY_DAYS + 1);
      await expect(migration.connect(alice).sweepUnclaimed(alice.address)).to.be.reverted;
    });

    it("lets the owner recover unclaimed v2 after the window closes", async function () {
      const { owner, alice, migration, v2Token } = await loadFixture(deployFixture);
      await migration.connect(alice).migrate(ethers.parseEther("100")); // 1500 - 100 = 1400 left
      await time.increase(THIRTY_DAYS + 1);

      await expect(migration.connect(owner).sweepUnclaimed(owner.address))
        .to.emit(migration, "UnclaimedSwept")
        .withArgs(owner.address, ethers.parseEther("1400"));
      expect(await v2Token.balanceOf(owner.address)).to.equal(ethers.parseEther("1400"));
      expect(await v2Token.balanceOf(await migration.getAddress())).to.equal(0);
    });

    it("rejects sweeping with nothing left, or to the zero address", async function () {
      const { owner, migration } = await loadFixture(deployFixture);
      await time.increase(THIRTY_DAYS + 1);
      await expect(migration.connect(owner).sweepUnclaimed(ethers.ZeroAddress)).to.be.revertedWith(
        "cannot sweep to zero address"
      );
      await migration.connect(owner).sweepUnclaimed(owner.address);
      await expect(migration.connect(owner).sweepUnclaimed(owner.address)).to.be.revertedWith(
        "nothing to sweep"
      );
    });
  });
});
