import type { APIContext } from "astro";
import { isIndexableSite, SITE_ORIGIN } from "../lib/site";
export function GET(context: APIContext) {
  return new Response(
    isIndexableSite(context.url, context.locals)
      ? `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /en/search/\nDisallow: /es/search/\nSitemap: ${SITE_ORIGIN}/sitemap.xml\nSitemap: ${SITE_ORIGIN}/news-sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
}
