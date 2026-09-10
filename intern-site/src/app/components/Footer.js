export default function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-[var(--color-line)] mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] text-[var(--color-muted-2)]">
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
    </footer>
  );
}
