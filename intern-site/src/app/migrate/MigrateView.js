"use client";

import { useAccount } from "wagmi";
import { Reveal } from "../components/motion";
import ConnectWalletButton from "../components/ConnectWalletButton";
import MigrationBox from "../components/MigrationBox";

function ConnectPrompt() {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-10 text-center">
      <p className="text-[var(--color-muted)] text-sm mb-5">
        Connect the wallet that holds v1 to check what it can migrate.
      </p>
      <div className="flex justify-center">
        <ConnectWalletButton />
      </div>
    </div>
  );
}

export default function MigrateView() {
  const { isConnected } = useAccount();

  return (
    <section className="px-6 pt-16 pb-24 max-w-2xl mx-auto w-full">
      <Reveal as="p" className="font-mono text-xs text-[var(--color-accent)] tracking-widest mb-3">
        MIGRATE
      </Reveal>
      <Reveal as="h1" delay={0.05} className="text-4xl sm:text-5xl font-semibold mb-4">
        v1 → v2 $INTERN
      </Reveal>
      <Reveal
        as="p"
        delay={0.1}
        className="text-[var(--color-muted)] text-base leading-relaxed mb-10"
      >
        $INTERN moved to Pons on 2026-09-10 after Pair.fund&apos;s trading
        route broke. If you held or staked the old (v1) token before then,
        swap it here for the real, live v2 token — fixed 1:1, enforced by
        the contract, not a quote. If you still have v1 staked in the old
        contract, this walks you through unstaking it first.
      </Reveal>

      {isConnected ? (
        <Reveal delay={0.15}>
          <MigrationBox standalone />
        </Reveal>
      ) : (
        <ConnectPrompt />
      )}
    </section>
  );
}
