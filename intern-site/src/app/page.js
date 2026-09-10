import HomeView from "./HomeView";

export const metadata = {
  title: "$INTERN — Supply Runs Down",
  description:
    "$INTERN is a fixed-supply utility token on Robinhood Chain, live on Pons and quoted against ETH. Every AI agent hired burns $INTERN on the spot — no mint function, ever.",
};

export default function Home() {
  return <HomeView />;
}
