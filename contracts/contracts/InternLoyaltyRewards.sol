// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IInternStakingRewards {
    function balanceOf(address account) external view returns (uint256);
}

/// @title InternLoyaltyRewards ("Perky")
/// @notice Per docs/loyalty-rewards-spec.md: a SEPARATE, ADDITIONAL BE
/// distribution on top of InternStakingRewards' own 20% cut -- funded at
/// the team's discretion from the treasury bucket, not a change to the
/// core 70/20/10 split. This contract never holds or moves $INTERN; it
/// only reads staked balances from the already-deployed
/// InternStakingRewards (a plain external view call) and streams BE
/// weighted by tier.
///
/// SECURITY NOTE, same standard as InternStakingRewards' own: unit-tested
/// in test/, NOT professionally audited, NOT deployed. Per the spec's own
/// "Suggested sequencing," this should not go anywhere near real BE until
/// AFTER InternStakingRewards itself has been through a professional
/// security review -- that hasn't happened yet, so this contract is code
/// only, waiting on that prerequisite, not a live deployment.
///
/// KNOWN, UNRESOLVED GAMING VECTOR (see docs/loyalty-rewards-spec.md,
/// "Real risks and open questions" -- this is that risk, made concrete,
/// not a new one): a wallet's tier here is only as fresh as its last
/// sync() call, which reads its CURRENT balance in InternStakingRewards.
/// Nothing stops someone from staking up to Tier 3 in the core contract,
/// calling sync() here to lock in that tier's weight, then immediately
/// withdrawing from the core contract -- they keep Tier 3's weight in
/// THIS contract's accounting until their next sync(), collecting a
/// disproportionate share of whatever's streaming with zero real staking
/// duration behind it. InternStakingRewards solved the equivalent problem
/// for its OWN distribution via continuous per-second streaming tied to a
/// live balance; this contract does not yet have an equivalent -- test/
/// InternLoyaltyRewards.test.js includes a test that DEMONSTRATES this
/// gap rather than hiding it. Do not fund real BE through this contract
/// until it's closed (e.g. a minimum tier-hold duration before a sync
/// takes effect, checked against InternStakingRewards' own per-account
/// staking timestamp -- not implemented here).
contract InternLoyaltyRewards is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IInternStakingRewards public immutable stakingRewards;
    /// @notice The token rewards are paid in -- BE, same as the core
    /// distribution. This contract never touches $INTERN itself.
    IERC20 public immutable rewardToken;

    uint256 private constant PRECISION = 1e18;
    uint256 private constant WEIGHT_PRECISION = 100; // weights expressed in hundredths, e.g. 150 = 1.5x

    uint256 public constant MAX_REWARDS_DURATION = 30 days;
    uint256 public rewardsDuration = 1 hours;
    uint256 public periodFinish;
    uint256 public rewardRate;
    uint256 public lastUpdateTime;

    /// @notice Sum of every synced account's (stakedBalance * weight).
    /// The denominator for rewardPerToken, in place of InternStakingRewards'
    /// plain totalStaked.
    uint256 public totalWeightedStaked;
    uint256 public rewardPerTokenStored;
    uint256 public unallocatedRewards;

    /// @notice Same 10k/100k/1M thresholds used everywhere else on the
    /// site (video-credits tiered pricing, Rendo's daily limits, the
    /// stake page's TierPath) -- reused here rather than the spec doc's
    /// original illustrative 2,500/5,000/10,000 example numbers, so a
    /// wallet's "tier" means one consistent thing across the whole
    /// product, not a different scale per feature.
    function tierWeight(uint256 stakedAmount) public pure returns (uint256) {
        if (stakedAmount >= 1_000_000e18) return 200; // 2x
        if (stakedAmount >= 100_000e18) return 150; // 1.5x
        if (stakedAmount >= 10_000e18) return 100; // 1x
        return 0; // not eligible
    }

    /// @notice Each account's weighted balance as of its last sync() --
    /// see the contract-level NatSpec for exactly what "as of last sync"
    /// means and the gaming vector that follows from it.
    mapping(address => uint256) public weightedBalanceOf;
    mapping(address => uint256) private userRewardPerTokenPaid;
    mapping(address => uint256) private rewards;

    event Synced(address indexed account, uint256 stakedAmount, uint256 weight, uint256 weightedBalance);
    event RewardPaid(address indexed user, uint256 amount);
    event RewardAdded(address indexed from, uint256 amount);
    event RewardParked(address indexed from, uint256 amount);
    event UnallocatedRewardsSwept(uint256 amount);
    event RewardsDurationUpdated(uint256 newDuration);

    constructor(address _stakingRewards, address _rewardToken, address _owner) Ownable(_owner) {
        require(_stakingRewards != address(0), "staking rewards is zero address");
        require(_rewardToken != address(0), "reward token is zero address");
        stakingRewards = IInternStakingRewards(_stakingRewards);
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

    function lastTimeRewardApplicable() public view returns (uint256) {
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken() public view returns (uint256) {
        if (totalWeightedStaked == 0) {
            return rewardPerTokenStored;
        }
        uint256 elapsed = lastTimeRewardApplicable() - lastUpdateTime;
        return rewardPerTokenStored + (elapsed * rewardRate * PRECISION) / totalWeightedStaked;
    }

    function earned(address account) public view returns (uint256) {
        uint256 accrued = (weightedBalanceOf[account] *
            (rewardPerToken() - userRewardPerTokenPaid[account])) / PRECISION;
        return rewards[account] + accrued;
    }

    /// @notice Refresh the caller's tier snapshot from InternStakingRewards'
    /// CURRENT balance. Anyone can sync anyone -- there's no reason to
    /// restrict it to self, and letting third parties sync a stale
    /// account (e.g. before it withdraws) only ever makes the accounting
    /// more honest, never less. See the gaming-vector note above for what
    /// this does and doesn't protect against.
    function sync(address account) public updateReward(account) {
        uint256 stakedAmount = stakingRewards.balanceOf(account);
        uint256 weight = tierWeight(stakedAmount);
        uint256 newWeighted = (stakedAmount * weight) / WEIGHT_PRECISION;

        totalWeightedStaked = totalWeightedStaked - weightedBalanceOf[account] + newWeighted;
        weightedBalanceOf[account] = newWeighted;
        emit Synced(account, stakedAmount, weight, newWeighted);

        if (totalWeightedStaked == 0) {
            _pauseStreamIfActive();
        }
    }

    /// @notice Claim currently-earned BE. Syncs first so a claim always
    /// reflects the account's real, current tier rather than a
    /// potentially-stale one -- narrows the gaming window to "since your
    /// last sync or claim," it does not close it (see NatSpec above).
    function getReward() external nonReentrant {
        sync(msg.sender);
        uint256 reward = rewards[msg.sender];
        if (reward > 0) {
            rewards[msg.sender] = 0;
            rewardToken.safeTransfer(msg.sender, reward);
            emit RewardPaid(msg.sender, reward);
        }
    }

    /// @notice Called by the treasury (owner-only, discretionary --
    /// see the spec's "Funding cadence") after approving this contract to
    /// spend `amount` of BE.
    function notifyRewardAmount(uint256 amount) external onlyOwner updateReward(address(0)) {
        require(amount > 0, "cannot notify 0");
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);

        if (totalWeightedStaked == 0) {
            unallocatedRewards += amount;
            emit RewardParked(msg.sender, amount);
            return;
        }

        _startOrExtendStream(amount);
        emit RewardAdded(msg.sender, amount);
    }

    function sweepUnallocated() external updateReward(address(0)) {
        require(totalWeightedStaked > 0, "no synced accounts to receive it");
        uint256 amount = unallocatedRewards;
        require(amount > 0, "nothing unallocated");
        unallocatedRewards = 0;
        _startOrExtendStream(amount);
        emit UnallocatedRewardsSwept(amount);
    }

    function _pauseStreamIfActive() private {
        if (block.timestamp >= periodFinish) return;
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

        require(rewardRate > 0, "reward rate rounds to zero");

        uint256 balance = rewardToken.balanceOf(address(this));
        require(rewardRate <= balance / rewardsDuration, "reward rate exceeds balance");

        lastUpdateTime = block.timestamp;
        periodFinish = block.timestamp + rewardsDuration;
    }

    function setRewardsDuration(uint256 _rewardsDuration) external onlyOwner {
        require(block.timestamp > periodFinish, "reward period still active");
        require(_rewardsDuration > 0, "duration must be positive");
        require(_rewardsDuration <= MAX_REWARDS_DURATION, "duration too long");
        rewardsDuration = _rewardsDuration;
        emit RewardsDurationUpdated(_rewardsDuration);
    }
}
