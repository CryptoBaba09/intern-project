// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CacheVaultDeposit
/// @notice Cache, the Yield Intern -- deposit USDG straight into Morpho's
/// real Steakhouse USDG vault on Robinhood Chain (the same vault Robinhood
/// Earn itself deposits into: 0xBeEff033F34C046626B8D0A041844C5d1A5409dd,
/// confirmed live 2026-09-23 against app.morpho.org, real deposits shown
/// there -- see docs/cache-intern-spec.md for how that was verified).
///
/// Non-custodial pass-through, same shape as InternRewardsRouter's
/// convert(): this contract holds USDG for the length of one transaction
/// only. It never holds the Morpho vault shares -- deposit() calls the
/// vault with `receiver = msg.sender`, so the yield-bearing position lands
/// directly in the depositor's own wallet, same as every other ERC-4626
/// vault interaction. Withdrawal needs no code here at all: since the
/// user holds the real vault shares, they redeem straight from Morpho's
/// own contract, with zero dependency on this contract ever again.
///
/// DELIBERATELY DOES NOT SWAP THE FEE CUT ITSELF. Earlier drafts of this
/// spec considered swapping the skimmed USDG to $INTERN and burning it
/// inline, atomically, in this same transaction -- rejected: $INTERN v2
/// trades pre-graduation on Pons's bonding curve via curve.buy(), which
/// takes native ETH, not USDG (see
/// api/cron/burn-and-distribute/lib/buyAndBurn.js) -- so an inline burn
/// would need this contract to also integrate a USDG->ETH swap router,
/// meaningfully widening the audit surface (slippage handling, a second
/// external DEX dependency, MEV exposure on every single deposit) for a
/// fee cut that's a rounding error next to the deposit itself. Instead,
/// the skimmed USDG accumulates on `feeRecipient` (the same treasury
/// wallet the 70/20/10 creator-fee split already pays into) and gets
/// swapped-and-burned as part of that existing, already-live cycle --
/// same "currently done manually while automation is being rebuilt"
/// honesty this codebase already applies to the main burn engine itself
/// (see PROJECT_FACTS in intern-site/src/app/lib/telegramPersonas.js).
/// Automating that sweep is real future work, tracked, not hidden.
///
/// SECURITY NOTE: unit-tested (against a mock ERC-4626 vault -- the real
/// Steakhouse USDG vault's own internal accounting is out of scope for
/// these tests; they test THIS contract's fee/approval/receiver logic,
/// not Morpho's), but has NOT had a professional security audit. Do not
/// point real value at a live deployment until it has had the same
/// Slither + manual review pass InternRewardsRouter got at minimum, and
/// ideally an outside review given real USDG will sit here (briefly) and
/// real Morpho shares get minted through it.
contract CacheVaultDeposit is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice USDG -- the only asset this contract accepts, matching
    /// v1 scope (see docs/cache-intern-spec.md: "USDG only... other
    /// Morpho markets are a natural v2, not v1").
    IERC20 public immutable usdgToken;

    /// @notice The real, live Steakhouse USDG Morpho vault on Robinhood
    /// Chain. Immutable -- this contract is scoped to one vault, not a
    /// general-purpose Morpho router; pointing at a different vault means
    /// deploying a new instance, not reconfiguring this one.
    IERC4626 public immutable vault;

    /// @notice Where the skimmed fee cut accumulates, in USDG, to be
    /// swapped-and-burned as part of the existing treasury cycle (see
    /// contract-level NatSpec above for why this isn't done inline).
    address public feeRecipient;

    /// @notice Fee in basis points, out of 10_000. 20 = 0.2%, same rate
    /// as $interndex's swap fee, by choice for consistency -- not
    /// because the two fees are linked. Owner-adjustable, capped at 200
    /// (2%) so a compromised/misconfigured owner key can't silently
    /// skim an unreasonable cut -- see setFeeBps.
    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 200; // 2% hard ceiling
    uint256 public constant BPS_DENOMINATOR = 10_000;

    event Deposited(address indexed user, uint256 assetsIn, uint256 fee, uint256 assetsDeposited, uint256 sharesOut);
    event FeeRecipientSet(address indexed feeRecipient);
    event FeeBpsSet(uint256 feeBps);

    error ZeroAmount();
    error FeeTooHigh(uint256 requested, uint256 max);
    error SlippageTooHigh(uint256 sharesOut, uint256 minShares);

    constructor(address _usdgToken, address _vault, address _feeRecipient, uint256 _feeBps, address _owner)
        Ownable(_owner)
    {
        require(_usdgToken != address(0), "USDG token is zero address");
        require(_vault != address(0), "vault is zero address");
        require(_feeRecipient != address(0), "fee recipient is zero address");
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh(_feeBps, MAX_FEE_BPS);
        // The vault's own declared asset must actually be USDG -- catches
        // a wrong vault address at deploy time instead of failing weirdly
        // (or silently succeeding against the wrong asset) on first use.
        require(IERC4626(_vault).asset() == _usdgToken, "vault asset is not USDG");

        usdgToken = IERC20(_usdgToken);
        vault = IERC4626(_vault);
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }

    /// @notice Deposit `assets` of USDG. Skims `feeBps` to feeRecipient,
    /// deposits the rest into the Steakhouse USDG vault with the CALLER
    /// as receiver -- the caller holds the resulting vault shares
    /// directly, this contract never does. Requires an ERC-20 approval
    /// on usdgToken for at least `assets` beforehand.
    /// @param minShares Slippage floor: reverts if the vault mints fewer
    /// shares than this. Same shape as InternRewardsRouter.convert()'s
    /// minAmountOut -- without it, a share-price move between signing and
    /// mining (another depositor, a withdrawal, or a sandwich) could hand
    /// the caller fewer shares than expected with no recourse, since the
    /// vault call has no slippage awareness of its own. Pass 0 to accept
    /// any amount (not recommended for anything but a dust-sized test).
    function deposit(uint256 assets, uint256 minShares) external nonReentrant returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();

        usdgToken.safeTransferFrom(msg.sender, address(this), assets);

        uint256 fee = (assets * feeBps) / BPS_DENOMINATOR;
        uint256 netAssets = assets - fee;

        if (fee > 0) {
            usdgToken.safeTransfer(feeRecipient, fee);
        }

        usdgToken.forceApprove(address(vault), netAssets);
        shares = vault.deposit(netAssets, msg.sender);
        if (shares < minShares) revert SlippageTooHigh(shares, minShares);

        emit Deposited(msg.sender, assets, fee, netAssets, shares);
    }

    /// @notice Owner-only: repoint where the fee cut accumulates (e.g. if
    /// the treasury wallet ever changes). Never affects deposits already
    /// made -- shares already minted sit in the depositor's own wallet,
    /// completely outside this contract's reach.
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "fee recipient is zero address");
        feeRecipient = _feeRecipient;
        emit FeeRecipientSet(_feeRecipient);
    }

    /// @notice Owner-only: adjust the fee rate, hard-capped at
    /// MAX_FEE_BPS regardless of what the owner requests.
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh(_feeBps, MAX_FEE_BPS);
        feeBps = _feeBps;
        emit FeeBpsSet(_feeBps);
    }

    /// @notice Owner-only recovery for tokens stranded here by mistake
    /// (e.g. a direct transfer instead of calling deposit()) -- this
    /// contract is never meant to hold a balance between transactions;
    /// deposit() moves everything out (to feeRecipient or the vault) in
    /// the same call it comes in. Same pattern as
    /// InternRewardsRouter.sweepStranded.
    function sweepStranded(address token, address to) external onlyOwner {
        require(to != address(0), "cannot sweep to zero address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
    }
}
