import { visibleArticles, type Article } from "../content/articles";
import { validatePublished } from "./published";
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
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) {
    if (import.meta.env.DEV) return visibleArticles;
    throw new Error("Public content database is not bound");
  }
  const filters = ["visible=1"];
  const args: unknown[] = [];
  if (options.lang) {
    filters.push("lang=?");
    args.push(options.lang);
  }
  if (options.category && !["news", "learn"].includes(options.category)) {
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
    if (import.meta.env.DEV) return visibleArticles;
    throw error;
  }
  const live = validatePublished(rows.results.map((r) => JSON.parse(r.value)));
  const existing = new Set(live.map((a) => a.lang + "/" + a.slug));
  return [
    ...live,
    ...visibleArticles.filter((a) => !existing.has(a.lang + "/" + a.slug)),
  ];
}
export async function allPublicPaths(locals: any) {
  const db: ReadDB | undefined = locals.runtime?.env?.DB;
  if (!db) throw new Error("Database not configured");
  return (
    await db
      .prepare(
        "SELECT lang,slug,updated_at,published_at FROM public_articles WHERE visible=1 ORDER BY published_at DESC",
      )
      .all<{
        lang: string;
        slug: string;
        updated_at: string | null;
        published_at: string;
      }>()
  ).results;
}
