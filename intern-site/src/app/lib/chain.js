import { defineChain } from "viem";

// Confirmed live via eth_chainId against the public RPC (0x1237 = 4663).
// Runs Arbitrum Nitro under the hood. Native currency assumed ETH (the
// Nitro default) -- worth double-checking against official docs before
// launch if that turns out not to be the case.
export const robinhoodChain = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
});

// internToken defaults to the real, live v2 $INTERN address (migrated to
// Pons 2026-09-10) so the site is correct even if the env var override
// below is never set -- see lib/pools.js for why. distributor stays
// unset until InternStakingRewards is actually deployed for v2; every
// page using isStakingLive() checks for that and shows a "not live yet"
// state instead of calling contract methods against a garbage address.
//
// PAIR-specific trade infrastructure (the old aggregator/v4Quoter) is
// gone -- v2 doesn't trade through a locked Uniswap V4 pool we can call
// directly (see lib/pools.js), so there's nothing for those two
// addresses to point at anymore. /trade links out to Pons instead of
// executing swaps in-house. beToken and usdgToken below are a separate,
// newer thing -- real addresses RewardChoicePreview.js needs for its
// own Uniswap V3 quote/convert flow (see InternRewardsRouter.sol), not
// PAIR-related at all.
export const CONTRACTS = {
  internToken:
    process.env.NEXT_PUBLIC_INTERN_TOKEN_ADDRESS ||
    "0x1293a4A3F090c091C7DA6dcca6a3bA9201B0E1C8",
  distributor:
    process.env.NEXT_PUBLIC_DISTRIBUTOR_ADDRESS ||
    "0xd73a24D7bd311E36151344E233a7e6C73369E558",
  // v1 $INTERN, its now-retired staking contract, and the migration
  // contract that swaps v1 -> v2 1:1 (burns v1 to the dead address, pays
  // v2 from a pre-funded balance, atomically). See docs/DocsView.js's own
  // "Deployed addresses" table -- all three are real, deployed 2026-09-10.
  // The v1 staking contract has no page of its own on this site anymore
  // (the live /stake page only talks to v2's `distributor` above) -- it's
  // only read here so MigrationBox can prompt a wallet to exit() it
  // before migrating, instead of leaving v1 stranded staked forever.
  v1Token:
    process.env.NEXT_PUBLIC_V1_INTERN_TOKEN_ADDRESS ||
    "0x692f212e73Aef5c81eE74e46867Ffb139Eb25555",
  v1Distributor:
    process.env.NEXT_PUBLIC_V1_DISTRIBUTOR_ADDRESS ||
    "0xe7804319Ea528CfED8C7908A4197EdE0ae44895a",
  migration:
    process.env.NEXT_PUBLIC_MIGRATION_ADDRESS ||
    "0x3bADCd1DeE2c0213EBdA77c3D243826ABFbeFa89",
  // InternRewardsRouter -- Phase 1 of letting a staker convert claimed
  // BE into a real Robinhood Stock Token. Deliberately NO hardcoded
  // fallback, unlike every address above: this contract genuinely
  // isn't deployed yet (unit-tested, not audited -- see
  // docs/rewards-router-spec.md), so leaving this unset is what keeps
  // RewardChoicePreview.js rendering its honest, non-interactive
  // preview instead of a real convert() flow. Only set this once a
  // real deployment exists and the audit gate has actually been
  // cleared -- see contracts/scripts/deploy-rewards-router-direct.js.
  rewardsRouter: process.env.NEXT_PUBLIC_REWARDS_ROUTER_ADDRESS || null,
  // BE's own token address -- genuinely never wired up before now (see
  // the 2026-09-11 investigation into why /stake's "beToken" reads
  // always came back undefined: NEXT_PUBLIC_BE_TOKEN_ADDRESS had never
  // been set in production). Harmless until now only because BE's
  // real decimals (18) happen to match useTokenDecimals' fallback --
  // but RewardChoicePreview's real convert() flow needs the actual
  // address to read balances/quotes, not just decimals, so fixing it
  // here rather than letting a second feature quietly depend on the
  // same gap. Confirmed against docs.robinhood.com/chain/contracts.
  beToken:
    process.env.NEXT_PUBLIC_BE_TOKEN_ADDRESS ||
    "0x822CC93fFD030293E9842c30BBD678F530701867",
  // USDG -- the shared quote currency every Robinhood Stock Token pool
  // is denominated in. Real, deployed, confirmed against
  // docs.robinhood.com/chain/contracts -- fine to hardcode, this site
  // doesn't own or deploy it, same as beToken above.
  usdgToken:
    process.env.NEXT_PUBLIC_USDG_TOKEN_ADDRESS ||
    "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
  // Cache's CacheVaultDeposit -- same deliberate pattern as
  // rewardsRouter above: NO hardcoded fallback. Contract is written,
  // unit-tested (19/19), and passed an in-house Slither + manual
  // review (see docs/cache-intern-spec.md), but is not yet deployed
  // anywhere. Leaving this unset is what keeps /cache rendering its
  // honest, non-interactive preview instead of a real deposit() flow.
  // Only set this once a real deployment exists on Robinhood Chain --
  // see contracts/scripts/deploy-cache-vault-deposit-direct.js.
  cacheVaultDeposit: process.env.NEXT_PUBLIC_CACHE_VAULT_ADDRESS || null,
  // The real, live Steakhouse USDG Morpho vault itself -- confirmed
  // live on Robinhood Chain 2026-09-23 (bytecode selector check +
  // live asset() read, see docs/cache-intern-spec.md). Safe to
  // hardcode: this site doesn't own or deploy it, same as usdgToken/
  // beToken above, and reading it directly (TVL, share price) doesn't
  // depend on CacheVaultDeposit being deployed at all.
  cacheVault: process.env.NEXT_PUBLIC_CACHE_VAULT_MORPHO_ADDRESS || "0xBeEff033F34C046626B8D0A041844C5d1A5409dd",
};

// Real, deployed Robinhood Stock Token addresses (confirmed against
// docs.robinhood.com/chain/contracts, the official on-chain asset
// registry, 2026-09-16) -- these exist and trade today regardless of
// whether InternRewardsRouter itself is deployed. Fine to hardcode:
// unlike rewardsRouter above, this site doesn't own or deploy these,
// it only ever reads/targets them once the router is live.
export const REWARD_TARGET_ASSETS = [
  { symbol: "BE", name: "Bloom Energy", address: CONTRACTS.beToken, isDefault: true },
  { symbol: "TSLA", name: "Tesla", address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d" },
  { symbol: "NVDA", name: "NVIDIA", address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC" },
  { symbol: "SPCX", name: "SpaceX", address: "0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa" },
];

export function isRewardsRouterLive() {
  return Boolean(CONTRACTS.rewardsRouter);
}

// Same shape as isRewardsRouterLive() above -- true only once
// CacheVaultDeposit is actually deployed and NEXT_PUBLIC_CACHE_VAULT_ADDRESS
// is set. Cache's own real Morpho vault (CONTRACTS.cacheVault) is
// always readable regardless -- this only gates the deposit() write
// flow, not the live TVL/APY preview.
export function isCacheVaultLive() {
  return Boolean(CONTRACTS.cacheVaultDeposit);
}

// Same live Uniswap V3 infra intern-burn-bot/lib/swapEthForBe.js and
// InternRewardsRouter.sol both already point at -- confirmed against
// live chain state 2026-09-16, not guessed. QUOTER_V2_ADDRESS is for
// read-only quotes only (never a real swap); BE_USDG_FEE is the real
// BE/USDG pool's fee tier, matching InternRewardsRouter's own
// immutable beUsdgFee at deployment.
export const QUOTER_V2_ADDRESS = "0x33e885eD0Ec9bF04EcfB19341582aADCb4c8A9E7";
export const BE_USDG_FEE = 3000;

// Fallback only -- MigrationBox reads claimDeadline() live from the
// contract itself. Recorded here as a sanity check: decoded 2026-09-11
// straight from the migration contract's deployed bytecode (it isn't
// verified on Blockscout, so there's no ABI to just call it normally --
// this immutable is baked into the bytecode as a raw constant) as
// 1790860124 = 2026-10-01 13:08:44 UTC.
export const MIGRATION_CLAIM_DEADLINE_FALLBACK = 1790860124;

// The burn bot sends $INTERN here via a plain transfer(), not a real
// burn() call -- so totalSupply() never moves and can't be used to
// measure burns. This dead address's own balance IS the real cumulative
// burn total. Matches DEAD_ADDRESS in intern-burn-bot/lib/config.js.
export const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";

export function isStakingLive() {
  return Boolean(CONTRACTS.internToken && CONTRACTS.distributor);
}

// Shared by api/blaze/generate/route.js (server-side enforcement) and
// video-credits/VideoCreditsView.js (client-side price preview) --
// deliberately one source of truth so the price shown before generating
// can never drift from what the server actually charges. Same 10k/100k/
// 1M thresholds already used for Rendo's daily text-gen limits and the
// stake page's TierPath, reused here rather than invented fresh.
export const VIDEO_CREDIT_TIER_DISCOUNTS = [
  { minStaked: 1_000_000, discount: 0.5 },
  { minStaked: 100_000, discount: 0.25 },
  { minStaked: 10_000, discount: 0.1 },
];

export function videoCreditDiscountForStake(stakedAmount) {
  const tier = VIDEO_CREDIT_TIER_DISCOUNTS.find((t) => stakedAmount >= t.minStaked);
  return tier?.discount ?? 0;
}

export function isTradingLive() {
  return Boolean(CONTRACTS.internToken);
}

// interndex -- $INTERN's own swap-facilitation front end (see
// interndex/InterndexView.js). Swapping itself needs no registration at
// all -- confirmed 2026-09-18 that a quote already returns a fully
// executable transaction with zero setup. These two only gate whether
// this project earns its own fee on top of a swap; that's a real
// partner registration with a real fee-collection wallet, a business
// step for the team to do, not something this code can do on its own.
// Deliberately no hardcoded fallback, same reasoning as rewardsRouter
// above: leaving this unset just means swaps run fee-free until it's
// set, never a broken or fake-fee path.
export const LIFI_INTEGRATOR_ID = process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || null;
export const LIFI_FEE_PERCENT = process.env.NEXT_PUBLIC_LIFI_FEE_PERCENT || null;

// Confirmed 2026-09-18: passing `fee` to the quote API without a real,
// registered integrator hard-rejects the whole quote (error 1011,
// "not configured for collecting fees") -- so there's no way to use
// the aggregator's own fee-sharing today. This is the workaround: take
// our own cut in whichever currency ISN'T $INTERN at the moment it
// converts, then buy back and burn with it -- real buy pressure, not
// just supply reduction (see useInterndexSwap.js's handleSwap):
//   - Buying $INTERN, or swapping between two other tokens: the input
//     already isn't $INTERN, so the cut is taken BEFORE the main swap
//     and quoted straight to $INTERN with `toAddress` set to
//     DEAD_ADDRESS -- one transaction, simultaneously the buyback and
//     the burn.
//   - Selling $INTERN: cutting the fee from the $INTERN being sold
//     would just burn supply that was leaving anyway, no real buy
//     order. So the FULL amount swaps out first, and the cut is taken
//     AFTER, as 1% of what came back -- that's what actually creates
//     buy pressure on $INTERN.
// Confirmed live 2026-09-18: a real ETH->INTERN quote with
// toAddress=dead returned a valid transactionRequest with
// action.toAddress echoing the dead address back. Either way, "fee
// eaten by holders" happens for real, immediately, without waiting on
// anyone's approval.
//
// Lowered from 100n (1%) to 20n (0.2%) 2026-09-19 to make this
// genuinely competitive as a general-purpose any-to-any swap front
// end (see INTERNDEX_CHAINS/lifiCatalog.js) rather than a 1%-fee
// funnel people would only tolerate for reaching $INTERN specifically.
export const INTERNDEX_FEE_BPS = 20n; // 0.2%, out of 10_000

// Pinned/default tokens -- not the only tokens $interndex can swap
// anymore (see lib/lifiCatalog.js: the pickers now search LI.FI's own
// live token list per chain, thousands deep), but these are what show
// up first/by default for Robinhood Chain specifically, and what the
// rest of this file's fee/burn logic reasons about directly. Native
// ETH uses LI.FI's own all-zero sentinel (see lib/lifi.js); the four
// Robinhood Stock Tokens and USDG are the same real, deployed
// addresses REWARD_TARGET_ASSETS/CONTRACTS.usdgToken already trust.
const NATIVE_SENTINEL = "0x0000000000000000000000000000000000000000";

export const INTERNDEX_TOKENS = [
  { symbol: "INTERN", name: "$INTERN", address: CONTRACTS.internToken },
  { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL },
  { symbol: "USDG", name: "USDG", address: CONTRACTS.usdgToken },
  ...REWARD_TARGET_ASSETS,
];

// Pinned/default chains -- Robinhood Chain plus the three other chains
// it officially bridges with (LI.FI/Relay/Across/Stargate all support
// routing between them and Robinhood Chain). The picker's real chain
// list comes live from lifiCatalog.js's fetchLifiChains() (70 real EVM
// chains as of 2026-09-19) -- these four just get pinned to the top
// since they're the ones $interndex's own copy/defaults talk about,
// and Robinhood Chain's token list here (INTERNDEX_TOKENS) is what the
// rest of this file's fee/burn logic reasons about directly. Every
// address below was confirmed directly against LI.FI's own /v1/tokens
// endpoint (2026-09-18), not typed from memory -- the kind of thing
// worth getting from a live source when it's a real contract address
// real money will be sent through.
export const INTERNDEX_CHAINS = [
  {
    id: 4663,
    name: "Robinhood Chain",
    tokens: INTERNDEX_TOKENS,
  },
  {
    id: 1,
    name: "Ethereum",
    tokens: [
      { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL },
      { symbol: "USDC", name: "USD Coin", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
      { symbol: "USDT", name: "Tether", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    ],
  },
  {
    id: 42161,
    name: "Arbitrum",
    tokens: [
      { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL },
      { symbol: "USDC", name: "USD Coin", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831" },
    ],
  },
  {
    id: 8453,
    name: "Base",
    tokens: [
      { symbol: "ETH", name: "Ether", address: NATIVE_SENTINEL },
      { symbol: "USDC", name: "USD Coin", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
      { symbol: "USDT", name: "Tether", address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2" },
    ],
  },
];
