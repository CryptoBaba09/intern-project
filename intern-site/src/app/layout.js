import "./globals.css";
import Web3Provider from "./components/Web3Provider";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import CursorGlow from "./components/CursorGlow";

const SITE_URL = "https://intern-project-red-eta.vercel.app";
const DESCRIPTION =
  "$INTERN is a fixed-supply utility token on Robinhood Chain: every AI agent hired burns $INTERN on the spot, every creator fee claim splits 70% buy-and-burn / 20% streamed to staked $INTERN / 10% treasury. No mint function, ever.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "$INTERN — Supply Runs Down",
    template: "%s | $INTERN",
  },
  description: DESCRIPTION,
  keywords: [
    "$INTERN",
    "Robinhood Chain",
    "PAIR",
    "Bloom Energy",
    "BE token",
    "staking",
    "token burn",
    "AI agents crypto",
  ],
  openGraph: {
    title: "$INTERN — Supply Runs Down",
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "$INTERN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "$INTERN — Supply Runs Down",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="min-h-full flex flex-col bg-[#0B0C0B] text-[#EDEEF0]"
        style={{ fontFamily: "'Space Grotesk', 'Arial', sans-serif" }}
      >
        <Web3Provider>
          <CursorGlow />
          <Nav />
          {children}
          <Footer />
        </Web3Provider>
      </body>
    </html>
  );
}
