"use client";

// Phase 1 of letting a staker choose what their claimed BE becomes --
// see docs/rewards-router-spec.md and
// contracts/contracts/InternRewardsRouter.sol. Deliberately a PREVIEW,
// not a live feature: the router contract exists and is unit-tested
// (against a mock swap router -- Uniswap's own AMM math is out of
// scope for those tests, deliberately) but isn't deployed, same
// "unit-tested but not audited" gate as everything else this site
// discloses before real value moves through new code. Real liquidity
// for every asset below was checked directly against live chain state
// (GeckoTerminal + Robinhood's own token-contract registry) on
// 2026-09-16 -- this isn't a wishlist, it's already tradeable.
const ASSETS = [
  { symbol: "BE", name: "Bloom Energy", isDefault: true },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "SPCX", name: "SpaceX" },
];

export default function RewardChoicePreview() {
  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          CHOOSE YOUR REWARD · PREVIEW
        </p>
        <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2 py-0.5 tracking-widest shrink-0">
          NOT LIVE
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {ASSETS.map((a) => (
          <div
            key={a.symbol}
            className={`rounded-xl border p-3 text-center ${
              a.isDefault
                ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                : "border-[var(--color-line)] opacity-80"
            }`}
          >
            <p className="font-mono text-sm text-[var(--color-accent)]">{a.symbol}</p>
            <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-1 leading-tight">
              {a.name}
            </p>
          </div>
        ))}
      </div>

      <p className="font-mono text-xs text-[var(--color-fg)] text-center">
        Claim your earned BE as BE — or convert it into a real, live
        Robinhood Stock Token instead. Same claim, your choice of shape.
      </p>
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-3 leading-relaxed text-center">
        Real, tradeable liquidity already exists for every asset above —
        checked directly on-chain, not a wishlist. The conversion
        contract exists and is unit-tested, waiting on a security review
        before any real BE flows through it.
      </p>
    </div>
  );
}
