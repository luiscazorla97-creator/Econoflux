import {
  academyUrl,
  academyCategoryUrl,
  academyCategories,
} from "../content/academy";
import { reportingUrl } from "./confirmation";
import { SITE_ORIGIN, escapeXML as xml } from "./site";
import type { D1Database } from "@cloudflare/workers-types";
import { policyIds } from "../content/policies";

export const SITEMAP_PAGE_SIZE = 5000;
export const NEWS_SITEMAP_LIMIT = 1000;
export const NEWS_WINDOW_MS = 48 * 60 * 60 * 1000;
export interface SitemapEntry {
  path: string;
  lang: string;
  alternate?: string;
  modified?: string;
}
export interface NewsEntry {
  lang: string;
  slug: string;
  title: string;
  published_at: string;
}
type DB = Pick<D1Database, "prepare">;
export function publicDatabase(locals: any): DB {
  const db = locals.runtime?.env?.DB;
  if (!db) throw new Error("Public content database is not bound");
  return db;
}
// Public discovery follows the same complete bilingual revisions as the site.
// Candidates, private drafts, demos and incomplete pairs are never exported.
export const publicContent = (alias: string) =>
  `${alias}.visible=1 AND json_extract(${alias}.value,'$.status')='published' AND json_extract(${alias}.value,'$.demo')=0`;

export function staticSitemapEntries(
  activeGuideCategories?: ReadonlySet<string>,
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const lang of ["en", "es"] as const) {
    const other = lang === "en" ? "es" : "en";
    for (const path of [
      "",
      ...["news", "bitcoin", "ethereum", "altcoins", "defi", "markets"].map(
        (c) => `category/${c}/`,
      ),
      ...[
        "about",
        "editorial",
        "verification",
        "methodology",
        "corrections",
        "education",
        "contact",
        ...policyIds,
      ].map((p) => `${p}/`),
    ])
      entries.push({
        path: `/${lang}/${path}`,
        lang,
        alternate: `/${other}/${path}`,
      });
    entries.push(
      { path: reportingUrl(lang), lang, alternate: reportingUrl(other) },
      { path: academyUrl(lang), lang, alternate: academyUrl(other) },
    );
    for (const c of academyCategories)
      if (!activeGuideCategories || activeGuideCategories.has(c.id))
        entries.push({
          path: academyCategoryUrl(lang, c.id),
          lang,
          alternate: academyCategoryUrl(other, c.id),
        });
  }
  return entries;
}

export async function activeAcademyCategories(db: DB): Promise<Set<string>> {
  const rows = await db
    .prepare(
      `SELECT DISTINCT json_extract(p.value,'$.academyCategory') category FROM public_guides p JOIN public_guides other ON other.translation_id=p.translation_id AND other.lang<>p.lang AND other.revision=p.revision WHERE ${publicContent("p")} AND ${publicContent("other")}`,
    )
    .all<{ category: string }>();
  return new Set(rows.results.map((r) => r.category));
}

const tableFor = (kind: "articles" | "guides") =>
  kind === "articles" ? "public_articles" : "public_guides";
export async function sitemapCounts(db: DB) {
  const count = async (kind: "articles" | "guides") => {
    const table = tableFor(kind);
    return (await db
      .prepare(
        `SELECT count(*) n FROM ${table} p JOIN ${table} other ON other.translation_id=p.translation_id AND other.lang<>p.lang AND other.revision=p.revision WHERE ${publicContent("p")} AND ${publicContent("other")}`,
      )
      .first<{ n: number }>())!.n;
  };
  const [articles, guides] = await Promise.all([
    count("articles"),
    count("guides"),
  ]);
  return { articles, guides };
}
export async function contentSitemapEntries(
  db: DB,
  kind: "articles" | "guides",
  page = 1,
): Promise<SitemapEntry[]> {
  const table = tableFor(kind);
  const rows = await db
    .prepare(
      `SELECT p.lang,p.slug,p.published_at,p.updated_at,other.slug alternate_slug FROM ${table} p JOIN ${table} other ON other.translation_id=p.translation_id AND other.lang<>p.lang AND other.revision=p.revision WHERE ${publicContent("p")} AND ${publicContent("other")} ORDER BY p.published_at DESC,p.translation_id,p.lang LIMIT ? OFFSET ?`,
    )
    .bind(SITEMAP_PAGE_SIZE, (page - 1) * SITEMAP_PAGE_SIZE)
    .all<{
      lang: "en" | "es";
      slug: string;
      published_at: string;
      updated_at: string | null;
      alternate_slug: string;
    }>();
  const path = (lang: string, slug: string) =>
    kind === "articles"
      ? `/${lang}/articles/${slug}/`
      : `/${lang}/${lang === "en" ? "academy/guides" : "academia/guias"}/${slug}/`;
  return rows.results.map((r) => ({
    path: path(r.lang, r.slug),
    lang: r.lang,
    alternate: path(r.lang === "en" ? "es" : "en", r.alternate_slug),
    modified: r.updated_at || r.published_at,
  }));
}
export function sitemapXML(entries: SitemapEntry[]) {
  const unique = [...new Map(entries.map((e) => [e.path, e])).values()];
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${unique.map((e) => `<url><loc>${xml(SITE_ORIGIN + e.path)}</loc>${e.modified ? `<lastmod>${xml(e.modified)}</lastmod>` : ""}<xhtml:link rel="alternate" hreflang="${e.lang}" href="${xml(SITE_ORIGIN + e.path)}"/>${e.alternate ? `<xhtml:link rel="alternate" hreflang="${e.lang === "en" ? "es" : "en"}" href="${xml(SITE_ORIGIN + e.alternate)}"/>` : ""}<xhtml:link rel="alternate" hreflang="x-default" href="${xml(SITE_ORIGIN + (e.lang === "en" ? e.path : e.alternate || e.path))}"/></url>`).join("")}</urlset>`;
}
export function sitemapIndexXML(counts: { articles: number; guides: number }) {
  const paths = ["/sitemaps/pages-1.xml"];
  for (const kind of ["articles", "guides"] as const)
    for (let i = 1; i <= Math.ceil(counts[kind] / SITEMAP_PAGE_SIZE); i++)
      paths.push(`/sitemaps/${kind}-${i}.xml`);
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<sitemap><loc>${SITE_ORIGIN + p}</loc></sitemap>`).join("")}</sitemapindex>`;
}
export async function recentNewsEntries(
  db: DB,
  now = new Date(),
): Promise<NewsEntry[]> {
  const rows = await db
    .prepare(
      `SELECT p.lang,p.slug,json_extract(p.value,'$.title') title,p.published_at FROM public_articles p JOIN public_articles other ON other.translation_id=p.translation_id AND other.lang<>p.lang AND other.revision=p.revision WHERE ${publicContent("p")} AND ${publicContent("other")} AND coalesce(json_extract(p.value,'$.format'),'news')<>'explainer' AND p.published_at>=? AND p.published_at<=? AND length(trim(json_extract(p.value,'$.title')))>0 ORDER BY p.published_at DESC,p.translation_id,p.lang LIMIT ?`,
    )
    .bind(
      new Date(+now - NEWS_WINDOW_MS).toISOString(),
      now.toISOString(),
      NEWS_SITEMAP_LIMIT,
    )
    .all<NewsEntry>();
  return rows.results;
}
export function newsSitemapXML(entries: NewsEntry[]) {
  const eligible = [
    ...new Map(entries.map((e) => [`${e.lang}/${e.slug}`, e])).values(),
  ].slice(0, NEWS_SITEMAP_LIMIT);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${eligible.map((e) => `<url><loc>${xml(`${SITE_ORIGIN}/${e.lang}/articles/${e.slug}/`)}</loc><news:news><news:publication><news:name>EconoFlux</news:name><news:language>${e.lang}</news:language></news:publication><news:publication_date>${xml(e.published_at)}</news:publication_date><news:title>${xml(e.title)}</news:title></news:news></url>`).join("")}</urlset>`;
}
export function sitemapResponse(body: string, generatedAt = new Date()) {
  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Sitemap-Generated-At": generatedAt.toISOString(),
    },
  });
}
