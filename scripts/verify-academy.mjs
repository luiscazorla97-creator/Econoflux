import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const origin = "https://econoflux.com";
const minimumGuides = Number(process.env.ACADEMY_EXPECT_GUIDES || 3);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const proof = {
  checkedAt: new Date().toISOString(),
  hubs: [],
  categories: [],
  guides: [],
  transparency: [],
};
const errors = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({
      viewport,
      permissions: ["clipboard-read", "clipboard-write"],
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    for (const [lang, root] of [
      ["en", "academy"],
      ["es", "academia"],
    ]) {
      let response = await page.goto(`${origin}/${lang}/${root}/`, {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200);
      assert.equal(
        await page.locator("h1").innerText(),
        lang === "en" ? "Crypto Academy" : "Academia Crypto",
      );
      assert.equal(await page.locator(".academy-categories>a").count(), 8);
      const categories = await page
        .locator(".academy-categories>a")
        .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href")));
      const guides = [
        ...new Set(
          await page
            .locator(".cards .card-link")
            .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("href"))),
        ),
      ];
      assert(
        guides.length >= minimumGuides,
        "Initial three guides must be published",
      );
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
        "Hub overflow",
      );
      proof.hubs.push({
        lang,
        viewport: viewport.width,
        status: 200,
        guides: guides.length,
      });
      await page.screenshot({
        path: `/tmp/econoflux-academy-${lang}-${viewport.width}.png`,
        fullPage: true,
      });
      if (viewport.width === 1440)
        for (const path of categories) {
          response = await page.goto(origin + path);
          assert.equal(response.status(), 200);
          assert.equal(await page.locator("h1").count(), 1);
          proof.categories.push({ path, status: 200 });
        }
      for (const path of guides.slice(0, 3)) {
        response = await page.goto(origin + path, { waitUntil: "networkidle" });
        assert.equal(response.status(), 200);
        const html = await response.text();
        const h1 = await page.locator("h1").innerText();
        assert(h1.length > 15);
        assert(
          html.includes(h1.replaceAll("&", "&amp;")) || html.includes(h1),
          "Initial title absent",
        );
        const canonical = await page
          .locator("link[rel=canonical]")
          .getAttribute("href");
        assert.equal(canonical, origin + path);
        assert.equal(
          await page.locator("meta[name=robots]").getAttribute("content"),
          "index, follow",
        );
        const alternate = await page
          .locator(`link[hreflang="${lang === "en" ? "es" : "en"}"]`)
          .getAttribute("href");
        assert(
          alternate.startsWith(
            origin +
              "/" +
              (lang === "en" ? "es/academia/guias/" : "en/academy/guides/"),
          ),
        );
        assert.equal(await page.locator("[data-share]").count(), 2);
        assert.equal(
          await page
            .locator('meta[property="og:type"]')
            .getAttribute("content"),
          "article",
        );
        assert.notEqual(
          await page
            .locator('meta[property="og:title"]')
            .getAttribute("content"),
          "EconoFlux",
        );
        const schema = JSON.parse(
          await page.locator('script[type="application/ld+json"]').innerText(),
        );
        assert.equal(schema["@type"], "Article");
        assert(schema.wordCount >= 1500);
        assert(schema.citation.length >= 2);
        const mainImage = page.locator(".article-figure img");
        assert(
          await mainImage.evaluate(
            (img) => img.complete && img.naturalWidth > 0,
          ),
        );
        const social = await page
          .locator('meta[property="og:image"]')
          .getAttribute("content");
        assert(
          social.startsWith(origin + "/images/academy/") &&
            social.endsWith(".png"),
        );
        const dimensions = await page.evaluate(async (url) => {
          const r = await fetch(url),
            a = await r.arrayBuffer(),
            v = new DataView(a);
          return {
            status: r.status,
            width: v.getUint32(16),
            height: v.getUint32(20),
            type: r.headers.get("content-type"),
          };
        }, social);
        assert.deepEqual(dimensions, {
          status: 200,
          width: 1200,
          height: 630,
          type: "image/png",
        });
        for (const href of await page
          .locator("[data-share] a")
          .evaluateAll((nodes) => nodes.map((n) => n.href)))
          assert(
            href.includes(encodeURIComponent(canonical)) ||
              href.includes(canonical),
            "Share does not use canonical language URL",
          );
        await page.locator(".copy-link").first().click();
        assert.equal(
          await page.evaluate(() => navigator.clipboard.readText()),
          canonical,
        );
        assert(
          !(await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          )),
          "Article overflow",
        );
        proof.guides.push({
          path,
          viewport: viewport.width,
          status: 200,
          wordCount: schema.wordCount,
          title: h1,
          social,
          alternate,
        });
        if (viewport.width === 390)
          await page.screenshot({
            path:
              "/tmp/econoflux-guide-" +
              lang +
              "-" +
              path.split("/").at(-2) +
              ".png",
            fullPage: true,
          });
      }
    }
    await context.close();
  }
  const page = await browser.newPage();
  for (const lang of ["en", "es"])
    for (const path of [
      "about",
      "editorial",
      "verification",
      "methodology",
      "corrections",
      "contact",
      "education",
    ]) {
      const response = await page.goto(`${origin}/${lang}/${path}/`);
      assert.equal(response.status(), 200);
      proof.transparency.push({ lang, path, status: 200 });
    }
  const r = await page.goto(origin + "/sitemap.xml");
  const sitemap = await r.text();
  for (const g of proof.guides) assert(sitemap.includes(origin + g.path));
  assert.equal(errors.length, 0, errors.join("; "));
  writeFileSync(
    "/tmp/econoflux-academy-proof.json",
    JSON.stringify(proof, null, 2),
  );
  console.log(
    JSON.stringify({
      hubs: proof.hubs.length,
      categories: proof.categories.length,
      guideViewportChecks: proof.guides.length,
      transparencyPages: proof.transparency.length,
      errors: errors.length,
      proof: "/tmp/econoflux-academy-proof.json",
    }),
  );
} finally {
  await browser.close();
}
