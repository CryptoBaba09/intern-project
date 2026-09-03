import DocsView from "./DocsView";

export const metadata = {
  title: "Docs",
  description:
    "$INTERN technical docs: network details, verified contract addresses on Robinhood Chain, tokenomics, and code snippets for reading on-chain state directly.",
};

export default function DocsPage() {
  return <DocsView />;
}
