// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMorpho} from "../interfaces/IMorpho.sol";

/// @notice Minimal Morpho Blue test double -- implements just enough
/// of the real protocol's behavior to exercise CacheBorrow.sol's own
/// allowlist/fee/routing logic. Deliberately simple: 1:1 assets:shares
/// (no interest accrual), no LLTV/health-factor enforcement, no
/// liquidations. Real Morpho Blue's own accounting, interest rate
/// model, and liquidation mechanics are out of scope for these tests
/// -- same "tested against a mock, not the real protocol's internal
/// math" caveat CacheVaultDeposit's own MockERC4626Vault carries.
/// Must be pre-funded with the loan token for borrow() to have
/// anything to lend out -- tests do this explicitly, mirroring how a
/// real market needs real supplied liquidity before anyone can borrow.
///
/// AUTHORIZATION IS FAITHFULLY MODELED, unlike the rest of this mock --
/// this is the one piece of real Morpho Blue behavior these tests
/// genuinely need to enforce, since it's exactly what CacheBorrow's
/// first deployed version got wrong (see CacheBorrow.sol's own
/// NatSpec): borrow()/withdrawCollateral()/withdraw() require
/// `msg.sender == onBehalf || isAuthorized[onBehalf][msg.sender]`,
/// same as real Morpho; supplyCollateral()/supply()/repay() never
/// check it, same as real Morpho. setAuthorizationWithSig() skips real
/// EIP-712 signature verification (a test convenience -- this mock
/// never claims to model Morpho's cryptography), but does enforce the
/// real nonce semantics (must match exactly, strictly increments after
/// use), which is enough to catch a bundle-construction bug in
/// CacheBorrow's own AuthBundle handling even without real signatures.
contract MockMorpho is IMorpho {
    using SafeERC20 for IERC20;

    mapping(bytes32 => mapping(address => uint256)) public collateral;
    mapping(bytes32 => mapping(address => uint256)) public borrowShares;
    mapping(bytes32 => mapping(address => uint256)) public supplyShares;
    mapping(address => mapping(address => bool)) internal _isAuthorized;
    mapping(address => uint256) internal _nonce;

    function _id(MarketParams memory marketParams) internal pure returns (bytes32) {
        return keccak256(abi.encode(marketParams));
    }

    function _requireSenderAuthorized(address onBehalf) internal view {
        require(msg.sender == onBehalf || _isAuthorized[onBehalf][msg.sender], "unauthorized");
    }

    function supplyCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, bytes memory)
        external
        override
    {
        IERC20(marketParams.collateralToken).safeTransferFrom(msg.sender, address(this), assets);
        collateral[_id(marketParams)][onBehalf] += assets;
    }

    function borrow(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external
        override
        returns (uint256 assetsBorrowed, uint256 sharesBorrowed)
    {
        _requireSenderAuthorized(onBehalf);
        require((assets == 0) != (shares == 0), "exactly one of assets/shares must be nonzero");
        assetsBorrowed = assets == 0 ? shares : assets; // 1:1, mock only
        sharesBorrowed = assetsBorrowed;
        borrowShares[_id(marketParams)][onBehalf] += sharesBorrowed;
        IERC20(marketParams.loanToken).safeTransfer(receiver, assetsBorrowed);
    }

    function repay(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory)
        external
        override
        returns (uint256 assetsRepaid, uint256 sharesRepaid)
    {
        require((assets == 0) != (shares == 0), "exactly one of assets/shares must be nonzero");
        bytes32 marketId = _id(marketParams);
        sharesRepaid = assets == 0 ? shares : assets; // 1:1, mock only
        require(sharesRepaid <= borrowShares[marketId][onBehalf], "repay exceeds debt");
        assetsRepaid = sharesRepaid;
        borrowShares[marketId][onBehalf] -= sharesRepaid;
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), assetsRepaid);
    }

    function withdrawCollateral(MarketParams memory marketParams, uint256 assets, address onBehalf, address receiver)
        external
        override
    {
        _requireSenderAuthorized(onBehalf);
        bytes32 marketId = _id(marketParams);
        require(assets <= collateral[marketId][onBehalf], "withdraw exceeds posted collateral");
        collateral[marketId][onBehalf] -= assets;
        IERC20(marketParams.collateralToken).safeTransfer(receiver, assets);
    }

    function supply(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, bytes memory)
        external
        override
        returns (uint256 assetsSupplied, uint256 sharesSupplied)
    {
        require((assets == 0) != (shares == 0), "exactly one of assets/shares must be nonzero");
        assetsSupplied = assets == 0 ? shares : assets; // 1:1, mock only
        sharesSupplied = assetsSupplied;
        supplyShares[_id(marketParams)][onBehalf] += sharesSupplied;
        IERC20(marketParams.loanToken).safeTransferFrom(msg.sender, address(this), assetsSupplied);
    }

    function withdraw(MarketParams memory marketParams, uint256 assets, uint256 shares, address onBehalf, address receiver)
        external
        override
        returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn)
    {
        _requireSenderAuthorized(onBehalf);
        require((assets == 0) != (shares == 0), "exactly one of assets/shares must be nonzero");
        bytes32 marketId = _id(marketParams);
        sharesWithdrawn = assets == 0 ? shares : assets; // 1:1, mock only
        require(sharesWithdrawn <= supplyShares[marketId][onBehalf], "withdraw exceeds supplied position");
        assetsWithdrawn = sharesWithdrawn;
        supplyShares[marketId][onBehalf] -= sharesWithdrawn;
        IERC20(marketParams.loanToken).safeTransfer(receiver, assetsWithdrawn);
    }

    function isAuthorized(address authorizer, address authorizee) external view override returns (bool) {
        return _isAuthorized[authorizer][authorizee];
    }

    function setAuthorization(address authorized, bool newIsAuthorized) external {
        _isAuthorized[msg.sender][authorized] = newIsAuthorized;
    }

    /// @dev Real signature verification deliberately skipped (test
    /// convenience, documented at the contract level) -- but nonce
    /// enforcement is real: this is what actually proves CacheBorrow's
    /// AuthBundle grant (nonce N) / revoke (nonce N+1) pairing is
    /// constructed correctly, independent of any real cryptography.
    function setAuthorizationWithSig(Authorization calldata authorization, Signature calldata) external override {
        require(authorization.nonce == _nonce[authorization.authorizer], "invalid nonce");
        _nonce[authorization.authorizer] += 1;
        _isAuthorized[authorization.authorizer][authorization.authorized] = authorization.isAuthorized;
    }

    function nonce(address authorizer) external view override returns (uint256) {
        return _nonce[authorizer];
    }
}
