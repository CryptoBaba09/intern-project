import TradeView from "./TradeView";

export const metadata = {
  title: "Trade",
  description:
    "Buy or sell $INTERN on Pons, paired against ETH on Robinhood Chain — non-custodial, straight from your wallet.",
};

export default function TradePage() {
  return <TradeView />;
}
