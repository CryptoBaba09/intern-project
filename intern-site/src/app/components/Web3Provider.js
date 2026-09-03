"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { robinhoodChain } from "../lib/chain";

// WalletConnect (and wallets that connect through it) need a real project
// ID from https://cloud.reown.com (free) to work -- without one, injected
// wallets like MetaMask/Coinbase's browser extension still connect fine,
// but WalletConnect-based mobile/QR connections won't. Set
// NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in Vercel once you have one.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const config = getDefaultConfig({
  appName: "$INTERN",
  projectId: projectId || "00000000000000000000000000000000",
  chains: [robinhoodChain],
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
