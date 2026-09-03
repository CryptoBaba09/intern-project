"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useConnect, useDisconnect } from "wagmi";

const HAS_PROJECT_ID = Boolean(process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID);

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// RainbowKit's own <ConnectButton> only knows how to render wallets that
// were registered through its system (getDefaultConfig/connectorsForWallets).
// Without a real WalletConnect project ID we deliberately fall back to a
// bare wagmi `injected()` connector instead (see Web3Provider.js) to avoid
// re-triggering the Reown API-polling bug fixed earlier -- but that means
// RainbowKit's modal has nothing it recognizes to show, and renders an
// empty-looking dialog. This is a minimal hand-built button using wagmi's
// own hooks directly for that fallback case, so there's always a working
// connect path regardless of whether a project ID is configured yet.
function SimpleConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const buttonClass =
    "font-mono text-sm font-medium px-4 py-2 rounded-xl bg-[#00C805] text-[#0B0C0B] hover:bg-[#00b304] transition-colors disabled:opacity-60";

  if (isConnected && address) {
    return (
      <button type="button" onClick={() => disconnect()} className={buttonClass}>
        {shortenAddress(address)}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending || connectors.length === 0}
      className={buttonClass}
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

export default function ConnectWalletButton() {
  if (HAS_PROJECT_ID) {
    return (
      <ConnectButton
        showBalance={false}
        chainStatus="icon"
        accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
      />
    );
  }
  return <SimpleConnectButton />;
}
