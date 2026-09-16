// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InternMigration
/// @notice Lets a v1 $INTERN holder burn their v1 balance and receive v2
/// $INTERN in return, at a fixed ratio set at deployment. v1 tokens sent
/// in are forwarded to the standard dead address -- they are not held by
/// this contract and cannot be recovered or reused.
///
/// Deliberately NOT snapshot-based: this contract does not pre-compute or
/// require a Merkle tree of v1 holder balances at some past block. Instead
/// it reads each caller's actual v1 balance/allowance live, at the moment
/// they call migrate(), the same "only track what actually happens"
/// philosophy as InternStakingRewards -- no off-chain indexer, no
/// snapshot block to argue about, no risk of a holder being left out of a
/// list. Anyone holding v1 at the time they call this contract can
/// migrate their own balance, for as long as the claim window is open.
///
/// The tradeoff of not snapshotting: migration is opt-in and manual. A v1
/// holder who never calls migrate() before claimDeadline simply keeps
/// their (now-orphaned) v1 balance -- it is never seized or force-
/// converted. sweepUnclaimed() only recovers the v2 $INTERN this contract
/// was funded with and never claimed, not anyone's v1 tokens.
///
/// SECURITY NOTE: this contract is funded with real v2 $INTERN and moves
/// real v1 $INTERN to the dead address on every call. It has been
/// unit-tested for the scenarios in test/, but it has NOT had a
/// professional security audit. Do not point real, valuable tokens at a
/// live deployment of this contract until it has been reviewed by someone
/// experienced in Solidity security beyond this codebase's own tests.
contract InternMigration is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice Burned v1 tokens are sent here -- the conventional
    /// unrecoverable dead address, not held by this contract.
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 private constant PRECISION = 1e18;

    /// @notice The old, migrating-away-from token.
    IERC20 public immutable v1Token;
    /// @notice The new token migrators receive.
    IERC20 public immutable v2Token;

    /// @notice v2 tokens paid out per v1 token burned, scaled by 1e18.
    /// 1e18 means 1:1. Fixed at deployment; cannot be changed afterward.
    uint256 public immutable ratio;

    /// @notice Timestamp after which migrate() stops accepting calls and
    /// sweepUnclaimed() becomes callable.
    uint256 public immutable claimDeadline;

    /// @notice Running total of v1 burned through this contract, purely
    /// informational (e.g. for a public "X migrated so far" display).
    uint256 public totalV1Migrated;

    event Migrated(address indexed holder, uint256 v1Amount, uint256 v2Amount);
    event UnclaimedSwept(address indexed to, uint256 v2Amount);

    error MigrationClosed();
    error MigrationStillOpen();
    error ZeroAmount();

    constructor(
        address _v1Token,
        address _v2Token,
        uint256 _ratio,
        uint256 _claimWindowSeconds,
        address _owner
    ) Ownable(_owner) {
        require(_v1Token != address(0), "v1 token is zero address");
        require(_v2Token != address(0), "v2 token is zero address");
        require(_ratio > 0, "ratio must be > 0");
        require(_claimWindowSeconds > 0, "claim window must be > 0");

        v1Token = IERC20(_v1Token);
        v2Token = IERC20(_v2Token);
        ratio = _ratio;
        claimDeadline = block.timestamp + _claimWindowSeconds;
    }

    /// @notice Burn `v1Amount` of the caller's v1 $INTERN and receive v2
    /// $INTERN at the fixed ratio. Requires an ERC-20 approval on v1Token
    /// for at least `v1Amount` beforehand.
    function migrate(uint256 v1Amount) external nonReentrant {
        if (block.timestamp >= claimDeadline) revert MigrationClosed();
        if (v1Amount == 0) revert ZeroAmount();

        uint256 v2Amount = previewMigrate(v1Amount);

        totalV1Migrated += v1Amount;

        v1Token.safeTransferFrom(msg.sender, DEAD_ADDRESS, v1Amount);
        v2Token.safeTransfer(msg.sender, v2Amount);

        emit Migrated(msg.sender, v1Amount, v2Amount);
    }

    /// @notice View helper: how much v2 $INTERN `v1Amount` of v1 $INTERN
    /// converts to at the fixed ratio. Does not check balances, allowance,
    /// or whether the window is still open -- call this to build a UI
    /// quote, not as a guarantee migrate() will succeed.
    function previewMigrate(uint256 v1Amount) public view returns (uint256) {
        return (v1Amount * ratio) / PRECISION;
    }

    /// @notice Owner-only recovery of whatever v2 $INTERN this contract
    /// still holds, once the claim window has closed. Cannot be called
    /// while migration is still open -- this is a post-deadline cleanup
    /// step, not an emergency-pause mechanism.
    function sweepUnclaimed(address to) external onlyOwner {
        if (block.timestamp < claimDeadline) revert MigrationStillOpen();
        require(to != address(0), "cannot sweep to zero address");

        uint256 remaining = v2Token.balanceOf(address(this));
        v2Token.safeTransfer(to, remaining);

        emit UnclaimedSwept(to, remaining);
    }
}
