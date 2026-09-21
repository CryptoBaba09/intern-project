import TradeView from "./TradeView";

export const metadata = {
  title: "Buy $INTERN — Live Price on Robinhood Chain",
  description:
    "Buy or sell $INTERN on Pons, paired against ETH on Robinhood Chain — non-custodial, straight from your wallet.",
};

export default function TradePage() {
  return <TradeView />;
}
