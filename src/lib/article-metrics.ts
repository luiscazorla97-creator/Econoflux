import type { Article } from "../content/articles";
export const articleWordCount = (a: Article) =>
  [
    a.summary,
    ...a.sections.flatMap((s) => [
      s.title,
      ...s.text,
      s.subheading || "",
      ...(s.list || []),
      ...(s.table?.headings || []),
      ...(s.table?.rows.flat() || []),
    ]),
  ]
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
