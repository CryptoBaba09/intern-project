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
contract MockMorpho is IMorpho {
    using SafeERC20 for IERC20;

    mapping(bytes32 => mapping(address => uint256)) public collateral;
    mapping(bytes32 => mapping(address => uint256)) public borrowShares;

    function _id(MarketParams memory marketParams) internal pure returns (bytes32) {
        return keccak256(abi.encode(marketParams));
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
        bytes32 marketId = _id(marketParams);
        require(assets <= collateral[marketId][onBehalf], "withdraw exceeds posted collateral");
        collateral[marketId][onBehalf] -= assets;
        IERC20(marketParams.collateralToken).safeTransfer(receiver, assets);
    }

    function isAuthorized(address, address) external pure override returns (bool) {
        return false; // CacheBorrow never relies on this being true for itself
    }
}
