// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MockERC20} from "./MockERC20.sol";

/// @notice Test-only stand-in for Uniswap V3's SwapRouter02. Does NOT
/// simulate real AMM math (pool ticks, price impact, multi-pool
/// routing) -- that's Uniswap's own, already-battle-tested code, out of
/// scope here. Decodes only the first and last token out of the packed
/// path, pulls `amountIn` of the first from the caller, and mints a
/// test-configurable amountOut of the last to `recipient`. Exists
/// purely to test InternRewardsRouter's OWN logic (allowlist checks,
/// approval handling, recipient correctness, slippage-revert behavior)
/// against a swap that behaves predictably. Never deploy this to a real
/// network.
contract MockSwapRouter {
    using SafeERC20 for IERC20;

    /// @notice Output = input * exchangeRateBps / 10000. 10000 (default)
    /// means 1:1; tests lower this to exercise the amountOutMinimum
    /// slippage-revert path.
    uint256 public exchangeRateBps = 10000;

    function setExchangeRateBps(uint256 rate) external {
        exchangeRateBps = rate;
    }

    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut) {
        require(params.path.length >= 43, "path too short"); // 20 + 3 + 20 minimum (one hop)
        address tokenIn = address(bytes20(params.path[0:20]));
        address tokenOut = address(bytes20(params.path[params.path.length - 20:params.path.length]));

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);

        amountOut = (params.amountIn * exchangeRateBps) / 10000;
        require(amountOut >= params.amountOutMinimum, "Too little received");

        MockERC20(tokenOut).mint(params.recipient, amountOut);
    }
}
