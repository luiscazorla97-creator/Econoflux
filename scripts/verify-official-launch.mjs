import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
const articles = JSON.parse(readFileSync(process.argv[2], "utf8"));
const root = "https://econoflux.com";
const path = (a) => `/${a.lang}/articles/${a.slug}/`;
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const proof = {
  articles: [],
  crawlers: [],
  sharing: ["WhatsApp", "Facebook", "X", "Telegram", "LinkedIn"],
  nativeShare: "simulated capability and payload",
  noSocialPosts: true,
};
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data) => {
          window.__nativeShareProof = data;
        },
      });
    });
    const page = await context.newPage();
    for (const a of articles) {
      const url = root + path(a);
      const response = await page.goto(url, { waitUntil: "networkidle" });
      assert.equal(response.status(), 200);
      const html = await response.text();
      assert(html.includes('property="og:image"'));
      assert(html.includes(a.image.socialSrc));
      assert.equal(await page.locator("html").getAttribute("lang"), a.lang);
      assert.equal(
        await page.locator('link[rel="canonical"]').getAttribute("href"),
        url,
      );
      assert.equal(
        await page.locator('meta[name="robots"]').getAttribute("content"),
        "index, follow",
      );
      assert(
        !(await response.allHeaders())["x-robots-tag"]?.includes("noindex"),
      );
      assert.equal(
        await page.locator('meta[property="og:title"]').getAttribute("content"),
        a.seoTitle,
      );
      assert.equal(
        await page
          .locator('meta[property="og:description"]')
          .getAttribute("content"),
        a.seoDescription,
      );
      assert.equal(
        await page.locator('meta[property="og:url"]').getAttribute("content"),
        url,
      );
      assert.equal(
        await page.locator('meta[property="og:image"]').getAttribute("content"),
        root + a.image.socialSrc,
      );
      assert.equal(
        await page
          .locator('meta[name="twitter:image"]')
          .getAttribute("content"),
        root + a.image.socialSrc,
      );
      assert.equal(
        await page
          .locator('meta[property="og:image:width"]')
          .getAttribute("content"),
        "1200",
      );
      assert.equal(
        await page
          .locator('meta[property="og:image:height"]')
          .getAttribute("content"),
        "630",
      );
      const schema = JSON.parse(
        await page.locator('script[type="application/ld+json"]').textContent(),
      );
      assert(["NewsArticle", "Article"].includes(schema["@type"]));
      assert.equal(schema.datePublished, a.publishedAt);
      assert.equal(schema.dateModified, a.updatedAt);
      assert((await page.locator(".prose").innerText()).length > 4000);
      assert((await page.locator(".prose > section").count()) >= 5);
      assert.equal(await page.locator("[data-share]").count(), 2);
      for (const share of await page.locator("[data-share]").all()) {
        const links = await share
          .locator("a")
          .evaluateAll((nodes) =>
            nodes.map((a) => ({ label: a.textContent.trim(), href: a.href })),
          );
        assert.equal(links.length, 5);
        for (const link of links) {
          const u = new URL(link.href);
          if (link.label === "WhatsApp")
            assert(u.searchParams.get("text").includes(url));
          else
            assert.equal(
              u.searchParams.get(link.label === "Facebook" ? "u" : "url"),
              url,
            );
        }
      }
      if (a === articles.find((b) => b.lang === a.lang)) {
        await page.locator(".copy-link").first().click();
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          url,
        );
        await page.locator(".native-share").first().click();
        assert.equal(
          (await page.evaluate(() => window.__nativeShareProof)).url,
          url,
        );
      }
      const other = articles.find(
        (b) => b.translation_id === a.translation_id && b.lang !== a.lang,
      );
      assert.equal(
        await page
          .locator(`link[hreflang="${other.lang}"]`)
          .getAttribute("href"),
        root + path(other),
      );
      await page.locator(`.languages a[lang="${other.lang}"]`).click();
      await page.waitForURL(root + path(other));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Overflow " + url,
      );
      proof.articles.push({
        width,
        path: path(a),
        status: 200,
        metadata: true,
        sharing: true,
      });
    }
    for (const lang of ["en", "es"]) {
      await page.goto(root + "/" + lang + "/", { waitUntil: "networkidle" });
      assert.equal(await page.locator(".market-price").count(), 3);
      assert(
        (await page.locator(".market-price").allTextContents()).every((s) =>
          s.includes("$"),
        ),
      );
      assert.equal(await page.locator(".demo-label").count(), 0);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const result = await page.evaluate(async () => {
        const r = await fetch("/api/market");
        return { status: r.status, data: await r.json() };
      });
      assert.equal(result.status, 200);
      assert.equal(result.data.quotes.length, 3);
      assert(result.data.quotes.every((q) => q.change24h !== null));
      if (width === 390)
        await page.screenshot({
          path: `/tmp/econoflux-official-${lang}-mobile.png`,
          fullPage: true,
        });
    }
    await context.close();
  }
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(root + "/en/");
  const data = await page.evaluate(async () => {
    const get = async (path) => {
      const r = await fetch(path);
      return { status: r.status, body: await r.text() };
    };
    return {
      sitemap: await get("/sitemap.xml"),
      robots: await get("/robots.txt"),
    };
  });
  for (const a of articles) assert(data.sitemap.body.includes(root + path(a)));
  assert(!data.sitemap.body.includes("/search/"));
  assert(data.sitemap.body.includes('hreflang="es"'));
  assert(data.robots.body.includes("Sitemap: " + root + "/sitemap.xml"));
  assert(!data.robots.body.includes("Disallow: /\n"));
  for (const host of ["www.econoflux.com", "econoflux.pages.dev"]) {
    const r = await page.goto("https://" + host + "/es/", {
      waitUntil: "domcontentloaded",
    });
    assert.equal(page.url(), root + "/es/");
    let request = r.request(),
      redirects = [];
    while (request.redirectedFrom()) {
      request = request.redirectedFrom();
      const rr = await request.response();
      redirects.push({ url: request.url(), status: rr.status() });
    }
    assert(
      redirects.some(
        (d) => new URL(d.url).hostname === host && d.status === 301,
      ),
    );
  }
  await context.close();
  for (const agent of [
    "facebookexternalhit/1.1",
    "Twitterbot/1.0",
    "LinkedInBot/1.0",
    "WhatsApp/2.24",
  ]) {
    const c = await browser.newContext({
      javaScriptEnabled: false,
      userAgent: agent,
    });
    const p = await c.newPage();
    const a = articles[0];
    const r = await p.goto(root + path(a), { waitUntil: "domcontentloaded" });
    assert.equal(r.status(), 200, agent);
    assert.equal(
      await p.locator('meta[property="og:image"]').getAttribute("content"),
      root + a.image.socialSrc,
    );
    proof.crawlers.push({ agent, status: 200, initialHTML: true });
    await c.close();
  }
  writeFileSync(
    "/tmp/econoflux-official-proof.json",
    JSON.stringify(proof, null, 2),
  );
  console.log(
    JSON.stringify({
      articleViewportChecks: proof.articles.length,
      crawlers: proof.crawlers,
      sharing: proof.sharing,
      nativeShare: proof.nativeShare,
      sitemap: true,
      robots: true,
      redirects: true,
      prices: true,
    }),
  );
} finally {
  await browser.close();
}
