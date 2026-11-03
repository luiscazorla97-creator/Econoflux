import type { APIContext } from "astro";
import { isIndexableSite } from "../../lib/site";
import {
  publicDatabase,
  staticSitemapEntries,
  contentSitemapEntries,
  sitemapXML,
  sitemapResponse,
} from "../../lib/sitemaps";
export async function GET(context: APIContext) {
  const match = context.params.name?.match(
    /^(pages|articles|guides)-([1-9]\d*)$/,
  );
  if (
    !match ||
    +match[2] > 1000000 ||
    (match[1] === "pages" && match[2] !== "1")
  )
    return new Response("Not found", { status: 404 });
  if (!isIndexableSite(context.url, context.locals))
    return sitemapResponse(sitemapXML([]));
  const entries =
    match[1] === "pages"
      ? staticSitemapEntries()
      : await contentSitemapEntries(
          publicDatabase(context.locals),
          match[1] as "articles" | "guides",
          +match[2],
        );
  if (!entries.length) return new Response("Not found", { status: 404 });
  return sitemapResponse(sitemapXML(entries));
}
