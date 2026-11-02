import { test, expect } from "@playwright/test";
const screenshotDir = process.env.PLAYWRIGHT_BASE_URL
  ? "test-results/remote"
  : "test-results";
for (const lang of ["en", "es"]) {
  test(`${lang}: navigation, filters, translated search and articles`, async ({
    page,
    request,
  }) => {
    await page.goto(`/${lang}/`);
    await expect(page.locator("h1")).toContainText(
      lang === "en" ? "Crypto moves fast" : "El mundo cripto avanza",
    );
    await expect(page.locator("#story-grid .card:visible")).toHaveCount(3);
    await page.locator('[data-filter="ethereum"]').click();
    await expect(page.locator("#story-grid .card:visible")).toHaveCount(1);
    await page.locator('[data-filter="altcoins"]').click();
    await expect(page.locator("#filter-empty")).toBeVisible();
    await page.locator('[data-filter="all"]').click();
    await page.locator("#story-grid .card a").first().click();
    await expect(page.locator(".prose h2").first()).toHaveText(
      lang === "en" ? "What is Bitcoin?" : "¿Qué es Bitcoin?",
    );
    const response = await request.get(page.url());
    expect(await response.text()).toContain(
      lang === "en" ? "How the network agrees" : "Cómo alcanza acuerdos la red",
    );
    await page
      .locator(`.languages a[lang="${lang === "en" ? "es" : "en"}"]`)
      .click();
    await expect(page).toHaveURL(
      new RegExp(
        lang === "en"
          ? "/es/articles/que-es-bitcoin/"
          : "/en/articles/what-is-bitcoin/",
      ),
    );
    await page.goto(`/${lang}/search/`);
    await page.locator("#query").fill("Ethereum");
    await expect(page.locator(".search-result").first()).toBeVisible();
    await page.locator("#query").fill("xyznothing123");
    await expect(page.locator(".search-result")).toHaveCount(0);
    await expect(page.locator("#result-status")).toContainText(
      lang === "en" ? "No stories" : "No encontramos",
    );
    await page.goto(`/${lang}/category/bitcoin/`);
    await expect(page.locator(".card")).toHaveCount(1);
  });
  test(`${lang}: mobile menu and layouts`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      `/${lang}/`,
      `/${lang}/category/bitcoin/`,
      `/${lang}/articles/${lang === "en" ? "what-is-bitcoin" : "que-es-bitcoin"}/`,
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `${screenshotDir}/${lang}-${route.includes("articles") ? "article" : route.includes("category") ? "category" : "home"}-mobile.png`,
        fullPage: true,
      });
      const other = lang === "en" ? "es" : "en";
      await page.locator(`.languages a[lang="${other}"]`).click();
      await expect(page.locator("html")).toHaveAttribute("lang", other);
      await expect(page.locator("h1")).toBeVisible();
      await page.locator(`.languages a[lang="${lang}"]`).click();
      await expect(page).toHaveURL(new RegExp(route + "$"));
    }
    await page.locator(".menu-toggle").click();
    await expect(page.locator("#mobile-nav")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });
}
test("desktop visual and all internal links resolve", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1448, height: 1086 });
  await page.goto("/en/");
  await page.screenshot({
    path: `${screenshotDir}/home-desktop.png`,
    fullPage: true,
  });
  const links = await page
    .locator('a[href^="/"]')
    .evaluateAll((elements) => [
      ...new Set(elements.map((e) => e.getAttribute("href")!)),
    ]);
  for (const link of links) {
    const r = await request.get(link);
    expect(r.status(), link).toBe(200);
  }
  for (const route of [
    "/en/category/ethereum/",
    "/en/articles/how-ethereum-works/",
  ]) {
    await page.goto(route);
    await page.screenshot({
      path: `${screenshotDir}/${route.includes("articles") ? "article" : "category"}-desktop.png`,
      fullPage: true,
    });
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
});

test("article share copies the current URL", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/es/articles/que-es-bitcoin/");
  await page.locator(".copy-link").first().click();
  await expect(page.locator(".share-status").first()).toHaveText(
    "Enlace copiado",
  );
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
    "/es/articles/que-es-bitcoin/",
  );
});

test("review pages and assets are available and not indexable", async ({
  page,
  request,
}) => {
  for (const route of [
    "/en/",
    "/es/",
    "/en/articles/what-is-bitcoin/",
    "/es/articles/que-es-bitcoin/",
  ]) {
    const response = await request.get(route);
    expect(response.status()).toBe(200);
    if (process.env.PLAYWRIGHT_BASE_URL)
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    await page.goto(route);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(
      page.locator(".demo-label, .demo-notice").first(),
    ).toBeVisible();
    const images = await page
      .locator("img")
      .evaluateAll((items) => [
        ...new Set(items.map((i) => i.getAttribute("src")!)),
      ]);
    for (const src of images)
      expect((await request.get(src)).status(), src).toBe(200);
  }
  expect(await (await request.get("/robots.txt")).text()).toContain(
    "Disallow: /",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "<loc>",
  );
});
