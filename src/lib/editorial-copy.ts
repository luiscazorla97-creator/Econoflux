import type { Article } from "../content/articles";
import type { Lang } from "./i18n";

/** Presentation-only copy editing: never alter facts, figures, URLs or quotes. */
export function editEditorialText(text: string, lang: Lang): string {
  const edit = (part: string) => {
    if (lang === "en")
      return part
        .replace(/\bproviderReportedAt\b/g, "source publication time")
        .replace(
          /\b(?:evidence|verification) ledger\b/gi,
          "cited source material",
        )
        .replace(/\bthe supplied\b/gi, (s) =>
          s[0] === "T" ? "The cited" : "the cited",
        )
        .replace(
          /\bsupplied (reporting|material|documents|evidence|snapshots|facts)\b/gi,
          "cited $1",
        )
        .replace(
          /\b(?:This|The) JSON (records|describes)\b/g,
          "This article describes",
        )
        .replace(
          /\bwere not provided here\b/g,
          "are not available in the cited material",
        );
    return part
      .replace(/\bproviderReportedAt\b/g, "fecha del reporte")
      .replace(/\b(?:evidence|verification) ledger\b/gi, "material citado")
      .replace(/\bel ledger\b/g, "el material citado")
      .replace(
        /\b(?:Este|El) JSON (registra|describe)\b/g,
        "Este artículo describe",
      )
      .replace(/\bmaterial(?:es)? (?:suministrado|proporcionado)s?\b/gi, (s) =>
        s.toLowerCase().startsWith("materiales")
          ? "materiales citados"
          : "material citado",
      )
      .replace(
        /\b(documentos|datos|hechos) (?:suministrados|proporcionados)\b/gi,
        "$1 citados",
      )
      .replace(
        /\b(evidencia|información|documentación) (?:suministrada|proporcionada)\b/gi,
        "$1 citada",
      )
      .replace(
        /\b(fuentes|cifras|declaraciones) (?:suministradas|proporcionadas)\b/gi,
        "$1 citadas",
      )
      .replace(/\blo (?:suministrado|proporcionado)\b/gi, "el material citado")
      .replace(/\bon[-‑]record\b/gi, "con atribución pública");
  };
  // A quotation's exact wording is evidence and must remain untouched.
  return text
    .split(/("[^"\n]+"|“[^”\n]+”)/g)
    .map((part, i) => (i % 2 ? part : edit(part)))
    .join("");
}

export function copyEditArticle<T extends Article>(article: T): T {
  const edit = (s: string) => editEditorialText(s, article.lang);
  return {
    ...article,
    title: edit(article.title),
    summary: edit(article.summary),
    ...(article.seoTitle ? { seoTitle: edit(article.seoTitle) } : {}),
    ...(article.seoDescription
      ? { seoDescription: edit(article.seoDescription) }
      : {}),
    sections: article.sections.map((s) => ({
      ...s,
      title: edit(s.title),
      text: s.text.map(edit),
      ...(s.subheading ? { subheading: edit(s.subheading) } : {}),
      ...(s.list ? { list: s.list.map(edit) } : {}),
      ...(s.table
        ? {
            table: {
              headings: s.table.headings.map(edit),
              rows: s.table.rows.map((r) => r.map(edit)),
            },
          }
        : {}),
    })),
    ...(article.confirmation
      ? {
          confirmation: {
            ...article.confirmation,
            explanation: edit(article.confirmation.explanation),
            confirmedFacts: article.confirmation.confirmedFacts.map(edit),
            unconfirmedClaims: article.confirmation.unconfirmedClaims.map(edit),
          },
        }
      : {}),
  };
}

export function publicEditorialText(a: Article): string[] {
  return [
    a.title,
    a.summary,
    a.seoTitle || "",
    a.seoDescription || "",
    ...a.sections.flatMap((s) => [
      s.title,
      s.subheading || "",
      ...s.text,
      ...(s.list || []),
      ...(s.table?.headings || []),
      ...(s.table?.rows.flat() || []),
    ]),
    ...(a.confirmation
      ? [
          a.confirmation.explanation,
          ...a.confirmation.confirmedFacts,
          ...a.confirmation.unconfirmedClaims,
        ]
      : []),
  ];
}

export function editorialCopyIssues(a: Article): string[] {
  const text = publicEditorialText(a).join(" ");
  const unquoted = text.replace(/"[^"\n]+"|“[^”\n]+”/g, "");
  const issues: string[] = [];
  if (
    /\b(?:providerReportedAt|essentialFacts|sourceIds|relevanceScore)\b|\b(?:evidence|verification) ledger\b|\bthe supplied (?:reporting|material|documents|evidence|facts)\b|hechos suministrados|notas? internas? de verificaci[oó]n/i.test(
      unquoted,
    ) ||
    /\bel ledger\b/.test(unquoted)
  )
    issues.push(
      "El texto público contiene campos o notas internas; redactar para lectores sin omitir atribuciones ni incertidumbre",
    );
  const paragraphs = a.sections
    .flatMap((s) => s.text)
    .map((s) => s.toLowerCase().replace(/\s+/g, " ").trim())
    .filter((s) => s.split(" ").length >= 20);
  if (paragraphs.some((p, i) => paragraphs.indexOf(p) < i))
    issues.push(
      "El artículo repite un párrafo extenso; conservar la información una sola vez sin agregar relleno",
    );
  return issues;
}
