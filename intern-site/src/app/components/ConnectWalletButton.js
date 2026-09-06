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
//
// Real bug found 2026-09-07 (user report: "connect wallet stopped
// working"): the old version always connected to connectors[0] and threw
// away any error from useConnect(). Anyone with more than one wallet
// extension (wagmi auto-discovers each EIP-6963 wallet as its own
// connector, on top of this generic injected() one) could silently connect
// to -- or silently fail against -- the wrong provider, with zero feedback.
// This version lists every detected connector once there's more than one,
// and always surfaces the error instead of swallowing it.
function SimpleConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error, variables } = useConnect();
  const { disconnect } = useDisconnect();

  const buttonClass =
    "font-mono text-sm font-medium px-4 py-2 rounded-xl bg-[#00C805] text-[#0B0C0B] hover:bg-[#00b304] transition-colors disabled:opacity-60";
  const outlineButtonClass =
    "font-mono text-xs font-medium px-3 py-2 rounded-xl border border-[#1B1D1B] text-[#EDEEF0] hover:border-[#00C805]/50 transition-colors disabled:opacity-60";

  if (isConnected && address) {
    return (
      <button type="button" onClick={() => disconnect()} className={buttonClass}>
        {shortenAddress(address)}
      </button>
    );
  }

  if (connectors.length === 0) {
    return (
      <a
        href="https://metamask.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClass}
      >
        Install a Wallet
      </a>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1.5">
        {connectors.length === 1 ? (
          <button
            type="button"
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isPending}
            className={buttonClass}
          >
            {isPending ? "Confirm in wallet…" : "Connect Wallet"}
          </button>
        ) : (
          connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => connect({ connector })}
              disabled={isPending}
              className={outlineButtonClass}
            >
              {isPending && variables?.connector === connector ? "Confirm…" : connector.name}
            </button>
          ))
        )}
      </div>
      {error && (
        <p className="font-mono text-[10px] text-[#E5484D] max-w-[220px] text-right leading-snug">
          {error.shortMessage || error.message}
        </p>
      )}
    </div>
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
