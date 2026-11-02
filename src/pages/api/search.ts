import { publicGuides } from "../../lib/academy";
import { guideUrl, academyName } from "../../content/academy";
import type { APIContext } from "astro";
import { publicArticles } from "../../lib/live-content";
import { articleUrl } from "../../content/articles";
export async function GET(context: APIContext) {
  const lang = context.url.searchParams.get("lang"),
    q = (context.url.searchParams.get("q") || "").trim().slice(0, 120);
  if (!["en", "es"].includes(lang || ""))
    return Response.json({ items: [] }, { status: 400 });
  const articles = await publicArticles(context.locals, { lang: lang!, q });
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const items = articles
    .filter((a) => a.lang === lang && norm(JSON.stringify(a)).includes(norm(q)))
    .map((a) => ({
      title: a.title,
      summary: a.summary,
      url: articleUrl(a),
      category: a.category,
    }));
  const guides = await publicGuides(context.locals, { lang: lang!, q });
  items.push(
    ...guides
      .filter(
        (g) => g.lang === lang && norm(JSON.stringify(g)).includes(norm(q)),
      )
      .map((g) => ({
        title: g.title,
        summary: g.summary,
        url: guideUrl(g),
        category: academyName(g.lang) as any,
      })),
  );
  return Response.json(
    { items },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
