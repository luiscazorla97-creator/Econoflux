import type { APIContext } from "astro";
import { isIndexableSite } from "../lib/site";
import {
  publicDatabase,
  recentNewsEntries,
  newsSitemapXML,
  sitemapResponse,
} from "../lib/sitemaps";
export async function GET(context: APIContext) {
  const now = new Date();
  const entries = isIndexableSite(context.url, context.locals)
    ? await recentNewsEntries(publicDatabase(context.locals), now)
    : [];
  return sitemapResponse(newsSitemapXML(entries), now);
}
