import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const report = JSON.parse(
  readFileSync(process.argv[2] || ".local/seo/audit.json", "utf8"),
);
const origin = report.origin;
const en = report.pages.find((p) => p.url.includes("/en/articles/"));
const guide = report.pages.find((p) => p.url.includes("/en/academy/guides/"));
assert(en && guide, "Published bilingual news and guides required");
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const proof = { checkedAt: new Date().toISOString(), pages: [], errors: [] };
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
          window.__seoShared = data;
        },
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => proof.errors.push(e.message));
    for (const lang of ["en", "es"]) {
      const paths = [
        origin + `/${lang}/`,
        origin + `/${lang}/${lang === "en" ? "academy" : "academia"}/`,
        lang === "en" ? en.url : en.alternates.es,
        lang === "en" ? guide.url : guide.alternates.es,
        origin + `/${lang}/category/news/?page=2`,
      ];
      for (const url of paths) {
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        assert.equal(response.status(), 200, url);
        assert.equal(
          await page.locator("link[rel=canonical]").getAttribute("href"),
          url,
        );
        assert.equal(await page.locator("html").getAttribute("lang"), lang);
        assert(
          (
            await page.locator("meta[name=robots]").getAttribute("content")
          ).includes("max-image-preview:large"),
        );
        assert.equal(
          await page
            .locator(
              'script[src*="adsbygoogle.js?client=ca-pub-1382859681401211"]',
            )
            .count(),
          1,
        );
        if (
          url.includes("/articles/") ||
          url.includes("/guides/") ||
          url.includes("/guias/")
        ) {
          const json = await page
            .locator('script[type="application/ld+json"]')
            .evaluateAll((nodes) =>
              nodes.map((n) => JSON.parse(n.textContent)),
            );
          assert(json.some((n) => n["@type"] === "BreadcrumbList"));
          const schema = json.find((n) =>
            ["Article", "NewsArticle"].includes(n["@type"]),
          );
          assert(schema?.isAccessibleForFree === true);
          assert.equal(schema.inLanguage, lang);
          assert.equal(await page.locator("[data-share]").count(), 2);
          await page.locator(".copy-link").first().click();
          assert.equal(
            await page.evaluate(() => navigator.clipboard.readText()),
            url,
          );
          await page.locator(".native-share").first().click();
          assert.equal(await page.evaluate(() => window.__seoShared?.url), url);
          for (const link of await page
            .locator("[data-share]")
            .first()
            .locator("a")
            .evaluateAll((a) => a.map((n) => n.href)))
            assert(decodeURIComponent(link).includes(url));
          await page.locator(".article-figure img").evaluate(async (img) => {
            if (!img.complete)
              await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                setTimeout(() => reject(Error("Image timeout")), 15000);
              });
          });
          assert(
            await page
              .locator(".article-figure img")
              .evaluate((img) => img.naturalWidth > 0),
          );
        }
        if (url.endsWith(`/${lang}/`)) {
          assert.equal(
            await page.locator(".hero-art").evaluate((img) => img.currentSrc),
            origin +
              (width === 390 ? "/images/hero-768.webp" : "/images/hero.webp"),
          );
          assert(
            await page.locator('#latest a[href*="/category/news/"]').count(),
          );
        }
        if (url.includes("?page=2")) {
          assert(
            (await page.title()).includes(
              lang === "en" ? "Page 2" : "Página 2",
            ),
          );
          const other = await page
            .locator(`link[hreflang="${lang === "en" ? "es" : "en"}"]`)
            .getAttribute("href");
          assert(other.endsWith("?page=2"));
          assert(
            (
              await page
                .locator(`.languages a[lang="${lang}"]`)
                .getAttribute("href")
            ).endsWith("?page=2"),
          );
        }
        assert(
          !(await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 1,
          )),
          "Overflow " + url,
        );
        proof.pages.push({ url, lang, width, status: 200 });
      }
    }
    await page.goto(en.url);
    await page.screenshot({
      path: `/tmp/econoflux-seo-news-${width}.png`,
      fullPage: true,
    });
    await context.close();
  }
  assert.deepEqual(proof.errors, []);
  writeFileSync(
    "/tmp/econoflux-seo-ui-proof.json",
    JSON.stringify(proof, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: proof.pages.length,
      languages: ["en", "es"],
      viewports: [1440, 390],
      sharing: [
        "WhatsApp",
        "Facebook",
        "X",
        "Telegram",
        "LinkedIn",
        "copy",
        "native simulated",
      ],
      errors: proof.errors,
    }),
  );
} finally {
  await browser.close();
}
