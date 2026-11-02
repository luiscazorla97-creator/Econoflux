import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

// Input contains only public URLs/metadata, never secrets or private drafts.
const articles = JSON.parse(readFileSync(process.argv[2], "utf8"));
const root = "https://econoflux.pages.dev";
const browser = await chromium.launch({
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const path = (a) => `/${a.lang}/articles/${a.slug}/`;
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    for (const a of articles) {
      const response = await page.goto(root + path(a), {
        waitUntil: "networkidle",
      });
      assert.equal(response.status(), 200, path(a));
      assert.equal(await page.locator("html").getAttribute("lang"), a.lang);
      assert.equal(
        await page
          .locator('meta[name="econoflux-article-id"]')
          .getAttribute("content"),
        a.translation_id,
      );
      assert.equal(
        await page
          .locator('meta[name="econoflux-revision"]')
          .getAttribute("content"),
        String(a.revision),
      );
      assert.equal(await page.locator("h1").textContent(), a.title);
      assert((await response.allHeaders())["x-robots-tag"].includes("noindex"));
      assert(await page.locator(".article-page").innerText());
      assert(
        (await page.locator(".prose > section:not(.sources) p").count()) > 0,
      );
      assert.equal(await page.locator(".demo-notice").count(), 0);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "Horizontal overflow: " + path(a),
      );
      const other = articles.find(
        (b) => b.translation_id === a.translation_id && b.lang !== a.lang,
      );
      assert.equal(
        await page
          .locator(`.languages a[lang="${other.lang}"]`)
          .getAttribute("href"),
        path(other),
      );
      await page.locator(`.languages a[lang="${other.lang}"]`).click();
      await page.waitForURL(root + path(other));
      assert.equal(await page.locator("html").getAttribute("lang"), other.lang);
      console.log(
        JSON.stringify({
          width: viewport.width,
          path: path(a),
          status: 200,
          revision: a.revision,
          languageSwitch: true,
        }),
      );
    }
    for (const lang of ["en", "es"]) {
      const home = await page.goto(`${root}/${lang}/`, {
        waitUntil: "networkidle",
      });
      assert.equal(home.status(), 200);
      assert.equal(await page.locator(".demo-label").count(), 0);
      for (const a of articles.filter((a) => a.lang === lang))
        assert(
          await page.locator(`a[href="${path(a)}"]`).count(),
          "Not on homepage: " + path(a),
        );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      const article = articles.find((a) => a.lang === lang);
      const category = await page.goto(
        `${root}/${lang}/category/${article.category}/`,
        { waitUntil: "networkidle" },
      );
      assert.equal(category.status(), 200);
      assert(await page.locator(`a[href="${path(article)}"]`).count());
      const search = await page.evaluate(async (language) => {
        const response = await fetch(`/api/search/?lang=${language}&q=Binance`);
        return { status: response.status, json: await response.json() };
      }, lang);
      assert.equal(search.status, 200);
      assert(search.json.items.some((a) => a.title.includes("Binance")));
      console.log(
        JSON.stringify({
          width: viewport.width,
          lang,
          home: true,
          category: true,
          search: true,
        }),
      );
    }
    if (viewport.width === 390)
      await page.screenshot({
        path: "/tmp/econoflux-live-mobile.png",
        fullPage: true,
      });
    await page.close();
  }
} finally {
  await browser.close();
}
