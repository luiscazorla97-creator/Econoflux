import { dayKey, dayEnd } from "./policy";
import { recentNewsEntries, publicContent } from "../../src/lib/sitemaps";
import type { Env } from "./types";

export async function seoReport(
  env: Env,
  now = new Date(),
  fetcher: typeof fetch = fetch,
) {
  const db = env.DB;
  const start = dayEnd(
    new Date(Date.parse(dayKey(now) + "T00:00:00Z") - 12 * 3600000),
  );
  const totals = await db
    .prepare(
      `SELECT count(DISTINCT p.translation_id) total_articles,count(*) total_pages,count(DISTINCT CASE WHEN p.published_at>=? AND p.published_at<? THEN p.translation_id END) published_today,count(DISTINCT CASE WHEN p.published_at>=? AND p.published_at<=? THEN p.translation_id END) published_seven_days,max(max(p.published_at,coalesce(p.updated_at,p.published_at))) last_content_change FROM public_articles p WHERE ${publicContent("p")}`,
    )
    .bind(
      start.toISOString(),
      dayEnd(now).toISOString(),
      new Date(+now - 7 * 86400000).toISOString(),
      now.toISOString(),
    )
    .first();
  const missing = await db
    .prepare(
      `SELECT count(*) n FROM public_articles p WHERE ${publicContent("p")} AND (coalesce(length(trim(json_extract(value,'$.title'))),0)=0 OR coalesce(length(trim(json_extract(value,'$.summary'))),0)=0 OR coalesce(length(trim(json_extract(value,'$.seoTitle'))),0)=0 OR coalesce(length(trim(json_extract(value,'$.seoDescription'))),0)=0 OR coalesce(length(trim(json_extract(value,'$.image.src'))),0)=0 OR coalesce(length(trim(json_extract(value,'$.image.alt'))),0)=0 OR coalesce(length(published_at),0)=0)`,
    )
    .first<{ n: number }>();
  // Match the contextual selection used by the public article component,
  // rather than mistaking an absent stored AI suggestion for an orphan page.
  const unlinked = await db
    .prepare(
      `SELECT count(*) n FROM public_articles p WHERE ${publicContent("p")} AND NOT EXISTS(SELECT 1 FROM public_articles c WHERE ${publicContent("c")} AND c.lang=p.lang AND c.translation_id<>p.translation_id AND (c.translation_id IN (SELECT value FROM json_each(p.value,'$.seo.relatedTranslationIds')) OR json_extract(c.value,'$.category')=json_extract(p.value,'$.category') OR EXISTS(SELECT 1 FROM json_each(c.value,'$.tags') a JOIN json_each(p.value,'$.tags') b ON lower(a.value)=lower(b.value))))`,
    )
    .first<{ n: number }>();
  const duplicates = await db
    .prepare(
      "SELECT count(*) n FROM (SELECT lang,slug FROM public_articles WHERE visible=1 GROUP BY lang,slug HAVING count(*)>1 UNION ALL SELECT lang,slug FROM public_guides WHERE visible=1 GROUP BY lang,slug HAVING count(*)>1)",
    )
    .first<{ n: number }>();
  const observations = await db
    .prepare(
      "SELECT count(*) checked_urls,max(checked_at) last_audit,sum(CASE WHEN status IS NULL OR status>=400 OR error IS NOT NULL THEN 1 ELSE 0 END) http_errors FROM seo_http_observations",
    )
    .first();
  const failures = (
    await db
      .prepare(
        "SELECT url,status,checked_at,error FROM seo_http_observations WHERE status IS NULL OR status>=400 OR error IS NOT NULL ORDER BY checked_at DESC LIMIT 20",
      )
      .all()
  ).results;
  const eligibleNews = await recentNewsEntries(db, now);
  const sitemapHealth = await Promise.all(
    ["/sitemap.xml", "/news-sitemap.xml"].map(async (path) => {
      const url = new URL(path, env.SITE_URL).href;
      const checkedAt = new Date().toISOString();
      try {
        const response = await fetcher(url, {
          redirect: "manual",
          signal: AbortSignal.timeout(8000),
          headers: { Accept: "application/xml" },
        });
        const body = await response.text();
        const valid =
          response.ok &&
          /application\/xml|text\/xml/i.test(
            response.headers.get("Content-Type") || "",
          ) &&
          /<(urlset|sitemapindex)\b/.test(body) &&
          (path !== "/news-sitemap.xml" ||
            body.includes(
              'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
            ));
        return {
          url,
          status: response.status,
          valid,
          checkedAt,
          generatedAt: response.headers.get("X-Sitemap-Generated-At"),
          entries: (body.match(/<loc>/g) || []).length,
        };
      } catch {
        return {
          url,
          status: null,
          valid: false,
          checkedAt,
          generatedAt: null,
          entries: null,
          error: "No se pudo completar la comprobación HTTPS",
        };
      }
    }),
  );
  return {
    generatedAt: now.toISOString(),
    timeZone: "America/New_York",
    totals,
    missingMetadataPages: missing?.n || 0,
    withoutContextualNewsLinks: unlinked?.n || 0,
    duplicateURLs: duplicates?.n || 0,
    eligibleNewsSitemapURLs: eligibleNews.length,
    observations,
    failures,
    sitemaps: sitemapHealth,
    indexation: {
      verified: false,
      message:
        "Search Console no está conectado. La accesibilidad HTTP y el sitemap no demuestran indexación en Google.",
    },
    automation: await db
      .prepare(
        "SELECT enabled,paused,poll_interval_minutes,max_per_cycle,next_review FROM automation_control WHERE id=1",
      )
      .first(),
  };
}
