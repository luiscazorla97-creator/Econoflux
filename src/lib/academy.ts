import { launchEnabled } from "./site";
import { validatePublished } from "./published";
import type { Article } from "../content/articles";
import {
  academyCategories,
  academyConnections,
  type Guide,
} from "../content/academy";
import type { Lang } from "./i18n";

export async function publicGuides(
  locals: any,
  options: {
    lang?: string;
    slug?: string;
    category?: string;
    ids?: string[];
    q?: string;
    page?: number;
  } = {},
): Promise<Guide[]> {
  if (
    locals.runtime?.env?.SHOW_DEMO_CONTENT === "true" &&
    !launchEnabled(locals)
  )
    return [];
  const db = locals.runtime?.env?.DB;
  if (!db) {
    if (import.meta.env.DEV) return [];
    throw new Error("Academy database not bound");
  }
  const filters = ["visible=1"],
    args: unknown[] = [];
  if (options.lang) {
    filters.push("lang=?");
    args.push(options.lang);
  }
  if (options.slug) {
    filters.push("slug=?");
    args.push(options.slug);
  }
  if (options.category) {
    filters.push("json_extract(value,'$.academyCategory')=?");
    args.push(options.category);
  }
  if (options.ids) {
    if (!options.ids.length) return [];
    filters.push(`translation_id IN (${options.ids.map(() => "?").join(",")})`);
    args.push(...options.ids);
  }
  if (options.q) {
    filters.push("lower(value) LIKE ? ESCAPE '\\'");
    args.push(
      "%" + options.q.toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c) + "%",
    );
  }
  const page = Math.max(1, Math.min(10000, Math.floor(options.page || 1)));
  args.push((page - 1) * 12);
  const rows = await db
    .prepare(
      `SELECT value FROM public_guides WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_guides WHERE ${filters.join(" AND ")} GROUP BY translation_id ORDER BY published_at DESC LIMIT 12 OFFSET ?) AND translation_id IN (SELECT translation_id FROM public_guides WHERE visible=1 GROUP BY translation_id HAVING count(*)=2 AND min(revision)=max(revision)) ORDER BY published_at DESC`,
    )
    .bind(...args)
    .all();
  return validatePublished(
    rows.results.map((r: { value: string }) => JSON.parse(r.value)),
  ) as Guide[];
}
export function relevantText(a: Article) {
  return (a.title + " " + a.summary + " " + a.tags.join(" "))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
export function relevantGuide(a: Article, terms: string[]) {
  const text = relevantText(a);
  return terms.some((term) =>
    text.includes(
      term
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
    ),
  );
}
export async function relatedGuides(
  locals: any,
  article: Article,
): Promise<Guide[]> {
  const specs = await locals.runtime?.env?.DB?.prepare(
    "SELECT id,spec FROM academy_topics WHERE published_at IS NOT NULL",
  ).all();
  const ids = (specs?.results || [])
    .map((row: any) => {
      if (row.id === article.translationId) return { ...row, score: 0 };
      const spec = JSON.parse(row.spec);
      const index = (academyConnections[article.translationId] || []).indexOf(
        row.id,
      );
      const score = !spec
        ? 0
        : (article as Guide).kind === "guide"
          ? index >= 0
            ? 300 - index
            : spec.cluster === (article as Guide).cluster
              ? 100
              : spec.category === (article as Guide).academyCategory
                ? 70
                : relevantGuide(article, spec.terms)
                  ? 40
                  : 0
          : relevantGuide(article, spec.terms)
            ? 40
            : 0;
      return { ...row, score };
    })
    .filter((row: any) => row.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3)
    .map((row: any) => row.id);
  return (await publicGuides(locals, { ids })).filter(
    (g) => g.lang === article.lang,
  );
}
export async function guideNews(locals: any, g: Guide): Promise<Article[]> {
  const db = locals.runtime?.env?.DB;
  if (!db) return [];
  const topic = await db
    .prepare("SELECT spec FROM academy_topics WHERE id=?")
    .bind(g.translationId)
    .first();
  if (!topic) return [];
  const terms = JSON.parse(topic.spec).terms as string[];
  const rows = await db
    .prepare(
      "SELECT value FROM public_articles WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_articles WHERE visible=1 AND published_at>=? GROUP BY translation_id ORDER BY published_at DESC LIMIT 24) ORDER BY published_at DESC",
    )
    .bind(new Date(Date.now() - 45 * 86400000).toISOString())
    .all();
  return validatePublished(rows.results.map((r: any) => JSON.parse(r.value)))
    .filter((a) => a.lang === g.lang && relevantGuide(a, terms))
    .slice(0, 3);
}
export async function allPublicGuidePaths(locals: any) {
  return (
    await locals.runtime.env.DB.prepare(
      "SELECT translation_id,lang,slug,published_at,updated_at FROM public_guides WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_guides WHERE visible=1 GROUP BY translation_id HAVING count(*)=2 AND min(revision)=max(revision)) ORDER BY published_at DESC",
    ).all()
  ).results as {
    translation_id: string;
    lang: Lang;
    slug: string;
    published_at: string;
    updated_at: string | null;
  }[];
}
export async function resolveAcademy(
  locals: any,
  lang: Lang,
  path = "",
  page = 1,
) {
  const parts = path.replace(/\/$/, "").split("/").filter(Boolean),
    guides = await publicGuides(locals, {
      lang,
      slug:
        parts[0] === (lang === "en" ? "guides" : "guias")
          ? parts[1]
          : undefined,
      category:
        parts[0] === (lang === "en" ? "category" : "categoria")
          ? parts[1]
          : undefined,
      page,
    });
  if (page > 1 && !guides.length) return null;
  if (!parts.length) return { type: "hub" as const, guides, lang, page };
  if (parts[0] === (lang === "en" ? "guides" : "guias") && parts.length === 2) {
    const guide = guides.find((g) => g.lang === lang && g.slug === parts[1]);
    if (guide)
      return {
        type: "guide" as const,
        guide,
        translation: guides.find(
          (g) => g.lang !== lang && g.translationId === guide.translationId,
        ),
        lang,
      };
  }
  if (
    parts[0] === (lang === "en" ? "category" : "categoria") &&
    parts.length === 2
  ) {
    const category = academyCategories.find((c) => c.id === parts[1]);
    if (category)
      return { type: "category" as const, category, guides, lang, page };
  }
  return null;
}
