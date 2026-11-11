import { it, expect } from "vitest";
import {
  editEditorialText,
  copyEditArticle,
  editorialCopyIssues,
} from "../../src/lib/editorial-copy";
import type { Article } from "../../src/content/articles";
const article = (patch: Partial<Article> = {}): Article => ({
  id: "copy-en",
  translationId: "copy",
  lang: "en",
  slug: "copy",
  title: "An attributed report",
  summary: "The underlying claim remains unconfirmed.",
  seoTitle: "An attributed report",
  seoDescription: "A report with the original sourcing and limitations.",
  category: "bitcoin",
  tags: ["bitcoin"],
  image: {
    src: "/images/bitcoin.webp",
    alt: "Original illustration",
    credit: "EconoFlux",
  },
  sources: [
    { label: "Identifiable outlet", url: "https://example.org/original" },
  ],
  publishedAt: "2026-11-01T12:00:00Z",
  editorialRevision: 1,
  status: "draft",
  demo: false,
  author: "EconoFlux Editorial",
  sections: [
    {
      id: "report",
      title: "What was reported",
      text: [
        "The supplied reporting attributes $3,000 to the company; this remains unconfirmed (providerReportedAt: 2026-11-01T10:00:00Z).",
      ],
    },
  ],
  ...patch,
});
it("copy-edits internal labels without changing figures, dates, sourcing, identities or uncertainty", () => {
  const a = article(),
    b = copyEditArticle(a);
  expect(b.sections[0].text[0]).toContain("cited reporting");
  expect(b.sections[0].text[0]).toContain("source publication time");
  expect(b.sections[0].text[0]).toContain("remains unconfirmed");
  expect(b.sections[0].text[0].match(/\d+(?:[.,]\d+)*/g)).toEqual(
    a.sections[0].text[0].match(/\d+(?:[.,]\d+)*/g),
  );
  for (const field of [
    "sources",
    "image",
    "publishedAt",
    "slug",
    "translationId",
    "editorialRevision",
  ] as const)
    expect(b[field]).toEqual(a[field]);
  expect(a.sections[0].text[0]).toContain("supplied reporting");
});
it("keeps exact direct quotations and legitimate blockchain/brand references", () => {
  expect(
    editorialCopyIssues(
      article({
        sections: [
          {
            id: "quote",
            title: "Statement",
            text: [
              'The spokesperson said "the supplied documents are incomplete".',
            ],
          },
        ],
      }),
    ),
  ).toEqual([]);
  expect(
    editEditorialText(
      'The spokesperson said "the supplied documents are incomplete".',
      "en",
    ),
  ).toBe('The spokesperson said "the supplied documents are incomplete".');
  expect(
    editEditorialText(
      "El Ledger Nano y el libro mayor de Bitcoin son cosas distintas.",
      "es",
    ),
  ).toBe("El Ledger Nano y el libro mayor de Bitcoin son cosas distintas.");
  expect(
    editEditorialText("The ledger records blockchain transactions.", "en"),
  ).toBe("The ledger records blockchain transactions.");
  expect(
    editorialCopyIssues(
      article({
        lang: "es",
        sections: [
          {
            id: "wallet",
            title: "Wallet",
            text: ["El Ledger Nano permite firmar operaciones."],
          },
        ],
      }),
    ),
  ).toEqual([]);
});
it("checks confirmation boxes, lists and SEO as public copy, not only body paragraphs", () => {
  const a = article({
    sections: [
      { id: "facts", title: "Facts", text: ["An ordinary attributed fact."] },
    ],
    confirmation: {
      status: "rumor",
      resolution: "pending",
      checkedAt: "2026-11-01T12:00:00Z",
      explanation: "The evidence ledger is incomplete.",
      confirmedFacts: ["An outlet published a report."],
      unconfirmedClaims: ["The underlying claim remains unconfirmed."],
      originalReport: { label: "Outlet", url: "https://example.org/original" },
    },
  });
  expect(editorialCopyIssues(a)).not.toEqual([]);
  const b = copyEditArticle(a);
  expect(editorialCopyIssues(b)).toEqual([]);
  expect(b.confirmation?.status).toBe("rumor");
  expect(b.confirmation?.unconfirmedClaims).toEqual(
    a.confirmation?.unconfirmedClaims,
  );
});
it("detects extensive duplicated paragraphs without imposing a word-count quota", () => {
  const p =
    "This is a complete paragraph of more than twenty ordinary words which should appear only once in the article rather than repeat to inflate its length.";
  expect(
    editorialCopyIssues(
      article({ sections: [{ id: "a", title: "A", text: [p, p] }] }),
    ),
  ).not.toEqual([]);
  expect(
    editorialCopyIssues(
      article({
        sections: [{ id: "a", title: "A", text: ["A short, sourced fact."] }],
      }),
    ),
  ).toEqual([]);
});
