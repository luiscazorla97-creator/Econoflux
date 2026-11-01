import type { Article } from "../content/articles";
export function validatePublished(raw: unknown): Article[] {
  if (!Array.isArray(raw))
    throw new Error("Published content must be an array");
  const keys = new Set<string>();
  const pairs = new Map<string, Article[]>();
  for (const a of raw) {
    if (
      !a ||
      typeof a !== "object" ||
      a.demo !== false ||
      a.status !== "published" ||
      !["en", "es"].includes(a.lang) ||
      typeof a.translationId !== "string" ||
      !a.translationId ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.slug) ||
      !Number.isInteger(a.editorialRevision) ||
      a.editorialRevision < 1 ||
      typeof a.title !== "string" ||
      !a.title.trim() ||
      typeof a.summary !== "string" ||
      !a.summary.trim() ||
      !a.seoTitle ||
      !a.seoDescription ||
      !Number.isFinite(Date.parse(a.publishedAt)) ||
      !Array.isArray(a.sections) ||
      !a.sections.length ||
      a.sections.some(
        (s: any) =>
          !s.title ||
          !Array.isArray(s.text) ||
          !s.text.length ||
          s.text.some((t: any) => typeof t !== "string"),
      ) ||
      !Array.isArray(a.sources) ||
      !a.sources.length ||
      a.sources.some(
        (s: any) =>
          typeof s.label !== "string" ||
          typeof s.url !== "string" ||
          !s.url.startsWith("https://"),
      ) ||
      !a.image?.src?.startsWith("/images/") ||
      !a.image.alt ||
      !a.image.credit
    )
      throw new Error("Incomplete published article; refusing deployment");
    const key = a.lang + "/" + a.slug;
    if (keys.has(key)) throw new Error("Duplicate article route");
    keys.add(key);
    pairs.set(a.translationId, [...(pairs.get(a.translationId) || []), a]);
  }
  for (const pair of pairs.values())
    if (
      pair.length !== 2 ||
      new Set(pair.map((a) => a.lang)).size !== 2 ||
      pair[0].editorialRevision !== pair[1].editorialRevision ||
      pair[0].publishedAt !== pair[1].publishedAt
    )
      throw new Error("Both translations must deploy together");
  return raw as Article[];
}
