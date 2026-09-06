import TradeView from "./TradeView";

export const metadata = {
  title: "Trade",
  description:
    "Buy or sell $INTERN directly against PAIR's locked Uniswap V4 pools on Robinhood Chain, quoted in BE or USDG — non-custodial, straight from your wallet.",
};

export default function TradePage() {
  return <TradeView />;
}
