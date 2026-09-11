import SynapseView from "./SynapseView";

export const metadata = {
  title: "Synapse — Research Intern",
  description:
    "Synapse maps the crew's own on-chain activity as a connectome. Click a node for the real number behind it — burned, staked, live price, and what's not built yet.",
};

export default function SynapsePage() {
  return <SynapseView />;
}
