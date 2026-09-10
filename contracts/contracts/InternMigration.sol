// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title InternMigration
/// @notice One-way v1 -> v2 $INTERN migration. A holder sends their v1
/// $INTERN in; this contract permanently burns it (sends it to the dead
/// address, same convention as the rest of the project -- see
/// DEAD_ADDRESS in intern-site/src/app/lib/chain.js) and pays out v2
/// $INTERN from a pool this contract was pre-funded with.
///
/// Deliberately NOT snapshot-based. With v1 being fully deprecated
/// regardless, there's no meaningful difference between "held v1 at
/// announcement time" and "holds v1 now" -- both require having acquired
/// real, capped (1,000,000,000 fixed supply, no mint function) v1 supply.
/// A snapshot/Merkle-proof design would add real complexity (off-chain
/// snapshot tooling, proof generation, a whole extra verification path)
/// for a holder set small enough (single digits, at the time this was
/// written) that it buys nothing here.
///
/// SECURITY NOTE, same disclosure as InternStakingRewards: this contract
/// has been unit-tested for the scenarios in test/, but it has NOT had a
/// professional security audit. Do not fund it with real v2 $INTERN until
/// it has been reviewed by someone experienced in Solidity security
/// beyond this codebase's own tests.
contract InternMigration is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The old token being retired.
    IERC20 public immutable v1Token;
    /// @notice The new token being paid out.
    IERC20 public immutable v2Token;

    /// @notice Same "transfer to a burn-address wallet, not a real burn()
    /// call" convention the rest of $INTERN already uses -- v1Token likely
    /// has no burn() function either, so this is the only universal way to
    /// permanently retire it regardless of the specific ERC-20 it is.
    address public constant DEAD_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    /// @notice v2 tokens paid out per v1 token migrated, scaled by 1e18.
    /// 1e18 means 1:1. Fixed at deploy time so the exchange rate can never
    /// be changed after holders start migrating on the assumption of a
    /// specific rate.
    uint256 public immutable ratio;

    /// @notice Migration closes after this timestamp -- see sweepUnclaimed.
    uint256 public immutable claimDeadline;

    /// @notice Total v1 tokens migrated (and therefore burned) so far.
    uint256 public totalMigrated;
    /// @notice Per-address v1 amount migrated so far, for external display.
    mapping(address => uint256) public migrated;

    event Migrated(address indexed user, uint256 v1Amount, uint256 v2Amount);
    event UnclaimedSwept(address indexed to, uint256 v2Amount);

    constructor(
        address _v1Token,
        address _v2Token,
        uint256 _ratio,
        uint256 _claimWindowSeconds,
        address _owner
    ) Ownable(_owner) {
        require(_v1Token != address(0), "v1 token is zero address");
        require(_v2Token != address(0), "v2 token is zero address");
        require(_v1Token != _v2Token, "v1 and v2 token must differ");
        require(_ratio > 0, "ratio must be positive");
        require(_claimWindowSeconds > 0, "claim window must be positive");
        v1Token = IERC20(_v1Token);
        v2Token = IERC20(_v2Token);
        ratio = _ratio;
        claimDeadline = block.timestamp + _claimWindowSeconds;
    }

    /// @notice Preview the v2 output for a given v1 input, for the
    /// frontend to display before a holder commits to migrating.
    function previewMigrate(uint256 v1Amount) public view returns (uint256) {
        return (v1Amount * ratio) / 1e18;
    }

    /// @notice Migrate `v1Amount` of v1 $INTERN to v2. Requires prior
    /// approval of this contract to spend v1Amount of v1Token. Burns the
    /// v1 tokens (sends to DEAD_ADDRESS) and pays out v2 tokens from this
    /// contract's own balance in the same transaction.
    function migrate(uint256 v1Amount) external nonReentrant {
        require(v1Amount > 0, "cannot migrate 0");
        require(block.timestamp < claimDeadline, "migration window closed");

        uint256 v2Amount = previewMigrate(v1Amount);
        require(v2Amount > 0, "amount too small to migrate at this ratio");
        require(
            v2Token.balanceOf(address(this)) >= v2Amount,
            "migration pool underfunded -- contact the team"
        );

        migrated[msg.sender] += v1Amount;
        totalMigrated += v1Amount;

        v1Token.safeTransferFrom(msg.sender, DEAD_ADDRESS, v1Amount);
        v2Token.safeTransfer(msg.sender, v2Amount);

        emit Migrated(msg.sender, v1Amount, v2Amount);
    }

    /// @notice Once the claim window closes, owner can recover any v2
    /// tokens nobody migrated for. Without this, an allocation sized for
    /// holders who never claim would be stranded in this contract forever.
    function sweepUnclaimed(address to) external onlyOwner {
        require(block.timestamp >= claimDeadline, "migration window still open");
        require(to != address(0), "cannot sweep to zero address");
        uint256 balance = v2Token.balanceOf(address(this));
        require(balance > 0, "nothing to sweep");
        v2Token.safeTransfer(to, balance);
        emit UnclaimedSwept(to, balance);
    }
}
