"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChain } from "../lib/chain";

// WalletConnect (and wallets that connect through it) need a real project
// ID from https://cloud.reown.com (free) to work. Without a REAL one,
// RainbowKit's getDefaultConfig still tries to validate it against
// Reown's API on load and keeps retrying that failing request in the
// background (visible as recurring 403s in the console, and heavy enough
// to make the page sluggish) -- so we only use getDefaultConfig once a
// real ID is set. Until then, a minimal manual config still lets
// MetaMask and other injected wallets connect fine; only WalletConnect
// -based connections (mobile/QR, some non-injected wallets) need the
// real ID. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in Vercel once you
// have one, and this automatically upgrades to the full wallet list.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const config = projectId
  ? getDefaultConfig({
      appName: "$INTERN",
      projectId,
      chains: [robinhoodChain],
      ssr: true,
    })
  : createConfig({
      chains: [robinhoodChain],
      connectors: [injected()],
      transports: { [robinhoodChain.id]: http() },
      ssr: true,
    });

const queryClient = new QueryClient();

export default function Web3Provider({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "#00C805",
            accentColorForeground: "#0B0C0B",
            borderRadius: "medium",
            fontStack: "system",
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
