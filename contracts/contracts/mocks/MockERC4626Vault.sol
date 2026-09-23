// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Test-only stand-in for the real Steakhouse USDG Morpho vault --
/// OpenZeppelin's own complete ERC4626 implementation, wrapping a given
/// underlying asset. Real Morpho vaults have their own internal
/// allocation logic across markets; that's explicitly out of scope for
/// CacheVaultDeposit's own tests (see its NatSpec) -- this mock only
/// needs to behave correctly as a standard ERC-4626 (deposit(assets,
/// receiver) mints shares to `receiver`, not necessarily the caller),
/// which is the actual thing CacheVaultDeposit's logic depends on.
/// Never deploy this to a real network.
contract MockERC4626Vault is ERC4626 {
    constructor(IERC20 asset_) ERC20("Mock Steakhouse USDG", "mvUSDG") ERC4626(asset_) {}
}
