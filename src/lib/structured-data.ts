import type { Article } from "../content/articles";
import { articleWordCount } from "./article-metrics";
import { SITE_ORIGIN } from "./site";
export interface Breadcrumb {
  name: string;
  path: string;
}
export const schemaJSON = (value: unknown) =>
  JSON.stringify(value).replace(/</g, "\\u003c");
export const publisher = {
  "@type": "Organization",
  "@id": SITE_ORIGIN + "/#organization",
  name: "EconoFlux",
  url: SITE_ORIGIN,
  logo: { "@type": "ImageObject", url: SITE_ORIGIN + "/favicon.svg" },
};
export function articleStructuredData(
  a: Article,
  path: string,
  isGuide: boolean,
  section: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": isGuide ? "Article" : "NewsArticle",
    "@id": SITE_ORIGIN + path + "#article",
    headline: a.title,
    description: a.summary,
    inLanguage: a.lang,
    datePublished: a.publishedAt,
    // This records the original date until a genuine revision exists; it never
    // uses request time or a source-check date to make old content appear new.
    dateModified: a.updatedAt || a.publishedAt,
    author: {
      "@type": "Organization",
      name: "EconoFlux",
      url: `${SITE_ORIGIN}/${a.lang}/editorial/`,
    },
    publisher,
    image: {
      "@type": "ImageObject",
      url: new URL(a.image.socialSrc || a.image.src, SITE_ORIGIN).href,
      caption: a.image.credit,
      width: a.image.socialWidth || a.image.width || 1536,
      height: a.image.socialHeight || a.image.height || 1024,
    },
    articleSection: section,
    ...(a.format === "analysis"
      ? { genre: a.lang === "en" ? "Analysis" : "Análisis" }
      : {}),
    keywords: a.seo?.primaryKeyword || a.tags.join(", "),
    wordCount: articleWordCount(a),
    citation: a.sources.map((s) => s.url),
    mainEntityOfPage: { "@type": "WebPage", "@id": SITE_ORIGIN + path },
    isAccessibleForFree: true,
  };
}
export function breadcrumbStructuredData(items: Breadcrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: SITE_ORIGIN + b.path,
    })),
  };
}
export function websiteStructuredData(lang: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      publisher,
      {
        "@type": "WebSite",
        "@id": SITE_ORIGIN + "/#website",
        url: SITE_ORIGIN,
        name: "EconoFlux",
        inLanguage: ["en", "es"],
        publisher: { "@id": publisher["@id"] },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_ORIGIN}/${lang}/`,
        url: `${SITE_ORIGIN}/${lang}/`,
        inLanguage: lang,
        isPartOf: { "@id": SITE_ORIGIN + "/#website" },
      },
    ],
  };
}
