import { validatePublished } from "./published";
import type { Article } from "../content/articles";
import { academyCategories, type Guide } from "../content/academy";
import type { Lang } from "./i18n";

export async function publicGuides(locals: any): Promise<Guide[]> {
  const db = locals.runtime?.env?.DB;
  if (!db) {
    if (import.meta.env.DEV) return [];
    throw new Error("Academy database not bound");
  }
  const rows = await db
    .prepare(
      "SELECT value FROM public_guides WHERE visible=1 AND translation_id IN (SELECT translation_id FROM public_guides WHERE visible=1 GROUP BY translation_id HAVING count(*)=2 AND min(revision)=max(revision)) ORDER BY published_at DESC",
    )
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
  const guides = (await publicGuides(locals)).filter(
    (g) => g.lang === article.lang && g.translationId !== article.translationId,
  );
  const specs = await locals.runtime?.env?.DB?.prepare(
    "SELECT id,spec FROM academy_topics WHERE published_at IS NOT NULL",
  ).all();
  return guides
    .filter((g) => {
      const row = specs?.results.find((t: any) => t.id === g.translationId);
      const spec = row ? JSON.parse(row.spec) : null;
      return (
        spec &&
        ((article as Guide).kind === "guide"
          ? spec.cluster === (article as Guide).cluster
          : relevantGuide(article, spec.terms))
      );
    })
    .slice(0, 3);
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
      "SELECT value FROM public_articles WHERE visible=1 AND published_at>=? ORDER BY published_at DESC LIMIT 120",
    )
    .bind(new Date(Date.now() - 45 * 86400000).toISOString())
    .all();
  return validatePublished(rows.results.map((r: any) => JSON.parse(r.value)))
    .filter((a) => a.lang === g.lang && relevantGuide(a, terms))
    .slice(0, 3);
}
export async function resolveAcademy(locals: any, lang: Lang, path = "") {
  const parts = path.replace(/\/$/, "").split("/").filter(Boolean),
    guides = await publicGuides(locals);
  if (!parts.length) return { type: "hub" as const, guides, lang };
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
    if (category) return { type: "category" as const, category, guides, lang };
  }
  return null;
}
