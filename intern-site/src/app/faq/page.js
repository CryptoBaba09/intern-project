import FaqView from "./FaqView";

export const metadata = {
  title: "FAQ — $INTERN",
  description:
    "Answers on $INTERN: tokenomics, the six live interns (Blaze, Rendo, Promptly, Synapse, Hush, Cache), staking, borrowing against a tokenized stock with Cache, and how to verify everything yourself.",
};

export default function FaqPage() {
  return <FaqView />;
}
