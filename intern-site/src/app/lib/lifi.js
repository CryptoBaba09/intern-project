import { LIFI_INTEGRATOR_ID, LIFI_FEE_PERCENT } from "./chain";

// LI.FI's public quote API -- no API key required for a quote (verified
// live 2026-09-18: a real, unauthenticated request against $INTERN on
// Robinhood Chain resolved a real route through a DEX called "fly," at
// a real price). Native ETH is represented by the all-zero address --
// LI.FI's own convention, not this project's.
const LIFI_API_URL = "https://li.quest/v1";
export const NATIVE_ETH_SENTINEL = "0x0000000000000000000000000000000000000000";
export const ROBINHOOD_CHAIN_LIFI_ID = 4663;

// Real integrator fee only applies once LIFI_INTEGRATOR_ID is set (see
// chain.js's own comment on why that stays unset until the team
// actually registers at portal.li.fi) -- an unregistered `integrator`
// string still gets a quote back, just with integratorFee forced to 0,
// so this never silently promises a fee cut that isn't real.
// `toAddress` is what makes the buyback-and-burn trick work (see
// InterndexView.js): when the fee-cut isn't already $INTERN, quoting
// fromToken -> $INTERN with toAddress set to the dead address makes
// LI.FI's own executed swap deliver straight into it -- one
// transaction that's simultaneously the buyback and the burn, not two.
// Defaults to fromAddress (the normal "send me what I'm swapping for"
// case) when omitted.
//
// fromChainId/toChainId default to Robinhood Chain -- true cross-chain
// (confirmed live 2026-09-18: a real Ethereum ETH -> Robinhood Chain
// $INTERN quote resolved via a bridge tool called "Relay," one of
// Robinhood Chain's own documented bridge partners, as a single
// signable transaction) only happens when a caller passes a different
// fromChainId, same "explicit, not assumed" default as everywhere else
// real money moves in this file.
export async function fetchInterndexQuote({
  fromToken,
  toToken,
  fromAmount,
  fromAddress,
  toAddress,
  fromChainId,
  toChainId,
}) {
  const params = new URLSearchParams({
    fromChain: String(fromChainId || ROBINHOOD_CHAIN_LIFI_ID),
    toChain: String(toChainId || ROBINHOOD_CHAIN_LIFI_ID),
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
    toAddress: toAddress || fromAddress,
    integrator: LIFI_INTEGRATOR_ID || "intern-preview",
  });
  if (LIFI_INTEGRATOR_ID && LIFI_FEE_PERCENT) {
    params.set("fee", LIFI_FEE_PERCENT);
  }

  const res = await fetch(`${LIFI_API_URL}/quote?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `LI.FI quote failed (${res.status})`);
  }
  return data;
}
