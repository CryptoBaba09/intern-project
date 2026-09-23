// Minimal ABIs -- only the functions the site actually calls. Kept
// hand-written and in sync with contracts/contracts/InternStakingRewards.sol
// rather than importing Hardhat build artifacts, since intern-site and
// contracts/ are separate workspaces that don't share a build step.

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

export const STAKING_REWARDS_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "earned",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalStaked",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getReward",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "exit",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
];

// InternMigration -- swaps v1 $INTERN for v2 1:1 (contracts/contracts/
// InternMigration.sol). Not verified on Blockscout, so this is
// hand-written from the source, same convention as every other ABI in
// this file rather than a special case.
export const MIGRATION_ABI = [
  {
    type: "function",
    name: "migrate",
    stateMutability: "nonpayable",
    inputs: [{ name: "v1Amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "previewMigrate",
    stateMutability: "view",
    inputs: [{ name: "v1Amount", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "claimDeadline",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalV1Migrated",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];

// InternRewardsRouter -- Phase 1 of letting a staker convert claimed BE
// into a real Robinhood Stock Token (contracts/contracts/
// InternRewardsRouter.sol). Not verified on Blockscout once deployed
// (same as InternMigration), so hand-written from source.
export const REWARDS_ROUTER_ABI = [
  {
    type: "function",
    name: "targetFee",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ type: "uint24" }],
  },
  {
    type: "function",
    name: "convert",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targetAsset", type: "address" },
      { name: "beAmount", type: "uint256" },
      { name: "minAmountOut", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
];

// CacheVaultDeposit -- deposit()'s minShares matches convert()'s
// minAmountOut above (same slippage-floor shape, see
// contracts/contracts/CacheVaultDeposit.sol). Read-only getters below
// are for the live preview (fee rate, vault/USDG addresses) --
// previewDeposit/asset/etc. are read straight off the vault itself via
// ERC4626_VAULT_ABI, not duplicated here.
export const CACHE_VAULT_DEPOSIT_ABI = [
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "minShares", type: "uint256" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  { type: "function", name: "usdgToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "vault", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feeRecipient", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

// CacheBorrow -- the real two-sided Morpho Blue wrapper (see
// contracts/contracts/CacheBorrow.sol, docs/cache-borrow-spec.md).
// MarketParams is passed as a tuple matching Morpho's own struct
// exactly (loanToken/collateralToken/oracle/irm/lltv) -- every write
// function below takes it first, same shape the deployed contract
// itself expects. id()/isMarketAllowed() let the front end check a
// given market is actually allowlisted before ever showing it as
// choosable, rather than trusting a hardcoded assumption.
export const CACHE_BORROW_ABI = [
  {
    type: "function",
    name: "depositCollateral",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdrawCollateral",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "borrow",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "minReceived", type: "uint256" },
    ],
    outputs: [{ name: "assetsReceived", type: "uint256" }],
  },
  {
    type: "function",
    name: "repay",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "maxAssetsIn", type: "uint256" },
    ],
    outputs: [
      { name: "assetsRepaid", type: "uint256" },
      { name: "sharesRepaid", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "supply",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "minSharesOut", type: "uint256" },
    ],
    outputs: [{ name: "sharesSupplied", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdrawSupply",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
    ],
    outputs: [
      { name: "assetsWithdrawn", type: "uint256" },
      { name: "sharesWithdrawn", type: "uint256" },
    ],
  },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "isMarketAllowed",
    stateMutability: "view",
    inputs: [{ name: "", type: "bytes32" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "id",
    stateMutability: "pure",
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
    ],
    outputs: [{ type: "bytes32" }],
  },
];

// Morpho Blue's own core read surface -- position()/market() give the
// real per-user and per-market state (collateral, borrow shares/assets,
// supply shares/assets) CacheBorrow itself doesn't duplicate, since the
// user's position lives directly on Morpho, not custodied by
// CacheBorrow at all (see docs/cache-borrow-spec.md's non-custody
// architecture). Position/market ids are Morpho's own keccak256 of the
// MarketParams tuple -- same id() CacheBorrow's own ABI exposes above,
// so both always agree.
export const MORPHO_ABI = [
  {
    type: "function",
    name: "position",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
  },
  {
    type: "function",
    name: "market",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
  },
];

// A minimal, standard ERC-4626 read surface -- used to read the real
// Steakhouse USDG vault directly (live share price/TVL for the
// preview), not routed through CacheVaultDeposit for reads since the
// vault itself is the source of truth and deposit() doesn't wrap any
// getters.
export const ERC4626_VAULT_ABI = [
  { type: "function", name: "asset", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "totalAssets", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "convertToShares",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "previewDeposit",
    stateMutability: "view",
    inputs: [{ name: "assets", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
];

// Uniswap V3's QuoterV2 -- the same live deployment
// intern-burn-bot/lib/swapEthForBe.js already calls for its own
// single-hop quote. quoteExactInput is the multi-hop variant this site
// needs for a BE -> USDG -> target quote (RewardChoicePreview.js
// encodes the same packed-path format InternRewardsRouter.sol uses).
// Marked nonpayable despite being read-only for the same reason
// V4_QUOTER_ABI below is: it's meant to be called via eth_call /
// wagmi's simulate, not a real transaction.
export const QUOTER_V2_ABI = [
  {
    type: "function",
    name: "quoteExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "path", type: "bytes" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96AfterList", type: "uint160[]" },
      { name: "initializedTicksCrossedList", type: "uint32[]" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
];

// PairV5MultiPoolAggregator -- PAIR's own permissionless swap-execution
// contract (the exact one their site's AUTO buy/sell uses), pulled verbatim
// from Blockscout's verified ABI at 0x9d7741776098aFA315e4D576ede4F2c67a21d8Ce
// on 2026-09-07. Trimmed to the two functions this site calls.
const POOL_KEY_COMPONENTS = [
  { name: "currency0", type: "address" },
  { name: "currency1", type: "address" },
  { name: "fee", type: "uint24" },
  { name: "tickSpacing", type: "int24" },
  { name: "hooks", type: "address" },
];

const LEG_COMPONENTS = [
  { name: "poolIndex", type: "uint8" },
  { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
  { name: "amountIn", type: "uint128" },
  { name: "minAmountOut", type: "uint128" },
];

export const AGGREGATOR_ABI = [
  {
    type: "function",
    name: "buyExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectToken", type: "address" },
      { name: "fundingToken", type: "address" },
      { name: "recipient", type: "address" },
      { name: "legs", type: "tuple[]", components: LEG_COMPONENTS },
      { name: "aggregateMinOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
  {
    type: "function",
    name: "sellExactInput",
    stateMutability: "nonpayable",
    inputs: [
      { name: "projectToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "recipient", type: "address" },
      { name: "legs", type: "tuple[]", components: LEG_COMPONENTS },
      { name: "aggregateMinOut", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
];

// V4Quoter -- Uniswap V4's official quoting contract, verified ABI pulled
// from Blockscout at 0x8Dc178eFB8111BB0973Dd9d722ebeFF267c98F94. Despite
// being marked nonpayable (it simulates via a pool-manager unlock/revert
// internally), quoteExactInputSingle is meant to be called with eth_call --
// same pattern every Uniswap v3/v4 frontend uses to get a live quote
// without spending gas or touching state.
export const V4_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "poolKey", type: "tuple", components: POOL_KEY_COMPONENTS },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
];
