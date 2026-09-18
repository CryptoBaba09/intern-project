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
export async function fetchInterndexQuote({ fromToken, toToken, fromAmount, fromAddress }) {
  const params = new URLSearchParams({
    fromChain: String(ROBINHOOD_CHAIN_LIFI_ID),
    toChain: String(ROBINHOOD_CHAIN_LIFI_ID),
    fromToken,
    toToken,
    fromAmount,
    fromAddress,
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
