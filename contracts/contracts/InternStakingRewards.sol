// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InternStakingRewards
/// @notice Holders stake $INTERN here to receive a pro-rata share of BE
/// deposited by the burn bot (the 20% "distribution" cut of every claimed
/// creator fee). Staking is non-custodial and reversible at any time —
/// this contract never has a reason to hold a staker's $INTERN against
/// their will.
///
/// This sidesteps the classic "how do you know every token holder's
/// balance" problem: instead of snapshotting wallet balances (which needs
/// an off-chain indexer or periodic Merkle-tree airdrops), only stakers
/// are tracked, and the contract itself is the source of truth for that —
/// no external indexer, no off-chain holder list.
///
/// Rewards STREAM linearly over `rewardsDuration` after each deposit
/// (the same accounting shape as Synthetix's widely-used StakingRewards),
/// rather than being credited as an instant lump sum. This is deliberate:
/// an earlier version of this contract credited the full deposit
/// instantly, weighted only by whoever happened to be staked at that
/// exact moment — which let anyone stake right before a deposit and exit
/// right after, capturing a share of the reward with zero real staking
/// duration, diluting genuine long-term stakers. Streaming means
/// capturing a meaningful share requires actually holding the stake over
/// time, not just being present for one transaction.
///
/// SECURITY NOTE: this contract pools real staked tokens and real reward
/// tokens. It has been unit-tested for the scenarios in test/, but it has
/// NOT had a professional security audit. Do not point real, valuable
/// tokens at a live deployment of this contract until it has been
/// reviewed by someone experienced in Solidity security beyond this
/// codebase's own tests.
contract InternStakingRewards is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The token stakers lock up — $INTERN.
    IERC20 public immutable stakingToken;
    /// @notice The token rewards are paid in — BE.
    IERC20 public immutable rewardToken;

    uint256 private constant PRECISION = 1e18;

    /// @notice Upper bound on rewardsDuration, purely as a guardrail
    /// against operator error (e.g. a unit mix-up setting it absurdly
    /// large): past a certain length relative to typical deposit sizes,
    /// integer division would floor rewardRate to 0 and silently strand
    /// that deposit forever. See setRewardsDuration and _startOrExtendStream.
    uint256 public constant MAX_REWARDS_DURATION = 30 days;

    /// @notice How long a deposited reward streams over. Only changeable
    /// while no reward period is currently active (see setRewardsDuration).
    uint256 public rewardsDuration = 1 hours;
    /// @notice Timestamp the current reward stream finishes.
    uint256 public periodFinish;
    /// @notice BE emitted per second while a stream is active.
    uint256 public rewardRate;
    /// @notice Last time the global accumulator was brought up to date.
    uint256 public lastUpdateTime;

    uint256 public totalStaked;
    uint256 public rewardPerTokenStored;
    /// @notice BE that currently has nobody to stream to: either deposited
    /// via notifyRewardAmount while totalStaked was already 0, or left
    /// over from an active stream when the last staker withdrew mid-flight
    /// (see _pauseStreamIfActive). Held here rather than an un-claimable
    /// stream continuing to tick down unseen; see sweepUnallocated().
    uint256 public unallocatedRewards;

    mapping(address => uint256) public balanceOf;
    mapping(address => uint256) private userRewardPerTokenPaid;
    mapping(address => uint256) private rewards;

    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardAdded(address indexed from, uint256 amount);
    event RewardParked(address indexed from, uint256 amount);
    event UnallocatedRewardsSwept(uint256 amount);
    event RewardsDurationUpdated(uint256 newDuration);

    constructor(address _stakingToken, address _rewardToken, address _owner)
        Ownable(_owner)
    {
        require(_stakingToken != address(0), "staking token is zero address");
        require(_rewardToken != address(0), "reward token is zero address");
        require(_stakingToken != _rewardToken, "staking and reward token must differ");
        stakingToken = IERC20(_stakingToken);
        rewardToken = IERC20(_rewardToken);
    }

    modifier updateReward(address account) {
        rewardPerTokenStored = rewardPerToken();
        lastUpdateTime = lastTimeRewardApplicable();
        if (account != address(0)) {
            rewards[account] = earned(account);
            userRewardPerTokenPaid[account] = rewardPerTokenStored;
        }
        _;
    }

    /// @notice The lesser of "now" and the end of the current stream —
    /// once a stream finishes, the accumulator stops advancing until the
    /// next notifyRewardAmount starts a new one.
    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    /// @notice Cumulative BE earned per staked $INTERN, scaled by PRECISION.
    function rewardPerToken() public view returns (uint256) {
        if (totalStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 elapsed = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (elapsed * rewardRate * PRECISION) / totalStaked;
    }

    /// @notice Total BE a staker is currently entitled to withdraw.
    function earned(address account) public view returns (uint256) {
        uint256 accrued = (balanceOf[account] *
            (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION;
        return rewards[account] + accrued;
    }

    /// @notice Lock `amount` of $INTERN to start (or add to) earning BE.
    function stake(uint256 amount) external nonReentrant updateReward(msg.sender) {
        require(amount > 0, "cannot stake 0");
        totalStaked += amount;
        balanceOf[msg.sender] += amount;
        stakingToken.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    /// @notice Unlock `amount` of previously staked $INTERN. Always
    /// available — this is not a lockup.
    function withdraw(uint256 amount) public nonReentrant updateReward(msg.sender) {
        require(amount > 0, "cannot withdraw 0");
        require(balanceOf[msg.sender] >= amount, "insufficient staked balance");
        totalStaked -= amount;
        balanceOf[msg.sender] -= amount;
        stakingToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
        if (totalStaked == 0) {
            _pauseStreamIfActive();
        }
    }

    /// @notice Claim all currently-earned BE without unstaking.
    function getReward() public nonReentrant updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Withdraw everything staked and claim all earned BE in one
    /// transaction.
    function exit() external {
        withdraw(balanceOf[msg.sender]);
        getReward();
    }

    /// @notice Called by the burn bot after approving this contract to
    /// spend `amount` of BE. Pulls the BE in and streams it to stakers
    /// linearly over `rewardsDuration`, extending/blending with any
    /// still-active stream (standard Synthetix-style rate math) rather
    /// than crediting it as an instant lump sum — see the contract-level
    /// NatSpec for why. Owner-only because this is the one privileged
    /// action, clearly scoped to the bot.
    function notifyRewardAmount(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(amount > 0, "cannot notify 0");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        if (totalStaked == 0) {
            // Nobody to stream it to yet -- park it rather than starting
            // a stream nobody can earn from. See sweepUnallocated().
            unallocatedRewards += amount;
            emit RewardParked(msg.sender, amount);
            return;
        }

        _startOrExtendStream(amount);
        emit RewardAdded(msg.sender, amount);
    }

    /// @notice Folds any BE that arrived via notifyRewardAmount while
    /// totalStaked was 0 into a new (or extended) stream, once stakers
    /// exist. Callable by anyone since it only ever benefits current
    /// stakers and has no privileged effect.
    function sweepUnallocated() external updateReward(address(0)) {
        require(totalStaked > 0, "no stakers to receive it");
        uint256 amount = unallocatedRewards;
        require(amount > 0, "nothing unallocated");
        unallocatedRewards = 0;
        _startOrExtendStream(amount);
        emit UnallocatedRewardsSwept(amount);
    }

    /// @notice Called whenever totalStaked drops to 0. Without this, an
    /// active stream would keep counting down in wall-clock time with
    /// nobody earning it — updateReward's zero-totalStaked guard freezes
    /// rewardPerTokenStored, but rewardRate/periodFinish would otherwise
    /// be none the wiser, and the elapsed "dead" time (with no one staked)
    /// would silently vanish from the payable total when a future staker's
    /// checkpoint jumps lastUpdateTime forward past it. Instead, whatever
    /// of the current stream hasn't been emitted yet gets parked into
    /// unallocatedRewards -- the exact same recovery path notifyRewardAmount
    /// already uses for "nobody staked at deposit time" -- so it's picked
    /// back up in a fresh stream via sweepUnallocated() once someone stakes
    /// again, instead of being lost.
    function _pauseStreamIfActive() private {
        if (block.timestamp >= periodFinish) return; // nothing left to strand
        uint256 remaining = periodFinish - block.timestamp;
        uint256 leftover = remaining * rewardRate;
        if (leftover > 0) {
            unallocatedRewards += leftover;
        }
        rewardRate = 0;
        periodFinish = block.timestamp;
    }

    function _startOrExtendStream(uint256 amount) private {
        if (block.timestamp >= periodFinish) {
            rewardRate = amount / rewardsDuration;
        } else {
            uint256 remaining = periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardRate;
            rewardRate = (amount + leftover) / rewardsDuration;
        }

        // A too-large rewardsDuration relative to `amount` would floor
        // this to 0 via integer division, silently stranding the whole
        // deposit in a stream that pays nobody. Fail loudly instead.
        require(rewardRate > 0, "reward rate rounds to zero");

        // Guard against a rate so high (from rounding, or a bug upstream)
        // that the contract couldn't actually pay it out in full.
        uint256 balance = rewardToken.balanceOf(address(this));
        require(rewardRate <= balance / rewardsDuration, "reward rate exceeds balance");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
    }

    /// @notice Owner can retune how long future deposits stream over, but
    /// only between streams — never mid-flight, which would let the owner
    /// warp an already-promised distribution's timing after the fact.
    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(block.timestamp > periodFinish, "reward period still active");
        require(_rewardsDuration > 0, "duration must be positive");
        require(_rewardsDuration <= MAX_REWARDS_DURATION, "duration too long");
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsDuration);
    }
}
