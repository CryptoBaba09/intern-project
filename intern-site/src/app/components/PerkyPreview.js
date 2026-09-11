"use client";

// Perky ("Rewards Intern") -- see docs/loyalty-rewards-spec.md and
// contracts/contracts/InternLoyaltyRewards.sol. Deliberately a PREVIEW,
// not a live feature: the contract exists (unit-tested, including a
// test that demonstrates its own known, disclosed gaming vector) but
// is NOT deployed, per the spec's own "Suggested sequencing" --
// InternStakingRewards (the contract this reads staked balances from)
// needs a professional security audit first, and doesn't have one yet.
// This shows what tier a wallet WOULD unlock, nothing more -- no BE is
// distributed through this today.
const TIERS = [
  { name: "Intern", min: 10_000, weight: "1x" },
  { name: "Senior Intern", min: 100_000, weight: "1.5x" },
  { name: "Full-Time Offer", min: 1_000_000, weight: "2x" },
];

function tierFor(staked) {
  if (staked === null) return null;
  return [...TIERS].reverse().find((t) => staked >= t.min) ?? null;
}

export default function PerkyPreview({ staked }) {
  const tier = tierFor(staked);

  return (
    <div className="border border-[var(--color-line)] rounded-2xl bg-[var(--color-surface)] p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs text-[var(--color-muted)] tracking-wide">
          PERKY · LOYALTY BONUS PREVIEW
        </p>
        <span className="font-mono text-[10px] text-[var(--color-ember)] border border-[var(--color-ember)]/30 rounded-full px-2 py-0.5 tracking-widest shrink-0">
          NOT LIVE
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {TIERS.map((t) => {
          const active = tier?.name === t.name;
          return (
            <div
              key={t.name}
              className={`rounded-xl border p-3 text-center ${
                active
                  ? "border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10"
                  : "border-[var(--color-line)] opacity-60"
              }`}
            >
              <p className="font-mono text-[10px] text-[var(--color-fg)] leading-tight">{t.name}</p>
              <p className="font-mono text-lg text-[var(--color-accent)] mt-1">{t.weight}</p>
              <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-1">
                {t.min.toLocaleString()}+ staked
              </p>
            </div>
          );
        })}
      </div>

      <p className="font-mono text-xs text-[var(--color-fg)] text-center">
        {staked === null
          ? "Connect a wallet to see your real tier."
          : tier
            ? `You'd unlock ${tier.weight} weight — but the contract funding this bonus isn't deployed yet.`
            : "Stake 10,000+ $INTERN to see a tier here."}
      </p>
      <p className="font-mono text-[9px] text-[var(--color-muted-2)] mt-3 leading-relaxed text-center">
        Real contract exists and is unit-tested (including a test that
        proves its own known tier-gaming gap, not just asserts it's
        fine) — waiting on InternStakingRewards&apos; own security audit
        before any real BE flows through it.
      </p>
    </div>
  );
}
