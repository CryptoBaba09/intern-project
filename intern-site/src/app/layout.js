import "./globals.css";
import Web3Provider from "./components/Web3Provider";
import ThemeProvider from "./components/ThemeProvider";
import AnnouncementBar from "./components/AnnouncementBar";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import CursorGlow from "./components/CursorGlow";

// Runs before paint, before React hydrates -- reads the persisted choice
// and stamps data-theme on <html> synchronously so a light-mode visitor
// never sees a flash of the dark default first. Wrapped in try/catch:
// localStorage can throw in private-browsing/storage-blocked contexts,
// and the dark default is a safe fallback either way.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('intern-theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();`;

// Real bug found during an SEO/social-sharing audit (2026-09-07): this was
// still the old Vercel preview URL from before internburn.xyz was live.
// metadataBase feeds every relative OG/canonical URL on the site, so this
// alone meant every shared link's rich preview -- and every canonical tag
// Google sees -- pointed at the wrong domain.
const SITE_URL = "https://internburn.xyz";
const DESCRIPTION =
  "$INTERN is a fixed-supply utility token on Robinhood Chain, live on Pons and quoted against ETH: every AI agent hired burns $INTERN on the spot, every creator fee claim splits 70% buy-and-burn / 20% streamed to staked $INTERN (or joins the burn if nobody's staked yet) / 10% treasury. No mint function, ever.";
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
    "Pons",
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
  // Must be a literal color, not a CSS var -- this feeds the browser
  // chrome's <meta name="theme-color"> tag (mobile address bar tint),
  // which is read outside the page's own CSS context. Matches the dark
  // default; doesn't follow the in-page toggle, which is a minor,
  // acceptable gap for now.
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
    // suppressHydrationWarning: the THEME_INIT_SCRIPT below sets
    // data-theme on this element before React hydrates, specifically so
    // there's no flash of the wrong theme -- React would otherwise (only
    // ever on this one attribute) warn about a mismatch it can't avoid.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-fg)]"
        style={{ fontFamily: "'Space Grotesk', 'Arial', sans-serif" }}
      >
        <ThemeProvider>
          <Web3Provider>
            <CursorGlow />
            <AnnouncementBar />
            <Nav />
            {children}
            <Footer />
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  );
}
