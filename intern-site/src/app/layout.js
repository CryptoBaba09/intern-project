import "./globals.css";
import Web3Provider from "./components/Web3Provider";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import CursorGlow from "./components/CursorGlow";

// Real bug found during an SEO/social-sharing audit (2026-09-07): this was
// still the old Vercel preview URL from before internburn.xyz was live.
// metadataBase feeds every relative OG/canonical URL on the site, so this
// alone meant every shared link's rich preview -- and every canonical tag
// Google sees -- pointed at the wrong domain.
const SITE_URL = "https://internburn.xyz";
const DESCRIPTION =
  "$INTERN is a fixed-supply utility token on Robinhood Chain: every AI agent hired burns $INTERN on the spot, every creator fee claim splits 70% buy-and-burn / 20% streamed to staked $INTERN / 10% treasury. No mint function, ever.";
const OG_IMAGE = { url: "/og-image.png", width: 1200, height: 630, alt: "$INTERN — Supply Runs Down" };

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
    // Missing before this fix -- without an explicit image, a link shared
    // on X/Telegram/Discord has no guaranteed rich card at all.
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "$INTERN — Supply Runs Down",
    description: DESCRIPTION,
    images: [OG_IMAGE.url],
  },
  // PWA: lets mobile browsers offer "Add to Home Screen" as a standalone,
  // full-screen app rather than just a bookmark.
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "$INTERN",
  },
};

export const viewport = {
  themeColor: "#0B0C0B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Structured data (schema.org JSON-LD) -- this is what actually feeds
// rich results/knowledge panels, unlike meta tags which mostly just help
// the snippet Google already shows. Kept factual and minimal: no fake
// ratings, prices, or availability claims.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "$INTERN",
  url: SITE_URL,
  description: DESCRIPTION,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
