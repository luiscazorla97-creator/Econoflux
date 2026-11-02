import { allPublicGuidePaths } from "../lib/academy";
import {
  academyUrl,
  academyCategoryUrl,
  academyCategories,
  guideUrl,
} from "../content/academy";
import type { APIContext } from "astro";
import { allPublicPaths } from "../lib/live-content";
import { isIndexableSite, SITE_ORIGIN, escapeXML as xml } from "../lib/site";
export async function GET(context: APIContext) {
  const entries: {
    path: string;
    lang: string;
    alternate?: string;
    modified?: string;
  }[] = [];
  if (isIndexableSite(context.url, context.locals)) {
    for (const lang of ["en", "es"] as const) {
      const other = lang === "en" ? "es" : "en";
      for (const path of [
        "",
        ...[
          "news",
          "bitcoin",
          "ethereum",
          "altcoins",
          "defi",
          "markets",
          "learn",
        ].map((c) => `category/${c}/`),
        "about/",
        "editorial/",
        "verification/",
        "methodology/",
        "corrections/",
        "education/",
        "contact/",
      ])
        entries.push({
          path: `/${lang}/${path}`,
          lang,
          alternate: `/${other}/${path}`,
        });
    }
    for (const lang of ["en", "es"] as const) {
      const other = lang === "en" ? "es" : "en";
      entries.push({
        path: academyUrl(lang),
        lang,
        alternate: academyUrl(other),
      });
      for (const c of academyCategories)
        entries.push({
          path: academyCategoryUrl(lang, c.id),
          lang,
          alternate: academyCategoryUrl(other, c.id),
        });
    }
    const guides = await allPublicGuidePaths(context.locals);
    for (const g of guides) {
      const other = guides.find(
        (b) => b.translation_id === g.translation_id && b.lang !== g.lang,
      );
      entries.push({
        path: guideUrl(g),
        lang: g.lang,
        alternate: other ? guideUrl(other) : undefined,
        modified: g.updated_at || g.published_at,
      });
    }
    const articles = await allPublicPaths(context.locals);
    for (const a of articles) {
      const other = articles.find(
        (b) => b.translation_id === a.translation_id && b.lang !== a.lang,
      );
      entries.push({
        path: `/${a.lang}/articles/${a.slug}/`,
        lang: a.lang,
        alternate: other ? `/${other.lang}/articles/${other.slug}/` : undefined,
        modified: a.updated_at || a.published_at,
      });
    }
  }
  const body = entries
    .map(
      (a) =>
        `<url><loc>${xml(SITE_ORIGIN + a.path)}</loc>${a.modified ? `<lastmod>${xml(a.modified)}</lastmod>` : ""}<xhtml:link rel="alternate" hreflang="${a.lang}" href="${xml(SITE_ORIGIN + a.path)}"/>${a.alternate ? `<xhtml:link rel="alternate" hreflang="${a.lang === "en" ? "es" : "en"}" href="${xml(SITE_ORIGIN + a.alternate)}"/>` : ""}</url>`,
    )
    .join("");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
}
