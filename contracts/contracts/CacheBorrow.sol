// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IMorpho} from "./interfaces/IMorpho.sol";

/// @title CacheBorrow
/// @notice Cache, the Yield Intern -- the real two-sided market: post a
/// Robinhood Stock Token (TSLA, AAPL, NVDA, etc.) as collateral and
/// borrow USDG against it, OR supply USDG directly into one of these
/// same markets and earn yield from real borrowers. Both sides of a
/// single Morpho Blue market, both routed through this one contract.
/// Companion to CacheVaultDeposit.sol (which deposits into the
/// diversified Steakhouse USDG meta-vault, not into any single named
/// market like these) -- deliberately a SEPARATE contract, not merged
/// into it. See docs/cache-borrow-spec.md for the full architecture
/// writeup and the reasoning below in short form.
///
/// NON-CUSTODIAL, SAME BAR AS EVERY OTHER CONTRACT IN THIS CODEBASE --
/// but the mechanism is different from CacheVaultDeposit's, because
/// Morpho Blue positions aren't transferable ERC-4626 shares, they're
/// non-transferable ledger entries keyed by address. The trick this
/// contract leans on: Morpho's borrow() takes a separate `onBehalf`
/// (whose debt it is) and `receiver` (where the borrowed asset lands).
/// Every call here sets `onBehalf = msg.sender` always -- the
/// resulting collateral/debt position is the CALLER'S, recorded
/// directly in Morpho's own ledger, from the instant it exists. This
/// contract only ever receives `receiver = address(this)` on the
/// borrow() leg specifically, to intercept the fee, and forwards the
/// net amount in the same transaction. It never holds a position, never
/// calls setAuthorization, and never gains standing authority over
/// anyone's collateral or debt -- every action needs the caller's own
/// signature on that specific transaction, same UX/trust bar as every
/// other flow in this codebase (deposit, swap, convert).
///
/// MARKET ALLOWLIST, NOT A GENERAL-PURPOSE ROUTER. Morpho Blue markets
/// are permissionless -- anyone can create one, with any oracle, any
/// LLTV. Real due diligence (see docs/cache-borrow-spec.md) found that
/// some existing Robinhood Stock Token markets use oracles that are
/// NOT confirmed from the known, trusted ChainlinkOracleV2 Factory
/// (0xB7c16F6F8cF531447Bf27Ca7220f981E79C9cdF2), and that popular
/// tickers can have multiple competing markets at different LLTVs.
/// This contract only lets users interact with markets the owner has
/// explicitly allowlisted -- one at a time, by full MarketParams tuple,
/// never by ticker alone -- so a bad oracle or an unreviewed market
/// can't be reached through this contract even if it exists on Morpho.
///
/// FEE: 0.2% skimmed once, on borrow() AND on supply(), off the amount
/// actually moved each time -- same one-time-skim shape as
/// CacheVaultDeposit's deposit fee, applied symmetrically: a fee where
/// capital enters to do work (supplied to earn yield, borrowed to be
/// spent), never a fee where nothing is being extracted. No fee on
/// supplyCollateral/repay/withdrawCollateral/withdrawSupply -- posting
/// collateral isn't extracting value, and withdrawing (either side)
/// is just closing a position, not creating one. Not an ongoing spread
/// on the interest rate either way (would require this contract to
/// track accrued interest independently of Morpho's own accounting --
/// real new state, real new bugs, for a fee that's meant to stay
/// simple). Skimmed USDG accumulates at feeRecipient and gets
/// swapped-and-burned via the same existing manual cycle
/// CacheVaultDeposit's fee already uses -- not an inline USDG->ETH
/// swap-and-burn in this transaction, same reasoning as
/// CacheVaultDeposit's own NatSpec (Pons only takes native ETH
/// pre-graduation; bolting a swap router on for a rounding-error fee
/// isn't worth the widened audit surface).
///
/// SECURITY NOTE: unit-tested against a mock Morpho (real Morpho Blue's
/// own accounting, interest accrual, and liquidation logic are out of
/// scope for these tests -- they test THIS contract's allowlist/fee/
/// routing logic, not Morpho's), but has NOT had a professional
/// security audit. This carries real liquidation and oracle risk to
/// end users that CacheVaultDeposit does not -- do not point real
/// collateral at a live deployment until it has had at least the same
/// Slither + manual review pass every other live contract here got,
/// and ideally an outside review given the liquidation/oracle risk is
/// categorically new to this codebase.
contract CacheBorrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice The real, live Morpho Blue singleton on Robinhood
    /// Chain. Same deployment CacheVaultDeposit's own vault sits on
    /// top of.
    IMorpho public immutable morpho;

    /// @notice USDG -- the only loan asset this contract supports.
    /// Every allowlisted market must have this as its loanToken,
    /// enforced in setMarketAllowed. Collateral assets vary per
    /// market (TSLA, AAPL, NVDA, ...); the loan side stays fixed,
    /// same "USDG only" scope CacheVaultDeposit already applies.
    IERC20 public immutable usdgToken;

    /// @notice Where the skimmed borrow fee accumulates, in USDG, to
    /// be swapped-and-burned as part of the existing treasury cycle.
    address public feeRecipient;

    /// @notice Fee in basis points, out of 10_000, charged on borrow()
    /// only. 20 = 0.2%. Capped at MAX_FEE_BPS regardless of what the
    /// owner requests.
    uint256 public feeBps;
    uint256 public constant MAX_FEE_BPS = 200; // 2% hard ceiling
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Owner-approved markets, keyed by Morpho's own market id
    /// (keccak256(abi.encode(MarketParams)) -- see id()). A market not
    /// in this mapping can't be reached through this contract, no
    /// matter what exists on Morpho itself.
    mapping(bytes32 => bool) public isMarketAllowed;
    /// @notice The full MarketParams tuple for each allowed market id
    /// -- stored because every Morpho call needs the full struct, not
    /// just the id, and this public mapping getter lets a frontend
    /// look up the exact struct for a known id (e.g. one read from an
    /// event) instead of having to keep its own separate copy in sync.
    /// Every function below still takes the full struct directly as
    /// an argument, never just an id -- there's no ambiguity about
    /// which fields produced a given id because the struct is always
    /// what's actually passed to Morpho.
    mapping(bytes32 => IMorpho.MarketParams) public marketParamsById;

    event MarketAllowed(bytes32 indexed marketId, address indexed collateralToken, uint256 lltv, address oracle);
    event MarketDisallowed(bytes32 indexed marketId);
    event CollateralDeposited(address indexed user, bytes32 indexed marketId, uint256 assets);
    event Borrowed(address indexed user, bytes32 indexed marketId, uint256 assetsBorrowed, uint256 fee, uint256 assetsReceived);
    event Repaid(address indexed user, bytes32 indexed marketId, uint256 assetsRepaid, uint256 sharesRepaid);
    event CollateralWithdrawn(address indexed user, bytes32 indexed marketId, uint256 assets);
    event Supplied(address indexed user, bytes32 indexed marketId, uint256 assetsIn, uint256 fee, uint256 assetsSupplied, uint256 sharesSupplied);
    event SupplyWithdrawn(address indexed user, bytes32 indexed marketId, uint256 assetsWithdrawn, uint256 sharesWithdrawn);
    event FeeRecipientSet(address indexed feeRecipient);
    event FeeBpsSet(uint256 feeBps);

    error ZeroAmount();
    error FeeTooHigh(uint256 requested, uint256 max);
    error MarketNotAllowed(bytes32 marketId);
    error WrongLoanToken(address given, address expected);
    /// @dev Shared by borrow() (assets vs. minReceived) and supply()
    /// (shares vs. minSharesOut) -- both are "you set a floor and
    /// didn't get at least that much," just different units.
    error SlippageTooHigh(uint256 got, uint256 min);

    constructor(address _morpho, address _usdgToken, address _feeRecipient, uint256 _feeBps, address _owner)
        Ownable(_owner)
    {
        require(_morpho != address(0), "morpho is zero address");
        require(_usdgToken != address(0), "USDG token is zero address");
        require(_feeRecipient != address(0), "fee recipient is zero address");
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh(_feeBps, MAX_FEE_BPS);

        morpho = IMorpho(_morpho);
        usdgToken = IERC20(_usdgToken);
        feeRecipient = _feeRecipient;
        feeBps = _feeBps;
    }

    /// @notice Morpho's own market id derivation -- keccak256 of the
    /// ABI-encoded MarketParams tuple. Exposed as a public pure
    /// function so both this contract and the frontend compute the
    /// same id from the same struct, no drift possible.
    function id(IMorpho.MarketParams memory marketParams) public pure returns (bytes32) {
        return keccak256(abi.encode(marketParams));
    }

    /// @notice Owner-only: allowlist (or remove) a specific market by
    /// its full MarketParams tuple -- never by ticker. Requires
    /// loanToken == usdgToken, catching an accidental wrong-market
    /// tuple at allowlist time rather than failing confusingly (or
    /// silently succeeding against the wrong asset) on first use, same
    /// pattern CacheVaultDeposit's constructor already applies to its
    /// vault address.
    function setMarketAllowed(IMorpho.MarketParams calldata marketParams, bool allowed) external onlyOwner {
        if (allowed && marketParams.loanToken != address(usdgToken)) {
            revert WrongLoanToken(marketParams.loanToken, address(usdgToken));
        }
        bytes32 marketId = id(marketParams);
        isMarketAllowed[marketId] = allowed;
        if (allowed) {
            marketParamsById[marketId] = marketParams;
            emit MarketAllowed(marketId, marketParams.collateralToken, marketParams.lltv, marketParams.oracle);
        } else {
            emit MarketDisallowed(marketId);
        }
    }

    modifier onlyAllowedMarket(IMorpho.MarketParams calldata marketParams) {
        bytes32 marketId = id(marketParams);
        if (!isMarketAllowed[marketId]) revert MarketNotAllowed(marketId);
        _;
    }

    /// @notice Post `assets` of marketParams.collateralToken as
    /// collateral. The resulting position is recorded under the
    /// CALLER's own address in Morpho -- this contract holds the
    /// collateral token for one transaction only, on the way in.
    /// Requires an ERC-20 approval on the collateral token beforehand.
    function depositCollateral(IMorpho.MarketParams calldata marketParams, uint256 assets)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
    {
        if (assets == 0) revert ZeroAmount();
        IERC20 collateralToken = IERC20(marketParams.collateralToken);
        collateralToken.safeTransferFrom(msg.sender, address(this), assets);
        collateralToken.forceApprove(address(morpho), assets);
        morpho.supplyCollateral(marketParams, assets, msg.sender, "");
        emit CollateralDeposited(msg.sender, id(marketParams), assets);
    }

    /// @notice Borrow `assets` of USDG against the caller's own
    /// already-posted collateral. Skims feeBps off the top; the
    /// caller receives the rest. `minReceived` guards against the fee
    /// rate itself changing between signing and mining (feeBps is
    /// owner-adjustable) -- there's no price/exchange-rate slippage on
    /// a fixed-assets borrow the way there is on an ERC-4626 deposit,
    /// so this is the one variable actually worth a floor here.
    function borrow(IMorpho.MarketParams calldata marketParams, uint256 assets, uint256 minReceived)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
        returns (uint256 assetsReceived)
    {
        if (assets == 0) revert ZeroAmount();

        // sharesBorrowed (the second return value) is deliberately
        // unused, not overlooked -- flagged by Slither's unused-return
        // detector, reviewed: this contract's own fee math only ever
        // needs assetsBorrowed (the exact amount that actually moved),
        // since Morpho itself tracks the caller's share-denominated
        // debt position internally. Nothing here depends on shares.
        (uint256 assetsBorrowed,) = morpho.borrow(marketParams, assets, 0, msg.sender, address(this));

        uint256 fee = (assetsBorrowed * feeBps) / BPS_DENOMINATOR;
        assetsReceived = assetsBorrowed - fee;
        if (assetsReceived < minReceived) revert SlippageTooHigh(assetsReceived, minReceived);

        if (fee > 0) {
            usdgToken.safeTransfer(feeRecipient, fee);
        }
        usdgToken.safeTransfer(msg.sender, assetsReceived);

        emit Borrowed(msg.sender, id(marketParams), assetsBorrowed, fee, assetsReceived);
    }

    /// @notice Repay debt on the caller's own position. Exactly one
    /// of `assets`/`shares` must be nonzero, same as Morpho's own
    /// repay() -- pass `shares` (with assets = 0) to repay an exact
    /// share amount (e.g. the caller's full outstanding debt, read
    /// from Morpho directly) without needing to predict the precise
    /// asset cost of accrued interest. `maxAssetsIn` is pulled
    /// upfront (the caller must approve at least this much USDG) and
    /// any amount not actually consumed by the repay is swept back to
    /// the caller in the same transaction -- this contract never ends
    /// a transaction holding a stray balance.
    function repay(IMorpho.MarketParams calldata marketParams, uint256 assets, uint256 shares, uint256 maxAssetsIn)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
        returns (uint256 assetsRepaid, uint256 sharesRepaid)
    {
        if (maxAssetsIn == 0) revert ZeroAmount();
        usdgToken.safeTransferFrom(msg.sender, address(this), maxAssetsIn);
        usdgToken.forceApprove(address(morpho), maxAssetsIn);

        (assetsRepaid, sharesRepaid) = morpho.repay(marketParams, assets, shares, msg.sender, "");

        usdgToken.forceApprove(address(morpho), 0); // clear any dangling allowance left by an over-estimate
        uint256 leftover = usdgToken.balanceOf(address(this));
        if (leftover > 0) {
            usdgToken.safeTransfer(msg.sender, leftover);
        }

        emit Repaid(msg.sender, id(marketParams), assetsRepaid, sharesRepaid);
    }

    /// @notice Withdraw `assets` of the caller's own posted collateral,
    /// straight to the caller -- Morpho sends it directly via its own
    /// `receiver` param, so this contract never touches the withdrawn
    /// collateral at all, not even for one transaction. Reverts inside
    /// Morpho itself if withdrawing would leave the position unhealthy.
    function withdrawCollateral(IMorpho.MarketParams calldata marketParams, uint256 assets)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
    {
        if (assets == 0) revert ZeroAmount();
        morpho.withdrawCollateral(marketParams, assets, msg.sender, msg.sender);
        emit CollateralWithdrawn(msg.sender, id(marketParams), assets);
    }

    /// @notice LENDER SIDE. Supply `assets` of USDG directly into this
    /// specific market -- earning yield from whoever borrows against
    /// the collateral, not the diversified Steakhouse allocation
    /// CacheVaultDeposit routes into. Skims feeBps off the top, same
    /// as borrow(); the position (Morpho supply shares) is recorded
    /// under the CALLER's own address, this contract holds the USDG
    /// for one transaction only. `minSharesOut` guards against the
    /// market's share price moving between signing and mining -- same
    /// reason CacheVaultDeposit.deposit() has a minShares floor.
    function supply(IMorpho.MarketParams calldata marketParams, uint256 assets, uint256 minSharesOut)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
        returns (uint256 sharesSupplied)
    {
        if (assets == 0) revert ZeroAmount();

        usdgToken.safeTransferFrom(msg.sender, address(this), assets);

        uint256 fee = (assets * feeBps) / BPS_DENOMINATOR;
        uint256 netAssets = assets - fee;
        if (fee > 0) {
            usdgToken.safeTransfer(feeRecipient, fee);
        }

        usdgToken.forceApprove(address(morpho), netAssets);
        uint256 assetsSupplied;
        (assetsSupplied, sharesSupplied) = morpho.supply(marketParams, netAssets, 0, msg.sender, "");
        if (sharesSupplied < minSharesOut) revert SlippageTooHigh(sharesSupplied, minSharesOut);

        emit Supplied(msg.sender, id(marketParams), assets, fee, assetsSupplied, sharesSupplied);
    }

    /// @notice LENDER SIDE. Withdraw supplied USDG straight to the
    /// caller -- Morpho sends it directly via its own `receiver` param,
    /// so this contract never touches it, same as withdrawCollateral.
    /// Exactly one of `assets`/`shares` must be nonzero (pass `shares`
    /// to withdraw an exact share amount, e.g. the caller's full
    /// position, without needing to predict interest accrued since
    /// their last read). No fee -- withdrawing isn't a new value-
    /// creating action, it's closing one already paid for at supply time.
    function withdrawSupply(IMorpho.MarketParams calldata marketParams, uint256 assets, uint256 shares)
        external
        nonReentrant
        onlyAllowedMarket(marketParams)
        returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn)
    {
        (assetsWithdrawn, sharesWithdrawn) = morpho.withdraw(marketParams, assets, shares, msg.sender, msg.sender);
        emit SupplyWithdrawn(msg.sender, id(marketParams), assetsWithdrawn, sharesWithdrawn);
    }

    /// @notice Owner-only: repoint where the borrow fee cut
    /// accumulates. Never affects positions already opened -- those
    /// live entirely in Morpho's own ledger, completely outside this
    /// contract's reach.
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "fee recipient is zero address");
        feeRecipient = _feeRecipient;
        emit FeeRecipientSet(_feeRecipient);
    }

    /// @notice Owner-only: adjust the borrow fee rate, hard-capped at
    /// MAX_FEE_BPS regardless of what the owner requests.
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert FeeTooHigh(_feeBps, MAX_FEE_BPS);
        feeBps = _feeBps;
        emit FeeBpsSet(_feeBps);
    }

    /// @notice Owner-only recovery for tokens stranded here by
    /// mistake (e.g. a direct transfer instead of calling one of the
    /// functions above) -- this contract is never meant to hold a
    /// balance between transactions; every function above moves
    /// everything it touches back out (to Morpho, to the caller, or
    /// to feeRecipient) in the same call it comes in. Same pattern as
    /// InternRewardsRouter.sweepStranded and CacheVaultDeposit.sweepStranded.
    function sweepStranded(address token, address to) external onlyOwner {
        require(to != address(0), "cannot sweep to zero address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
    }
}
