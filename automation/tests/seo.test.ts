import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import {
  recentNewsEntries,
  newsSitemapXML,
  contentSitemapEntries,
  sitemapCounts,
  sitemapIndexXML,
  staticSitemapEntries,
  sitemapXML,
  NEWS_WINDOW_MS,
} from "../../src/lib/sitemaps";
import { GET as generalSitemap } from "../../src/pages/sitemap.xml";
import { GET as newsSitemap } from "../../src/pages/news-sitemap.xml";
import { GET as shard } from "../../src/pages/sitemaps/[name].xml";
import { GET as robots } from "../../src/pages/robots.txt";
import {
  articleStructuredData,
  breadcrumbStructuredData,
  schemaJSON,
} from "../../src/lib/structured-data";
import {
  relatedArticles,
  publicArticleCount,
  publicArticles,
} from "../../src/lib/live-content";
import { pagePath, archivePage } from "../../src/lib/pagination";
import { seoReport } from "../src/seo";
import { handle } from "../src/index";
import type { Article } from "../../src/content/articles";
import type { Env } from "../src/types";
let mf: Miniflare, db: D1Database;
const now = new Date("2026-11-03T15:00:00.000Z");
const at = (hours: number) => new Date(+now + hours * 3600000).toISOString();
const locals = () => ({ runtime: { env: { DB: db, PUBLIC_LAUNCH: "true" } } });
const context = (path: string, preview = false, params = {}) =>
  ({
    url: new URL(
      path,
      preview ? "https://branch.econoflux.pages.dev" : "https://econoflux.com",
    ),
    locals: locals(),
    params,
  }) as any;
function article(
  id: string,
  lang: "en" | "es",
  publishedAt = at(-1),
  patch: Partial<Article> = {},
): Article {
  return {
    id: id + "-" + lang,
    translationId: id,
    lang,
    slug: id + "-" + lang,
    title: "Verified source " + id + " " + lang,
    summary: "A local-only complete bilingual fixture.",
    seoTitle: "Fixture SEO " + id + " " + lang,
    seoDescription: "A local-only description of verified source material.",
    editorialRevision: 1,
    category: "bitcoin",
    tags: lang === "en" ? ["bitcoin", "security"] : ["bitcoin", "seguridad"],
    image: {
      src: "/images/bitcoin.webp",
      alt: "Original illustration",
      credit: "EconoFlux",
    },
    sources: [{ label: "Official fixture", url: "https://example.org/source" }],
    publishedAt,
    status: "published",
    demo: false,
    author: "EconoFlux Editorial",
    sections: [
      { id: "facts", title: "Facts", text: ["A local source-backed fixture."] },
    ],
    ...patch,
  };
}
function statements(
  id: string,
  publishedAt = at(-1),
  patch: Partial<Article> = {},
  visible = 1,
  table = "public_articles",
) {
  return (["en", "es"] as const).map((lang) => {
    const a = article(id, lang, publishedAt, patch);
    return db
      .prepare(
        `INSERT INTO ${table}(translation_id,lang,slug,revision,value,visible,published_at,updated_at) VALUES(?,?,?,1,?,?,?,?)`,
      )
      .bind(
        id,
        lang,
        a.slug,
        JSON.stringify(a),
        visible,
        publishedAt,
        a.updatedAt || null,
      );
  });
}
async function pair(
  id: string,
  publishedAt = at(-1),
  patch: Partial<Article> = {},
  visible = 1,
  table = "public_articles",
) {
  await db.batch(statements(id, publishedAt, patch, visible, table));
}
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("local")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "seo-test" },
  });
  db = (await mf.getD1Database("DB")) as any;
  for (const [file, name] of [
    ["0002_hourly.sql", "public_articles"],
    ["0008_academy.sql", "academy_topics"],
    ["0008_academy.sql", "public_guides"],
    ["0002_hourly.sql", "automation_control"],
  ]) {
    const statement = readFileSync("automation/migrations/" + file, "utf8")
      .split(";")
      .find((s) => s.includes("CREATE TABLE " + name + "("));
    await db.prepare(statement!).run();
  }
  for (const sql of readFileSync(
    "automation/migrations/0013_seo_discovery.sql",
    "utf8",
  )
    .replace(/--[^\n]*/g, "")
    .split(";")
    .filter((s) => s.trim()))
    await db.prepare(sql).run();
  await db
    .prepare(
      readFileSync("automation/migrations/0014_archive_read_index.sql", "utf8")
        .replace(/--[^\n]*/g, "")
        .trim(),
    )
    .run();
  await db
    .prepare("INSERT INTO automation_control(id,enabled,paused) VALUES(1,1,0)")
    .run();
  await db
    .prepare(
      "ALTER TABLE automation_control ADD COLUMN poll_interval_minutes INTEGER NOT NULL DEFAULT 10",
    )
    .run();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});

it("News uses publication dates, only complete public pairs within 48 hours, and never renews an old revision", async () => {
  await pair("recent", at(-1));
  await pair("boundary", new Date(+now - NEWS_WINDOW_MS).toISOString());
  await pair("expired", at(-49), { updatedAt: at(-0.1) });
  await pair("future", at(1));
  await pair("draft", at(-1), { status: "draft" });
  await pair("demo", at(-1), { demo: true });
  await pair("hidden", at(-1), {}, 0);
  await pair("incomplete", at(-1));
  await db
    .prepare(
      "DELETE FROM public_articles WHERE translation_id='incomplete' AND lang='es'",
    )
    .run();

  expect((await recentNewsEntries(db, now)).map((n) => n.slug).sort()).toEqual([
    "boundary-en",
    "boundary-es",
    "recent-en",
    "recent-es",
  ]);
  expect(
    (await contentSitemapEntries(db, "articles")).some((e) =>
      e.path.includes("expired"),
    ),
  ).toBe(true);
  expect(
    (await recentNewsEntries(db, new Date(+now + 49 * 3600000))).some((e) =>
      e.slug.startsWith("recent-"),
    ),
  ).toBe(false);
});
it("bounds News at 1,000 URLs without limiting historical discovery or publication", async () => {
  for (let first = 0; first < 501; first += 50) {
    const batch = [];
    for (let n = first; n < Math.min(first + 50, 501); n++)
      batch.push(...statements("story-" + n));
    await db.batch(batch);
  }
  const recent = await recentNewsEntries(db, now);
  expect(recent).toHaveLength(1000);
  expect(new Set(recent.map((e) => e.lang + "/" + e.slug)).size).toBe(1000);
  expect((await sitemapCounts(db)).articles).toBe(1002);
  expect(await contentSitemapEntries(db, "articles")).toHaveLength(1002);
});
it("escapes actual multilingual News titles, emits valid namespace and deduplicates URLs", () => {
  const entries = [
    {
      lang: "en",
      slug: "test-en",
      title: 'Bitcoin & Ethereum <update> "quoted"',
      published_at: at(-1),
    },
    {
      lang: "es",
      slug: "test-es",
      title: "Actualización: información y análisis",
      published_at: at(-1),
    },
  ];
  const xml = newsSitemapXML([...entries, entries[0]]);
  expect(xml.match(/<news:news>/g)).toHaveLength(2);
  expect(xml).toContain(
    'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"',
  );
  expect(xml).toContain(
    "Bitcoin &amp; Ethereum &lt;update&gt; &quot;quoted&quot;",
  );
  expect(xml).toContain("<news:name>EconoFlux</news:name>");
  expect(xml).toContain("<news:language>es</news:language>");
  expect(xml).not.toContain("academy");
});
it("serves fresh XML on the official host and empty no-discovery feeds on previews", async () => {
  await pair("live-now", new Date(Date.now() - 60000).toISOString());
  await db
    .prepare(
      "INSERT INTO academy_topics(id,intent_key,category,cluster,spec) VALUES('guide','guide','security','security','{}')",
    )
    .run();
  await pair("guide", at(-72), {}, 1, "public_guides");
  const news = await newsSitemap(context("/news-sitemap.xml"));
  expect(news.status).toBe(200);
  expect(news.headers.get("Content-Type")).toContain("application/xml");
  expect(news.headers.get("Cache-Control")).toBe("no-store");
  expect(news.headers.get("X-Sitemap-Generated-At")).toBeTruthy();
  expect(await news.text()).toContain("live-now-en");
  const general = await generalSitemap(context("/sitemap.xml"));
  const xml = await general.text();
  expect(xml).toContain("/es/academia/guias/guide-es/");
  expect(xml).toContain('hreflang="x-default"');
  expect(xml).toContain("/en/articles/live-now-en/");
  expect(xml).not.toContain("<loc>https://econoflux.com/</loc>");
  expect(
    await (await newsSitemap(context("/news-sitemap.xml", true))).text(),
  ).not.toContain("<loc>");
  expect(
    await (await generalSitemap(context("/sitemap.xml", true))).text(),
  ).not.toContain("<loc>");
  const txt = await robots(context("/robots.txt")).text();
  expect(txt).toContain("Sitemap: https://econoflux.com/news-sitemap.xml");
  expect(txt).toContain("Sitemap: https://econoflux.com/sitemap.xml");
  expect(await robots(context("/robots.txt", true)).text()).toContain(
    "Disallow: /",
  );
});
it("partitions a growing general sitemap without losing historical URLs or inventing lastmod", async () => {
  const fake = {
    prepare: (sql: string) => ({
      first: async () => ({ n: sql.includes("public_articles") ? 10002 : 0 }),
      all: async () => ({ results: [] }),
    }),
  };
  const ctx = context("/sitemap.xml");
  ctx.locals.runtime.env.DB = fake;
  const response = await generalSitemap(ctx);
  const xml = await response.text();
  expect(xml).toContain("<sitemapindex ");
  expect(xml).toContain("/sitemaps/articles-3.xml");
  expect(xml).toContain("/sitemaps/pages-1.xml");
  expect(xml).not.toContain("<lastmod>");
  await pair("historical", at(-200));
  await pair("revised", at(-100), { updatedAt: at(-2) });
  const entries = await contentSitemapEntries(db, "articles");
  expect(entries.find((e) => e.path.includes("historical"))?.modified).toBe(
    at(-200),
  );
  expect(entries.find((e) => e.path.includes("revised"))?.modified).toBe(
    at(-2),
  );
  expect(
    (
      await shard(
        context("/sitemaps/articles-1.xml", false, { name: "articles-1" }),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await shard(
        context("/sitemaps/articles-2.xml", false, { name: "articles-2" }),
      )
    ).status,
  ).toBe(404);
  expect(
    (await shard(context("/sitemaps/pages-2.xml", false, { name: "pages-2" })))
      .status,
  ).toBe(404);
  expect(sitemapXML(staticSitemapEntries())).not.toContain("/search/");
  expect(sitemapIndexXML({ articles: 5001, guides: 2 })).toContain(
    "/sitemaps/guides-1.xml",
  );
});
it("links relevant published neighbors despite missing AI link suggestions and translated tags, with full valid pairs", async () => {
  await pair("current");
  for (let n = 0; n < 7; n++) await pair("neighbor-" + n, at(-2 - n));
  await pair("curated", at(-20), { category: "ethereum" });
  await pair("hidden", at(-1), {}, 0);
  const current = article("current", "en", at(-1), {
    seo: {
      primaryKeyword: "bitcoin",
      relatedQueries: [],
      searchIntent: "news",
      readerQuestions: [],
      relatedTranslationIds: ["curated", "not-published"],
      basis: "editorial-topic-inference",
    },
  });
  const related = await relatedArticles(locals(), current);
  expect(related).toHaveLength(3);
  expect(related.some((a) => a.translationId === "curated")).toBe(true);
  expect(
    related.every(
      (a) =>
        a.lang === "en" &&
        a.translationId !== "current" &&
        a.translationId !== "hidden",
    ),
  ).toBe(true);
  const spanish = await relatedArticles(locals(), article("current", "es"));
  expect(spanish).toHaveLength(3);
  expect(spanish.every((a) => a.lang === "es")).toBe(true);
});
it("keeps a crawlable archive beyond the first page and counts actual language/category results", async () => {
  for (let n = 0; n < 13; n++) await pair("archive-" + n, at(-n));
  await pair("another-topic", at(-1), { category: "ethereum" });
  expect(
    await publicArticleCount(locals(), { lang: "en", category: "bitcoin" }),
  ).toBe(13);
  expect(
    (
      await publicArticles(locals(), {
        lang: "en",
        category: "bitcoin",
        page: 2,
      })
    ).filter((a) => a.lang === "en" && !a.demo),
  ).toHaveLength(1);
  expect(pagePath("/es/category/news/", 2)).toBe("/es/category/news/?page=2");
  expect(pagePath("/es/category/news/", 1)).toBe("/es/category/news/");
  expect(archivePage("2")).toBe(2);
  expect(archivePage("-3")).toBe(1);
});
it("outputs real dates, organization attribution, free-access NewsArticle/Article and safe JSON-LD", () => {
  const a = article("schema", "es", at(-4), {
    title: "Bitcoin </script> & <Ethereum>",
    updatedAt: at(-2),
  });
  const news = articleStructuredData(
    a,
    "/es/articles/schema-es/",
    false,
    "Bitcoin",
  );
  expect(news["@type"]).toBe("NewsArticle");
  expect(news.datePublished).toBe(at(-4));
  expect(news.dateModified).toBe(at(-2));
  expect(news.author["@type"]).toBe("Organization");
  expect(news.publisher.logo.url).toBe("https://econoflux.com/favicon.svg");
  expect(news.isAccessibleForFree).toBe(true);
  expect(news.inLanguage).toBe("es");
  expect(schemaJSON(news)).not.toContain("</script>");
  expect(JSON.parse(schemaJSON(news)).headline).toBe(a.title);
  const guide = articleStructuredData(
    { ...a, updatedAt: undefined },
    "/es/academia/guias/schema-es/",
    true,
    "Seguridad",
  );
  expect(guide["@type"]).toBe("Article");
  expect(guide.dateModified).toBe(a.publishedAt);
  expect(
    breadcrumbStructuredData([
      { name: "Inicio", path: "/es/" },
      { name: "Bitcoin", path: "/es/category/bitcoin/" },
    ]).itemListElement[1].item,
  ).toBe("https://econoflux.com/es/category/bitcoin/");
});
it("reports actual internal metrics and observed HTTP failures without claiming Google indexing or changing controls", async () => {
  await pair("today", "2026-11-03T06:00:00.000Z");
  await pair("yesterday-ny", "2026-11-03T04:30:00.000Z");
  await db
    .prepare(
      "INSERT INTO seo_http_observations(url,kind,status,final_url,checked_at,error) VALUES('https://econoflux.com/broken/','article',404,'https://econoflux.com/broken/',?,NULL)",
    )
    .bind(now.toISOString())
    .run();
  const before = await db.prepare("SELECT * FROM automation_control").first();
  const fetcher = vi.fn(
    async (input: any) =>
      new Response(
        '<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>',
        {
          status: String(input).endsWith("news-sitemap.xml") ? 503 : 200,
          headers: {
            "Content-Type": "application/xml",
            "X-Sitemap-Generated-At": now.toISOString(),
          },
        },
      ),
  );
  const r = await seoReport(
    { DB: db, SITE_URL: "https://econoflux.com" } as Env,
    now,
    fetcher as any,
  );
  expect(r.totals).toMatchObject({
    total_articles: 2,
    total_pages: 4,
    published_today: 1,
    published_seven_days: 2,
  });
  expect(r.observations).toMatchObject({ http_errors: 1 });
  expect(r.indexation.verified).toBe(false);
  expect(r.sitemaps[0].valid).toBe(true);
  expect(r.sitemaps[1].valid).toBe(false);
  expect(r.withoutContextualNewsLinks).toBe(0);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(await db.prepare("SELECT * FROM automation_control").first()).toEqual(
    before,
  );
  const response = await handle(
    new Request("https://private.example/api/seo"),
    { DB: db, ADMIN_DISABLED: "true" } as Env,
  );
  expect(response.status).toBe(403);
});

it("serves a read-only SEO dashboard behind Access while editorial administration stays closed, on desktop and mobile", async () => {
  const { generateKeyPair, exportJWK, SignJWT } = await import("jose");
  const { createServer } = await import("node:http");
  const { chromium } = await import("@playwright/test");
  const keys = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(keys.publicKey);
  jwk.kid = "seo-only-key";
  const env = {
    DB: db,
    SITE_URL: "https://econoflux.com",
    ADMIN_DISABLED: "true",
    CF_ACCESS_TEAM_DOMAIN: "seoonly.cloudflareaccess.com",
    CF_ACCESS_AUD: "seo-only",
    ADMIN_EMAILS: "owner@example.org",
  } as Env;
  const jwt = await new SignJWT({ email: "owner@example.org" })
    .setProtectedHeader({ alg: "RS256", kid: jwk.kid })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setSubject("seo-owner")
    .setIssuer("https://seoonly.cloudflareaccess.com")
    .setAudience("seo-only")
    .sign(keys.privateKey);
  const actualFetch = globalThis.fetch;
  vi.stubGlobal("fetch", async (input: any, init: any) =>
    String(input).includes("/cdn-cgi/access/certs")
      ? Response.json({ keys: [jwk] })
      : String(input).startsWith("https://econoflux.com/")
        ? new Response(
            '<?xml version="1.0"?><urlset xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"></urlset>',
            { headers: { "Content-Type": "application/xml" } },
          )
        : actualFetch(input, init),
  );
  for (const path of ["/admin/seo", "/api/seo", "/seo.js"])
    expect(
      (await handle(new Request("https://private.example" + path), env)).status,
    ).toBe(403);
  for (const [method, path] of [
    ["GET", "/admin"],
    ["POST", "/api/settings"],
    ["POST", "/api/seo"],
  ])
    expect(
      (
        await handle(
          new Request("https://private.example" + path, {
            method,
            headers: { "Cf-Access-Jwt-Assertion": jwt },
          }),
          env,
        )
      ).status,
    ).toBe(403);
  const server = createServer(async (req, res) => {
    try {
      const response = await handle(
        new Request(
          "http://127.0.0.1:" + (server.address() as any).port + req.url,
          { headers: req.headers as any },
        ),
        env,
      );
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end("Fixture error");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({
        extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": jwt },
        viewport: { width, height: 900 },
      });
      const page = await context.newPage();
      const response = await page.goto(
        "http://127.0.0.1:" + (server.address() as any).port + "/admin/seo",
      );
      expect(response!.status()).toBe(200);
      expect(response!.headers()["x-robots-tag"]).toContain("noindex");
      await page.locator("#seo-metrics strong").first().waitFor();
      expect(await page.locator("#seo-metrics strong").count()).toBe(9);
      expect(await page.locator("#seo-message").innerText()).toContain(
        "Search Console no está conectado",
      );
      expect(await page.locator("form").count()).toBe(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const refreshed = page.waitForResponse((r) =>
        r.url().endsWith("/api/seo"),
      );
      await page
        .getByRole("button", { name: "Actualizar diagnóstico" })
        .click();
      expect((await refreshed).status()).toBe(200);
      await context.close();
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

it("renders an older requested article pair without fetching the twelve newest unrelated stories", async () => {
  await pair("wanted", at(-200));
  for (let n = 0; n < 15; n++) await pair("newer-" + n, at(-n));
  const rows = await publicArticles(locals(), {
    lang: "en",
    slug: "wanted-en",
  });
  expect(rows.filter((a) => !a.demo).map((a) => a.translationId)).toEqual([
    "wanted",
    "wanted",
  ]);
  expect(rows.find((a) => a.lang === "es")?.slug).toBe("wanted-es");
});

it("keeps explainers in general discovery as Article while excluding them from the recent-news feed", async () => {
  await pair("background", at(-1), { format: "explainer" });
  await pair("development", at(-1), { format: "news" });
  expect((await recentNewsEntries(db, now)).map((e) => e.slug).sort()).toEqual([
    "development-en",
    "development-es",
  ]);
  expect(
    (await contentSitemapEntries(db, "articles")).some((e) =>
      e.path.includes("background"),
    ),
  ).toBe(true);
  expect(
    articleStructuredData(
      article("background", "en", at(-1), { format: "explainer" }),
      "/en/articles/background-en/",
      false,
      "Bitcoin",
    )["@type"],
  ).toBe("Article");
  expect(
    staticSitemapEntries().some((e) => e.path.includes("category/learn/")),
  ).toBe(false);
});

it("exports only populated Academy categories, with complete published pairs", async () => {
  const { activeAcademyCategories } = await import("../../src/lib/sitemaps");
  await db
    .prepare(
      "INSERT INTO academy_topics(id,intent_key,category,cluster,spec) VALUES('library','library','security','security','{}')",
    )
    .run();
  await pair(
    "library",
    at(-1),
    { academyCategory: "security" } as Partial<Article>,
    1,
    "public_guides",
  );
  const active = await activeAcademyCategories(db);
  expect([...active]).toEqual(["security"]);
  const entries = staticSitemapEntries(active);
  expect(
    entries.some(
      (e) =>
        e.path.includes("category/security/") ||
        e.path.includes("categoria/security/"),
    ),
  ).toBe(true);
  expect(
    entries.some(
      (e) =>
        e.path.includes("category/regulation/") ||
        e.path.includes("categoria/regulation/"),
    ),
  ).toBe(false);
});
