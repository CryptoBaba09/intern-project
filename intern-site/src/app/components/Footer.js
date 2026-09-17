import { PONS_TRADE_URL, GECKOTERMINAL_POOL_URL, INTERN_ADDRESS } from "../lib/pools";

// There are unrelated tokens also using the "$INTERN" ticker on Robinhood
// Chain (confirmed 2026-09-17: a different project listed on CoinGecko,
// plus a separate "Intern Cat" meme, neither affiliated with us) -- this
// bar exists so anyone can verify our actual live listings/contract in
// one click instead of trusting search results. DexScreener is left out
// on purpose: it doesn't index Robinhood Chain (see lib/pools.js).
const LIVE_ON = [
  { label: "Pons", href: PONS_TRADE_URL },
  { label: "GeckoTerminal", href: GECKOTERMINAL_POOL_URL },
  {
    label: "Blockscout",
    href: `https://robinhoodchain.blockscout.com/token/${INTERN_ADDRESS}`,
  },
];

export default function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-[var(--color-line)] mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-mono text-[10px]">
          <span className="text-[var(--color-muted)] tracking-widest shrink-0">
            VERIFIED LIVE ON
          </span>
          <div className="flex items-center gap-4 flex-wrap">
            {LIVE_ON.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
              >
                {label} ↗
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] text-[var(--color-muted-2)]">
          <p className="max-w-md leading-relaxed">
            $INTERN is a fixed-supply utility token on Robinhood Chain, live
            on Pons and quoted against ETH. This site is informational only
            and is not investment, financial, or legal advice. Staking
            involves smart contract risk. Verify every contract address on
            Blockscout before interacting with it.
          </p>
          <div className="text-left sm:text-right shrink-0">
            <p>$INTERN Family</p>
            <p>Built on ponsfamily.com</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
