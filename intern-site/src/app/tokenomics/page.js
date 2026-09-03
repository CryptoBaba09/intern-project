import TokenomicsView from "./TokenomicsView";

export const metadata = {
  title: "Tokenomics",
  description:
    "$INTERN tokenomics: fixed 100,000,000 supply, no mint function, 10,000 $INTERN burned per marketplace deploy, and a 70/20/10 creator-fee split between buy-and-burn, staker distributions, and treasury.",
};

export default function TokenomicsPage() {
  return <TokenomicsView />;
}
