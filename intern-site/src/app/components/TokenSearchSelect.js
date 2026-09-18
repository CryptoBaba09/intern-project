"use client";

// Search-as-you-type token picker -- a plain <select> stops being
// usable once a chain's token list is thousands deep (Ethereum alone
// has 5800+ on LI.FI's own catalog, see lib/lifiCatalog.js), and this
// is real money moving to whatever address gets clicked, so showing
// the token's full name next to its symbol matters: a token list this
// size has real same-symbol collisions (multiple unrelated tokens all
// calling themselves "USDC" is expected), and picking by symbol alone
// invites picking the wrong one.
import { useEffect, useRef, useState } from "react";

export default function TokenSearchSelect({ tokens, selected, onSelect, disabled, loading }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = (
    q
      ? tokens.filter((t) => t.symbol?.toLowerCase().includes(q) || t.name?.toLowerCase().includes(q))
      : tokens
  ).slice(0, 40);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="font-mono text-sm font-medium text-[var(--color-fg)] flex items-center gap-1 disabled:opacity-50"
      >
        {selected?.symbol || "Select"}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden>
          <path d="M1.5 3.5L5 7L8.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-64 max-h-80 flex flex-col rounded-xl border border-[var(--color-line)] bg-[var(--color-bg)] shadow-xl z-20 overflow-hidden">
          <input
            autoFocus
            type="text"
            placeholder="search token or paste name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[var(--color-surface)] border-b border-[var(--color-line)] px-3 py-2 text-xs font-mono outline-none"
          />
          <div className="overflow-y-auto py-1">
            {loading && (
              <p className="font-mono text-[10px] text-[var(--color-muted-2)] px-3 py-2">loading tokens…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="font-mono text-[10px] text-[var(--color-muted-2)] px-3 py-2">no matches</p>
            )}
            {filtered.map((t) => (
              <button
                key={t.address}
                type="button"
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 font-mono text-xs text-[var(--color-fg)] hover:bg-white/[0.06] flex items-center justify-between gap-3"
              >
                <span className="shrink-0">{t.symbol}</span>
                <span className="text-[var(--color-muted-2)] truncate">{t.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
