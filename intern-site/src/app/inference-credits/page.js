import InferenceCreditsView from "./InferenceCreditsView";

// Dedicated OG/Twitter card instead of inheriting the site-wide default
// (see layout.js's OG_IMAGE) -- this page's actual hook is "no email, no
// account, no wallet-to-key record kept," which the generic brand card
// doesn't communicate. Built via branding/og-image-promptly.html; bump
// the filename if the content changes (see layout.js's own comment on
// why -- X caches link-preview images by URL indefinitely).
const OG_IMAGE = {
  url: "/og-image-promptly.png",
  width: 1200,
  height: 739,
  alt: "Burn $INTERN. Get real AI credit. No email, no account, no wallet-to-key record kept.",
};

export const metadata = {
  title: "Inference Credits",
  description:
    "Burn $INTERN for a real, spend-capped OpenRouter credit top-up — live today. Staked $INTERN earning a pro-rata share of a treasury-funded credit pool is still in design.",
  openGraph: { images: [OG_IMAGE] },
  twitter: { images: [OG_IMAGE.url] },
};

export default function InferenceCreditsPage() {
  return <InferenceCreditsView />;
}
