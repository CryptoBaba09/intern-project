import BlazeView from "./BlazeView";

export const metadata = {
  title: "Blaze — Burn Tracker Intern",
  description:
    "The protocol's own burn engine. Real, live supply-burned numbers read straight from the dead address, plus a burn-split simulator that mirrors the actual bot logic.",
};

export default function BlazePage() {
  return <BlazeView />;
}
