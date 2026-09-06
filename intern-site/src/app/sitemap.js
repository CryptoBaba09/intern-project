// Next.js App Router convention: this file becomes /sitemap.xml
// automatically. Was missing entirely before this fix -- search engines
// had no explicit page list to crawl, just whatever links they happened
// to follow from the homepage.
const SITE_URL = "https://internburn.xyz";

const ROUTES = [
  { path: "/", priority: 1.0, changeFrequency: "daily" },
  { path: "/trade", priority: 0.9, changeFrequency: "daily" },
  { path: "/stake", priority: 0.9, changeFrequency: "daily" },
  { path: "/tokenomics", priority: 0.8, changeFrequency: "weekly" },
  { path: "/marketplace", priority: 0.8, changeFrequency: "weekly" },
  { path: "/roadmap", priority: 0.7, changeFrequency: "weekly" },
  { path: "/genesis", priority: 0.7, changeFrequency: "daily" },
  { path: "/personas", priority: 0.5, changeFrequency: "monthly" },
  { path: "/inference-credits", priority: 0.5, changeFrequency: "monthly" },
  { path: "/docs", priority: 0.5, changeFrequency: "monthly" },
];

export default function sitemap() {
  const now = new Date();
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
