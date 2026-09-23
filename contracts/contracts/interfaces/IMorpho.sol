// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal Morpho Blue interface -- only the functions
/// CacheBorrow.sol actually calls, not the full protocol surface.
/// Signatures match Morpho Blue's real, public, identically-implemented
/// ABI (same interface across every Morpho Blue deployment -- mainnet,
/// Base, etc., documented at docs.morpho.org). Confirmed against the
/// real deployment on Robinhood Chain (0x9D53d5E3bd5E8d4Cbfa6DB1ca238AEA02E651010):
/// every selector below (supplyCollateral, borrow, repay,
/// withdrawCollateral, isAuthorized, supply, withdraw) is present in
/// the live deployed bytecode, and a live isAuthorized() read executed
/// successfully -- not assumed from docs alone.
interface IMorpho {
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
    /// `authorizer`. CacheBorrow deliberately never calls
    /// setAuthorization and never relies on this being true for
    /// itself -- see docs/cache-borrow-spec.md's "Explicitly rejected"
    /// section. Included here only for completeness/testability.
    function isAuthorized(address authorizer, address authorizee) external view returns (bool);
}
