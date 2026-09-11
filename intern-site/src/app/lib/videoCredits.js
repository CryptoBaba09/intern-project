// Blaze v1: video-credit ledger for the "burn $INTERN -> generate real
// video on-site" flow. Deliberately mirrors Promptly's redeemedTxHashes /
// openRouterKeyByAddress split (see api/promptly/topup/route.js) --
// same shape, same disclosed limitation: in-memory only, no database
// wired up yet, resets on every cold start/redeploy and isn't shared
// across concurrent serverless instances. The burn itself is irreversible
// and permanent on-chain regardless of what this process remembers, so a
// "lost" balance means contacting the team to reconcile from burn tx
// hashes, not a loss of the underlying $INTERN.
//
// Unlike Promptly (which hands the user a real third-party OpenRouter
// key), Runway and HeyGen don't offer customer-scoped, spend-capped API
// keys the way OpenRouter does -- there's no equivalent product to
// provision per wallet. So Blaze keeps the credit server-side instead:
// burn $INTERN -> USD balance in this ledger -> the SITE's own Runway/
// HeyGen key spends against that balance on the user's behalf, per the
// original ask ("website being able for a user to input the credits/key
// and generate content using our own website").

const redeemedTxHashes = new Set();
const balanceByAddress = new Map(); // lowercase address -> USD balance

export function isBurnRedeemed(txHash) {
  return redeemedTxHashes.has(txHash.toLowerCase());
}

export function markBurnRedeemed(txHash) {
  redeemedTxHashes.add(txHash.toLowerCase());
}

export function getBalanceUsd(address) {
  return balanceByAddress.get(address.toLowerCase()) ?? 0;
}

export function creditUsd(address, amountUsd) {
  const key = address.toLowerCase();
  const next = (balanceByAddress.get(key) ?? 0) + amountUsd;
  balanceByAddress.set(key, next);
  return next;
}

// Throws rather than silently flooring at 0 -- callers must check
// getBalanceUsd() first and surface an honest "insufficient credit"
// error instead of letting a debit go negative.
export function debitUsd(address, amountUsd) {
  const key = address.toLowerCase();
  const current = balanceByAddress.get(key) ?? 0;
  if (current < amountUsd) {
    throw new Error("Insufficient video credit.");
  }
  const next = current - amountUsd;
  balanceByAddress.set(key, next);
  return next;
}

// Debited at job submission, not on confirmed success. api/blaze/generate's
// POST handler now refunds via creditUsd() when the Runway/HeyGen submit
// call itself throws (rejected request, provider outage, etc.) -- see the
// "No eligible model" bug this closed on 2026-09-11, real request
// zp8t5-1789117089311-ad0868abfb0a, where a broken router config debited
// a user's credit for a generation that never ran.
//
// Real remaining gap: a job that's ACCEPTED at submission but fails later
// on the provider's own side (after this route already returned 200) is
// NOT refunded -- that needs a job-status webhook or a reconciliation
// pass this codebase doesn't have yet. Worth fixing before this leaves
// beta; flagged here rather than silently left as a surprise.
export const REFUND_ON_FAILURE_IMPLEMENTED = "submission-time only";
