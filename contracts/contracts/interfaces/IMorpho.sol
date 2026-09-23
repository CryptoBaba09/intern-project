// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal Morpho Blue interface -- only the functions
/// CacheBorrow.sol actually calls, not the full protocol surface.
/// Signatures match Morpho Blue's real, public, identically-implemented
/// ABI (same interface across every Morpho Blue deployment -- mainnet,
/// Base, etc., documented at docs.morpho.org). Confirmed against the
/// real deployment on Robinhood Chain (0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010):
/// every selector below (supplyCollateral, borrow, repay,
/// withdrawCollateral, isAuthorized, supply, withdraw,
/// setAuthorizationWithSig, setAuthorization, nonce) is present in the
/// live deployed bytecode -- not assumed from docs alone.
///
/// CORRECTED 2026-09-23, post-deployment: borrow(), withdraw(), and
/// withdrawCollateral() are NOT permissionless the way supply(),
/// supplyCollateral(), and repay() are -- verified directly against
/// Morpho Blue's own real source. Each of the three checks
/// `msg.sender == onBehalf || isAuthorized[onBehalf][msg.sender]`
/// before running; the other three never do (giving value to someone
/// else's position needs no permission, taking it out does). This
/// means a bare call from THIS contract with onBehalf = the real user
/// -- which is exactly what the first deployed version of
/// CacheBorrow.sol did for all three -- reverts UNAUTHORIZED every
/// time, since Morpho's real msg.sender is CacheBorrow's own address,
/// never the user's. See CacheBorrow.sol's AuthBundle for the fix:
/// grant + act + revoke, atomically, via setAuthorizationWithSig,
/// so no STANDING authorization is ever created (preserving the
/// "hold funds/authority for one transaction only" bar this codebase
/// already holds itself to) while still satisfying Morpho's real
/// authorization check.
interface IMorpho {
    /// @notice Morpho's own signed-authorization message, EIP-712 over
    /// this exact struct (per Morpho Blue's real DOMAIN_SEPARATOR).
    /// `nonce` must equal `nonce(authorizer)` at call time and strictly
    /// increments after each use -- this is what makes grant (nonce N)
    /// and revoke (nonce N+1) unambiguously ordered within one
    /// transaction, and unreplayable afterward.
    struct Authorization {
        address authorizer;
        address authorized;
        bool isAuthorized;
        uint256 nonce;
        uint256 deadline;
    }

    /// @notice A raw ECDSA signature over an Authorization's EIP-712
    /// digest -- produced off-chain (e.g. viem's signTypedData), never
    /// a gas transaction itself.
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @notice Submit a signed Authorization on the signer's behalf --
    /// this is what lets CacheBorrow grant (and later revoke) itself
    /// permission to act as `authorization.authorizer` for exactly one
    /// call, without that user ever sending a separate on-chain
    /// setAuthorization transaction themselves.
    function setAuthorizationWithSig(Authorization calldata authorization, Signature calldata signature) external;

    /// @notice The authorizer's current nonce -- what a fresh
    /// Authorization to be signed must set as its own `nonce` field.
    function nonce(address authorizer) external view returns (uint256);
    /// @notice The five-tuple that identifies a Morpho Blue market.
    /// Order matters -- Morpho derives the market's id as
    /// keccak256(abi.encode(marketParams)), so passing the same five
    /// fields in a different order produces a different (wrong) market.
    struct MarketParams {
        address loanToken;
        address collateralToken;
        address oracle;
        address irm;
        uint256 lltv;
    }

    /// @notice Post `assets` of marketParams.collateralToken as
    /// collateral, on behalf of `onBehalf`. The caller must already
    /// hold and have approved the collateral token.
    function supplyCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, bytes memory data)
        external;

    /// @notice Borrow against posted collateral. Exactly one of
    /// `assets`/`shares` must be nonzero. The borrowed loanToken is
    /// sent to `receiver` -- which can differ from `onBehalf`, the
    /// address the resulting debt position is actually recorded
    /// under. This is the exact mechanism CacheBorrow relies on to
    /// intercept its fee without ever custodying the position itself.
    function borrow(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external
        returns (uint256 assetsBorrowed, uint256 sharesBorrowed);

    /// @notice Repay debt. Exactly one of `assets`/`shares` must be
    /// nonzero. Pulls marketParams.loanToken from the caller (via
    /// transferFrom) up to what's actually owed.
    function repay(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external
        returns (uint256 assetsRepaid, uint256 sharesRepaid);

    /// @notice Withdraw posted collateral to `receiver`, reverting if
    /// it would leave `onBehalf`'s position unhealthy. `receiver` can
    /// be the end user directly -- CacheBorrow never needs to touch
    /// withdrawn collateral at all, since there's no fee on this leg.
    function withdrawCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, address receiver)
        external;

    /// @notice Lender side: supply `assets` of marketParams.loanToken
    /// into the market, on behalf of `onBehalf`. Exactly one of
    /// `assets`/`shares` must be nonzero. Returns the actual amounts
    /// -- `sharesSupplied` depends on the market's current share price
    /// (assets/totalAssets ratio), which can move between signing and
    /// mining, same reason CacheVaultDeposit.deposit() needs a
    /// minShares floor.
    function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory data)
        external
        returns (uint256 assetsSupplied, uint256 sharesSupplied);

    /// @notice Lender side: withdraw supplied loanToken to `receiver`.
    /// Exactly one of `assets`/`shares` must be nonzero. `receiver` can
    /// be the end user directly -- no fee on this leg, so CacheBorrow
    /// never needs to touch the withdrawn amount at all.
    function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external
        returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn);

    /// @notice Whether `authorizee` can act as `onBehalf` for
    /// `authorizer`. CacheBorrow never leaves this true for itself
    /// once a transaction ends -- see AuthBundle in CacheBorrow.sol.
    /// Used in tests to assert exactly that (false before, true only
    /// mid-call, false again after).
    function isAuthorized(address authorizer, address authorizee) external view returns (bool);
}
