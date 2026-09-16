// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface ISwapRouter {
    struct ExactInputParams {
        bytes path;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
    }

    /// @dev SwapRouter02's real signature -- no `deadline` field (unlike
    /// the original V1 SwapRouter). Confirmed against the same live
    /// deployment intern-burn-bot/lib/swapEthForBe.js already calls
    /// (0xCaf681a66D020601342297493863E78C959E5cb2) -- its
    /// exactInputSingle ABI has no deadline either, same router.
    function exactInput(ExactInputParams calldata params) external payable returns (uint256 amountOut);
}

/// @title InternRewardsRouter
/// @notice Phase 1 of letting a staker receive their BE as a real
/// tokenized stock instead: claim BE from InternStakingRewards exactly as
/// today (unchanged), then optionally call convert() here to swap that BE
/// into TSLA, NVDA, SPCX, or any other Robinhood Stock Token the owner
/// allowlists -- through real, live Uniswap V3 pools, at the depth
/// checked against live chain state on 2026-09-16:
///   BE/USDG   0.30% fee, ~$135.7K liquidity
///   TSLA/USDG 0.30% fee, ~$1.1M liquidity
///   NVDA/USDG 0.05% fee, ~$7.2M liquidity
///   SPCX/USDG 0.05% fee, ~$3.2M liquidity
/// (all deeper than BE's own pool, which the live distribution bot
/// already routes real fee revenue through today -- see
/// intern-burn-bot/lib/swapEthForBe.js.)
///
/// Deliberately NOT a rewrite of InternStakingRewards. That contract
/// holds real staked value right now and its own reward math (stake,
/// withdraw, earned(), the streaming accumulator) is untouched by this --
/// this router only ever receives BE the caller already claimed
/// themselves, and only ever swaps it for the caller's own benefit, to
/// the caller's own wallet. It cannot call getReward() on anyone's
/// behalf (InternStakingRewards has no delegated-claim mechanism, and
/// this contract doesn't try to add one) and it never touches staked
/// $INTERN.
///
/// SECURITY NOTE: this contract moves real BE and real Stock Tokens
/// through real third-party AMM pools it does not control. It has been
/// unit-tested for the scenarios in test/ (against a mock swap router --
/// the real Uniswap V3 deployment's own swap math is out of scope; this
/// tests THIS contract's allowlist/approval/recipient/slippage logic,
/// not Uniswap's), but it has NOT had a professional security audit.
/// Do not point real value at a live deployment of this contract until
/// it has been reviewed by someone experienced in Solidity security
/// beyond this codebase's own tests.
contract InternRewardsRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /// @notice BE -- what every conversion starts from. Immutable: this
    /// router is scoped to one starting asset, not a general-purpose swap
    /// router.
    IERC20 public immutable beToken;
    /// @notice USDG -- the shared quote currency every Robinhood Stock
    /// Token pool above is denominated in. Every path here is exactly
    /// two hops: BE -> USDG -> target, never more.
    IERC20 public immutable usdgToken;
    /// @notice The real, live Uniswap V3 SwapRouter02 deployment this
    /// contract calls -- the same one intern-burn-bot's own
    /// swapEthForBe.js already uses for the bot's BE purchases.
    ISwapRouter public immutable swapRouter;

    /// @notice BE/USDG pool fee tier (hundredths of a bip -- 3000 = 0.30%),
    /// fixed at deployment. Confirmed against the live BE/USDG pool.
    uint24 public immutable beUsdgFee;

    /// @notice Per-target-asset USDG pool fee tier. 0 means "not
    /// supported" -- Uniswap V3 has no real 0% tier, so this doubles as
    /// the allowlist check with no separate bool needed.
    mapping(address => uint24) public targetFee;

    event TargetAssetSet(address indexed asset, uint24 fee);
    event Converted(
        address indexed user,
        address indexed targetAsset,
        uint256 beIn,
        uint256 assetOut
    );

    error UnsupportedAsset(address asset);
    error ZeroAmount();

    constructor(address _beToken, address _usdgToken, address _swapRouter, uint24 _beUsdgFee, address _owner)
        Ownable(_owner)
    {
        require(_beToken != address(0), "BE token is zero address");
        require(_usdgToken != address(0), "USDG token is zero address");
        require(_swapRouter != address(0), "swap router is zero address");
        require(_beUsdgFee > 0, "BE/USDG fee must be set");
        beToken = IERC20(_beToken);
        usdgToken = IERC20(_usdgToken);
        swapRouter = ISwapRouter(_swapRouter);
        beUsdgFee = _beUsdgFee;
    }

    /// @notice Owner-only: add, update, or remove (fee = 0) a supported
    /// target asset and its USDG pool fee tier. Adding a new Robinhood
    /// Stock Token to the choices a staker can convert into never
    /// requires redeploying this contract.
    function setTargetAsset(address asset, uint24 fee) external onlyOwner {
        require(asset != address(0), "asset is zero address");
        require(asset != address(beToken) && asset != address(usdgToken), "cannot target BE or USDG directly");
        targetFee[asset] = fee;
        emit TargetAssetSet(asset, fee);
    }

    /// @notice Swap `beAmount` of the caller's own BE (already claimed
    /// from InternStakingRewards via getReward()/exit(), same as always)
    /// into `targetAsset`, landing directly in the caller's wallet.
    /// Requires an ERC-20 approval on beToken for at least `beAmount`
    /// beforehand -- same one-time-approve-then-act shape as every other
    /// token action on this site.
    function convert(address targetAsset, uint256 beAmount, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        uint24 fee = targetFee[targetAsset];
        if (fee == 0) revert UnsupportedAsset(targetAsset);
        if (beAmount == 0) revert ZeroAmount();

        beToken.safeTransferFrom(msg.sender, address(this), beAmount);
        beToken.forceApprove(address(swapRouter), beAmount);

        bytes memory path = abi.encodePacked(address(beToken), beUsdgFee, address(usdgToken), fee, targetAsset);

        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: msg.sender,
                amountIn: beAmount,
                amountOutMinimum: minAmountOut
            })
        );

        emit Converted(msg.sender, targetAsset, beAmount, amountOut);
    }

    /// @notice Owner-only recovery for tokens that end up stranded here by
    /// mistake (e.g. a direct transfer instead of calling convert()) --
    /// this contract is never meant to hold a balance between
    /// transactions, so anything sitting here outside of convert()'s own
    /// atomic transferFrom-then-swap is stuck by accident, not by design.
    function sweepStranded(address token, address to) external onlyOwner {
        require(to != address(0), "cannot sweep to zero address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransfer(to, balance);
    }
}
