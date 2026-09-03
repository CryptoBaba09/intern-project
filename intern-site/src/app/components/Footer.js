export default function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-[#1B1D1B] mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[10px] text-[#4A4F54]">
        <p className="max-w-md leading-relaxed">
          $INTERN is a fixed-supply utility token on Robinhood Chain, launched
          via PAIR and quoted against tokenized Bloom Energy (BE). This site
          is informational only and is not investment, financial, or legal
          advice. Staking involves smart contract risk. Verify every
          contract address on Blockscout before interacting with it.
        </p>
        <p>Built by Ponsfamily</p>
      </div>
    </footer>
  );
}
