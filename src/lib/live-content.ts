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
function listingFilters(options: Options) {
  const filters = [
    "visible=1",
    "json_extract(value,'$.status')='published'",
    "json_extract(value,'$.demo')=0",
  ];
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
  return { filters, args };
}
export async function publicArticleCount(locals: any, options: Options = {}) {
  const db = locals.runtime?.env?.DB;
  if (!db) throw new Error("Public content database is not bound");
  const { filters, args } = listingFilters(options);
  const result = await db
    .prepare(
      `SELECT count(DISTINCT translation_id) n FROM public_articles WHERE ${filters.join(" AND ")}`,
    )
    .bind(...args)
    .first();
  return Number(result?.n || 0);
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
  const { filters, args } = listingFilters(options);
  const offset =
    (Math.max(1, Math.min(10000, Math.floor(options.page || 1))) - 1) * 12;
  // A translation ID is already unique within one language. Avoid grouping
  // the entire archive before LIMIT when an indexed language page suffices.
  const grouping = options.lang ? "" : "GROUP BY translation_id";
  let sql: string;
  if (options.slug && options.lang) {
    // Article rendering needs its own complete pair, not the twelve newest
    // unrelated stories. Related links are queried separately below.
    sql = `SELECT value FROM public_articles p WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_articles WHERE ${filters.join(" AND ")} AND slug=?) `;
    args.push(options.slug);
  } else {
    sql = `SELECT value FROM public_articles p WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_articles WHERE ${filters.join(" AND ")} ${grouping} ORDER BY published_at DESC,translation_id LIMIT 12 OFFSET ?) `;
    args.push(offset);
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
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) return [];
  const rows = await db
    .prepare(
      `SELECT pair.value FROM public_articles pair WHERE pair.visible=1 AND pair.translation_id IN (SELECT p.translation_id FROM public_articles p WHERE p.lang=? AND p.visible=1 AND p.translation_id<>? AND json_extract(p.value,'$.status')='published' AND json_extract(p.value,'$.demo')=0 AND EXISTS(SELECT 1 FROM public_articles other WHERE other.translation_id=p.translation_id AND other.lang<>p.lang AND other.visible=1 AND other.revision=p.revision AND json_extract(other.value,'$.status')='published' AND json_extract(other.value,'$.demo')=0) AND (p.translation_id IN (SELECT value FROM json_each(?)) OR json_extract(p.value,'$.category')=? OR EXISTS(SELECT 1 FROM json_each(p.value,'$.tags') tag JOIN json_each(?) wanted ON lower(tag.value)=lower(wanted.value))) ORDER BY (p.translation_id IN (SELECT value FROM json_each(?))) DESC,(SELECT count(*) FROM json_each(p.value,'$.tags') tag JOIN json_each(?) wanted ON lower(tag.value)=lower(wanted.value)) DESC,p.published_at DESC LIMIT 3) ORDER BY pair.published_at DESC`,
    )
    .bind(
      article.lang,
      article.translationId,
      JSON.stringify(ids),
      article.category,
      JSON.stringify(article.tags),
      JSON.stringify(ids),
      JSON.stringify(article.tags),
    )
    .all<{ value: string }>();
  return validatePublished(rows.results.map((r) => JSON.parse(r.value)))
    .filter((a) => a.lang === article.lang)
    .slice(0, 3);
}
