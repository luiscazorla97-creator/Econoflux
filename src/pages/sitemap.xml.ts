import { preview, visibleArticles, articleUrl } from "../content/articles";
export function GET() {
  const paths = preview
    ? []
    : [
        "/en/",
        "/es/",
        ...["en", "es"].flatMap((l) =>
          [
            "news",
            "bitcoin",
            "ethereum",
            "altcoins",
            "defi",
            "markets",
            "learn",
          ].map((c) => `/${l}/category/${c}/`),
        ),
        ...["en", "es"].flatMap((l) =>
          ["about", "editorial", "contact", "privacy", "terms"].map(
            (p) => `/${l}/${p}/`,
          ),
        ),
        ...visibleArticles.map(articleUrl),
      ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((p) => `<url><loc>https://econoflux.com${p}</loc></url>`).join("")}</urlset>`,
    { headers: { "Content-Type": "application/xml" } },
  );
}
