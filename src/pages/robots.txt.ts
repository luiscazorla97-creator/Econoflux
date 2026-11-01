import { preview } from "../content/articles";
export function GET() {
  return new Response(
    preview
      ? "User-agent: *\nDisallow: /\n"
      : "User-agent: *\nAllow: /\nDisallow: /en/search/\nDisallow: /es/search/\nSitemap: https://econoflux.com/sitemap.xml\n",
    { headers: { "Content-Type": "text/plain" } },
  );
}
