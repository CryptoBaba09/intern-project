// App Router convention: becomes /robots.txt automatically. Also missing
// before this fix. Points crawlers at the new sitemap and keeps them out
// of the Next.js API routes, which return raw JSON, not a real page.
const SITE_URL = "https://internburn.xyz";

export default function robots() {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
