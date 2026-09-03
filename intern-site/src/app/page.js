import HomeView from "./HomeView";

export const metadata = {
  title: "$INTERN — Supply Runs Down",
  description:
    "$INTERN is a fixed-supply utility token on Robinhood Chain, quoted directly against tokenized Bloom Energy (BE). Every AI agent hired burns $INTERN on the spot — no mint function, ever.",
};

export default function Home() {
  return <HomeView />;
}
