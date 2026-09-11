"use client";

import "@rainbow-me/rainbowkit/styles.css";
import {
  connectorsForWallets,
  RainbowKitProvider,
  darkTheme,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rabbyWallet,
  phantomWallet,
  coinbaseWallet,
  trustWallet,
  binanceWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { robinhoodChain } from "../lib/chain";

// WalletConnect (and several of the branded wallets below, which fall back
// to it for mobile/QR connections) need a real project ID from
// https://cloud.reown.com (free, ~2 minutes) to work. Without a REAL one,
// initializing them still tries to validate the ID against Reown's API on
// load and keeps retrying that failing request in the background (visible
// as recurring 403s in the console, and heavy enough to make the page
// sluggish) -- so the full branded wallet list only turns on once a real
// ID is set. Until then, a single generic "injected" connector still lets
// whatever wallet extension is active (MetaMask, Rabby, Phantom's EVM
// mode, Coinbase's extension, etc.) connect fine, just without its own
// icon/branding in the picker. Set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in
// Vercel to upgrade automatically.
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const config = projectId
  ? createConfig({
      chains: [robinhoodChain],
      connectors: connectorsForWallets(
        [
          {
            groupName: "Popular",
            wallets: [
              metaMaskWallet,
              rabbyWallet,
              phantomWallet,
              coinbaseWallet,
              trustWallet,
              binanceWallet,
              walletConnectWallet,
              injectedWallet,
            ],
          },
        ],
        { appName: "$INTERN", projectId }
      ),
      transports: { [robinhoodChain.id]: http() },
      ssr: true,
    })
  : createConfig({
      chains: [robinhoodChain],
      connectors: [injected()],
      transports: { [robinhoodChain.id]: http() },
      ssr: true,
    });

const queryClient = new QueryClient();

const RAINBOWKIT_THEME = darkTheme({
  accentColor: "var(--color-accent)",
  // Fixed dark, same as the site's own accent-background buttons (see
  // --color-accent-foreground in globals.css) -- contrast is against
  // the green accent, not the page background.
  accentColorForeground: "var(--color-accent-foreground)",
  borderRadius: "medium",
  fontStack: "system",
});

export default function Web3Provider({ children }) {
  // The wallet-connect modal is RainbowKit's own portal, styled
  // independently of our page CSS -- the site has no light mode, so this
  // is always the dark preset, not something read from a toggle.
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={RAINBOWKIT_THEME}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
