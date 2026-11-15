import { chromium } from "@playwright/test";
import fs from "node:fs";
import { createHash, X509Certificate } from "node:crypto";
import assert from "node:assert/strict";
const guides = JSON.parse(
  fs.readFileSync("editorial/academy-2026-11-15/guides.json", "utf8"),
);
const origin = process.env.ACADEMY_VERIFY_ORIGIN || "https://econoflux.com";
const local = origin.includes("127.0.0.1");
const path = (g) =>
  (g.lang === "en" ? "/en/academy/guides/" : "/es/academia/guias/") +
  g.slug +
  "/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "/usr/bin/chromium",
  // Trust only the configured environment proxy key in Chromium's isolated
  // test profile. HTTP checks separately use the system CA store; do not use
  // ignoreHTTPSErrors or a blanket certificate bypass.
  args: [
    "--no-sandbox",
    ...(!local && process.env.CODEX_PROXY_CERT
      ? [
          "--ignore-certificate-errors-spki-list=" +
            createHash("sha256")
              .update(
                new X509Certificate(
                  fs.readFileSync(process.env.CODEX_PROXY_CERT),
                ).publicKey.export({ type: "spki", format: "der" }),
              )
              .digest("base64"),
        ]
      : []),
  ],
  ...(!local && process.env.HTTPS_PROXY
    ? { proxy: { server: process.env.HTTPS_PROXY } }
    : {}),
});
const results = [],
  errors = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const g of guides) {
      const started = Date.now();
      const response = await page.goto(origin + path(g), {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      assert.equal(response.status(), 200, path(g));
      assert.equal(await page.locator("h1").count(), 1);
      assert.equal(await page.locator("h1").innerText(), g.title);
      assert.equal(await page.locator("html").getAttribute("lang"), g.lang);
      assert.equal(
        await page.locator("link[rel=canonical]").getAttribute("href"),
        "https://econoflux.com" + path(g),
      );
      const other = guides.find(
        (v) => v.translationId === g.translationId && v.lang !== g.lang,
      );
      assert.equal(
        await page.locator(`link[hreflang=${other.lang}]`).getAttribute("href"),
        "https://econoflux.com" + path(other),
      );
      assert.equal(
        await page.locator("link[hreflang=x-default]").getAttribute("href"),
        "https://econoflux.com" + path(g.lang === "en" ? g : other),
      );
      if (!local) {
        assert.equal(
          await page.locator("meta[name=robots]").getAttribute("content"),
          "index, follow, max-image-preview:large",
        );
        assert(!/noindex/i.test(response.headers()["x-robots-tag"] || ""));
      }
      const schemas = await page
        .locator('script[type="application/ld+json"]')
        .allTextContents();
      const parsed = schemas.map(JSON.parse),
        article = parsed.find((s) => s["@type"] === "Article"),
        bc = parsed.find((s) => s["@type"] === "BreadcrumbList");
      assert(article && bc);
      assert(article.wordCount >= 1500 && article.wordCount <= 2500);
      assert.equal(article.inLanguage, g.lang);
      assert.equal(
        article.mainEntityOfPage["@id"],
        "https://econoflux.com" + path(g),
      );
      assert.equal(
        await page.locator("meta[name=description]").getAttribute("content"),
        g.seoDescription,
      );
      assert((await page.locator(".prose h3").count()) > 0);
      assert.equal(await page.locator("#faq").count(), 1);
      assert((await page.locator(".guide-section-links a").count()) >= 4);
      await page.locator(".article-figure img").evaluate((img) => img.decode());
      const img = await page.locator(".article-figure img").evaluate((i) => ({
        src: i.currentSrc,
        width: i.naturalWidth,
        alt: i.alt,
      }));
      const frame = await page.locator(".article-figure img").evaluate((i) => ({
        width: i.getBoundingClientRect().width,
        height: i.getBoundingClientRect().height,
        ratio: i.naturalWidth / i.naturalHeight,
      }));
      assert(
        Math.abs(frame.width / frame.height - frame.ratio) < 0.02,
        "Diagram cropped: " + path(g),
      );
      assert(
        img.src.endsWith(".webp") && img.width > 0 && img.alt === g.image.alt,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        "overflow " + path(g),
      );
      const social = await context.request.get(origin + g.image.socialSrc);
      assert.equal(social.status(), 200);
      assert(social.headers()["content-type"].startsWith("image/png"));
      const metrics = await page.evaluate(() => {
        const n = performance.getEntriesByType("navigation")[0];
        return {
          ttfb: Math.round(n.responseStart - n.requestStart),
          domContentLoaded: Math.round(n.domContentLoadedEventEnd),
          htmlTransfer: n.transferSize,
        };
      });
      results.push({
        url: "https://econoflux.com" + path(g),
        width,
        status: response.status(),
        words: article.wordCount,
        image: img.src,
        ...metrics,
        elapsed: Date.now() - started,
      });
      if (
        g.lang === "es" &&
        [
          "bitcoin-halving",
          "crypto-order-types",
          "nft-ownership-metadata",
        ].includes(g.translationId) &&
        width === 390
      )
        await page.screenshot({
          path: `/tmp/academy-${local ? "preview" : "live"}-${g.translationId}.png`,
          fullPage: false,
        });
      console.log(width, g.lang, g.slug, "OK");
    }
    if (!local) {
      const sitemap = await (
        await context.request.get(origin + "/sitemap.xml")
      ).text();
      for (const g of guides)
        assert(
          sitemap.includes("https://econoflux.com" + path(g)),
          "sitemap " + g.slug,
        );
      const robots = await context.request.get(origin + "/robots.txt");
      assert.equal(robots.status(), 200);
      assert(!(await robots.text()).includes("Disallow: /\n"));
    }
    await context.close();
  }
  assert.equal(errors.length, 0, errors.join("\n"));
  fs.writeFileSync(
    `editorial/academy-2026-11-15/${local ? "preview" : "live"}-verification.json`,
    JSON.stringify(
      { checkedAt: new Date().toISOString(), results, errors },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
