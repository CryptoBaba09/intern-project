"use client";

import { useEffect, useRef, useState } from "react";
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
//
// First fix listed every connector as its own inline button -- fine with
// two wallets, broken with seven (real case: a wallet with Rabby, Phantom,
// Keplr, Utila, OKX, MetaMask, etc. all installed overflowed the nav bar
// and got clipped). This is a proper dropdown instead: one button, a menu
// on click, closes on an outside click, and still always surfaces errors.
function SimpleConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error, variables } = useConnect();
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  const buttonClass =
    "font-mono text-sm font-medium px-4 py-2 rounded-xl bg-[#00C805] text-[#0B0C0B] hover:bg-[#00b304] transition-colors disabled:opacity-60";

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

  function handleConnect(connector) {
    setOpen(false);
    connect({ connector });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() =>
          connectors.length === 1 ? handleConnect(connectors[0]) : setOpen((v) => !v)
        }
        disabled={isPending}
        className={buttonClass}
      >
        {isPending ? "Confirm in wallet…" : "Connect Wallet"}
      </button>

      {open && connectors.length > 1 && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-[#1B1D1B] bg-[#0F1113] shadow-lg py-1.5 z-50">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              type="button"
              onClick={() => handleConnect(connector)}
              disabled={isPending}
              className="w-full text-left font-mono text-xs px-3.5 py-2.5 text-[#EDEEF0] hover:bg-white/[0.06] transition-colors disabled:opacity-60"
            >
              {isPending && variables?.connector === connector ? "Confirm in wallet…" : connector.name}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full mt-1 font-mono text-[10px] text-[#E5484D] w-48 text-right leading-snug">
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
