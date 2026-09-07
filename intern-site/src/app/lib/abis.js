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
