import type { APIContext } from "astro";
import { isIndexableSite } from "../lib/site";
import {
  staticSitemapEntries,
  sitemapCounts,
  contentSitemapEntries,
  sitemapXML,
  sitemapIndexXML,
  sitemapResponse,
  SITEMAP_PAGE_SIZE,
  publicDatabase,
} from "../lib/sitemaps";
export async function GET(context: APIContext) {
  if (!isIndexableSite(context.url, context.locals))
    return sitemapResponse(sitemapXML([]));
  const db = publicDatabase(context.locals);
  const counts = await sitemapCounts(db);
  const pages = staticSitemapEntries();
  if (counts.articles + counts.guides + pages.length > SITEMAP_PAGE_SIZE)
    return sitemapResponse(sitemapIndexXML(counts));
  const [articles, guides] = await Promise.all([
    contentSitemapEntries(db, "articles"),
    contentSitemapEntries(db, "guides"),
  ]);
  return sitemapResponse(sitemapXML([...pages, ...articles, ...guides]));
}
