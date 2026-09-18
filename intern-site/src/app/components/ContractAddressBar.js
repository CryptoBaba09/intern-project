"use client";

import { useState } from "react";
import { CONTRACTS } from "../lib/chain";

// Leading memecoin sites all do this: the contract address big, plain,
// and copyable right on the landing page -- not buried in a nav
// dropdown or a footer link -- so anyone can paste it straight into
// Pons/GeckoTerminal/Blockscout themselves instead of trusting whatever
// a search engine surfaced. Same CONTRACTS.internToken every other page
// already reads, just finally given the prominence a CA gets
// everywhere else in this category.
export default function ContractAddressBar() {
  const [copied, setCopied] = useState(false);
  const address = CONTRACTS.internToken;

  function handleCopy() {
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="w-full max-w-md">
      <p className="font-mono text-[10px] text-[var(--color-muted)] tracking-widest mb-2 text-center">
        CONTRACT ADDRESS &mdash; VERIFY IT YOURSELF
      </p>
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-4 py-3 hover:border-[var(--color-accent)]/70 transition-colors group"
      >
        <code className="flex-1 min-w-0 truncate font-mono text-sm sm:text-base text-[var(--color-fg)] text-left">
          {address}
        </code>
        <span className="shrink-0 font-mono text-[10px] font-medium text-[var(--color-accent)] border border-[var(--color-accent)]/30 rounded-lg px-2.5 py-1.5 group-hover:bg-[var(--color-accent)]/10 transition-colors">
          {copied ? "COPIED" : "COPY"}
        </span>
      </button>
    </div>
  );
}
