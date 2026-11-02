import { visibleArticles, type Article } from "../content/articles";
import { validatePublished } from "./published";
import { launchEnabled } from "./site";
interface Statement {
  bind(...values: unknown[]): Statement;
  all<T>(): Promise<{ results: T[] }>;
}
interface ReadDB {
  prepare(sql: string): Statement;
}
interface Options {
  lang?: string;
  slug?: string;
  category?: string;
  q?: string;
  page?: number;
}
export async function publicArticles(
  locals: any,
  options: Options = {},
): Promise<Article[]> {
  const legacy = visibleArticles.filter(
    (article) =>
      !article.demo ||
      (!launchEnabled(locals) &&
        locals.runtime?.env?.SHOW_DEMO_CONTENT === "true") ||
      import.meta.env.DEV,
  );
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) {
    if (import.meta.env.DEV) return legacy;
    throw new Error("Public content database is not bound");
  }
  const filters = ["visible=1"];
  const args: unknown[] = [];
  if (options.lang) {
    filters.push("lang=?");
    args.push(options.lang);
  }
  if (options.category === "rumors")
    filters.push(
      "(json_extract(value,'$.confirmation.status') IN ('rumor','leak') OR json_extract(value,'$.confirmation.originStatus') IN ('rumor','leak'))",
    );
  else if (options.category && !["news", "learn"].includes(options.category)) {
    filters.push("json_extract(value,'$.category')=?");
    args.push(options.category);
  }
  if (options.q) {
    filters.push("lower(value) LIKE ? ESCAPE '\\'");
    args.push(
      "%" + options.q.toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c) + "%",
    );
  }
  const offset =
    (Math.max(1, Math.min(10000, Math.floor(options.page || 1))) - 1) * 12;
  let sql = `SELECT value FROM public_articles p WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_articles WHERE ${filters.join(" AND ")} GROUP BY translation_id ORDER BY published_at DESC LIMIT 12 OFFSET ?) `;
  args.push(offset);
  if (options.slug && options.lang) {
    sql +=
      " OR (visible=1 AND translation_id IN (SELECT translation_id FROM public_articles WHERE slug=? AND lang=?)) ";
    args.push(options.slug, options.lang);
  }
  sql += " ORDER BY published_at DESC";
  let rows: { results: { value: string }[] };
  try {
    rows = await db
      .prepare(sql)
      .bind(...args)
      .all<{ value: string }>();
  } catch (error) {
    if (import.meta.env.DEV) return legacy;
    throw error;
  }
  const live = validatePublished(rows.results.map((r) => JSON.parse(r.value)));
  // Stored illustrations are shared by both translations. This reads D1 only;
  // visits never trigger licensing checks, image generation or provider calls.
  if (live.length) {
    try {
      const ids = [...new Set(live.map((a) => a.translationId))];
      const assets = await db
        .prepare(
          `SELECT event_id,public_path,credit_en,credit_es,alt_en,alt_es,width,height,source_url,license,creator,social_path,thumbnail_path,license_url FROM editorial_assets WHERE ready=1 AND event_id IN (${ids.map(() => "?").join(",")})`,
        )
        .bind(...ids)
        .all<any>();
      for (const a of live) {
        const asset = assets.results.find(
          (asset: any) => asset.event_id === a.translationId,
        );
        if (asset)
          a.image = {
            ...a.image,
            ...(asset.public_path !== a.image.src
              ? {
                  srcSet: undefined,
                  socialSrc: undefined,
                  socialWidth: undefined,
                  socialHeight: undefined,
                }
              : {}),
            src: asset.public_path,
            alt: a.lang === "en" ? asset.alt_en : asset.alt_es,
            credit: a.lang === "en" ? asset.credit_en : asset.credit_es,
            width: asset.width,
            height: asset.height,
            ...(asset.social_path
              ? {
                  socialSrc: asset.social_path,
                  socialWidth: 1200,
                  socialHeight: 630,
                }
              : {}),
            ...(asset.thumbnail_path
              ? {
                  srcSet:
                    asset.thumbnail_path +
                    " 768w, " +
                    asset.public_path +
                    " " +
                    asset.width +
                    "w",
                }
              : {}),
            ...(asset.source_url ? { sourceUrl: asset.source_url } : {}),
            license: asset.license,
            licenseUrl: asset.license_url || undefined,
            creator: asset.creator,
          };
      }
    } catch {
      /* A secondary image lookup never interrupts an article. */
    }
  }
  const existing = new Set(live.map((a) => a.lang + "/" + a.slug));
  return [
    ...live,
    ...legacy.filter((a) => !existing.has(a.lang + "/" + a.slug)),
  ];
}
export async function allPublicPaths(locals: any) {
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) throw new Error("Database not configured");
  return (
    await db
      .prepare(
        "SELECT translation_id,lang,slug,updated_at,published_at FROM public_articles WHERE visible=1 ORDER BY published_at DESC",
      )
      .all<{
        translation_id: string;
        lang: string;
        slug: string;
        updated_at: string | null;
        published_at: string;
      }>()
  ).results;
}

export async function relatedArticles(
  locals: any,
  article: Article,
): Promise<Article[]> {
  const ids = (article.seo?.relatedTranslationIds || [])
    .filter((id) => id !== article.translationId)
    .slice(0, 3);
  if (!ids.length) return [];
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT value FROM public_articles WHERE visible=1 AND translation_id IN (${ids.map(() => "?").join(",")}) ORDER BY published_at DESC`,
    )
    .bind(...ids)
    .all<{ value: string }>();
  return validatePublished(rows.results.map((r) => JSON.parse(r.value))).filter(
    (a) => a.lang === article.lang,
  );
}
