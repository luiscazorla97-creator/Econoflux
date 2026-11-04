import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const origin = process.env.PERFORMANCE_ORIGIN || "https://econoflux.com";
const out = process.env.PERFORMANCE_OUTPUT || ".local/performance";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
  proxy: process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined,
});
const proof = [];
try {
  for (const [lang, width] of [
    ["es", 412],
    ["en", 412],
    ["es", 1440],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height: 823 },
      locale: lang === "es" ? "es-ES" : "en-US",
    });
    await context.addInitScript(() => {
      window.__layoutShifts = [];
      new PerformanceObserver((list) => {
        for (const e of list.getEntries())
          if (!e.hadRecentInput)
            window.__layoutShifts.push({
              time: e.startTime,
              value: e.value,
              sources: e.sources?.map((s) => ({
                tag: s.node?.tagName,
                cls: String(s.node?.className || ""),
                previous: s.previousRect,
                current: s.currentRect,
              })),
            });
      }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    const response = await page.goto(`${origin}/${lang}/`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    assert.equal(response.status(), 200);
    await page.waitForTimeout(12000);
    const data = await page.evaluate(() => {
      const hero = document.querySelector(".hero-art");
      const preload = document.querySelector('link[rel="preload"][as="image"]');
      let max = 0,
        session = 0,
        start = 0,
        last = 0;
      for (const e of window.__layoutShifts) {
        if (e.time - last < 1000 && e.time - start < 5000) session += e.value;
        else {
          session = e.value;
          start = e.time;
        }
        last = e.time;
        max = Math.max(max, session);
      }
      return {
        cls: max,
        shifts: window.__layoutShifts,
        hero: {
          src: hero.currentSrc,
          complete: hero.complete && hero.naturalWidth > 0,
          loading: hero.loading,
          priority: hero.fetchPriority,
          srcset: hero.getAttribute("srcset"),
          sizes: hero.getAttribute("sizes"),
          rect: hero.getBoundingClientRect().toJSON(),
        },
        preload: {
          srcset: preload?.getAttribute("imagesrcset"),
          sizes: preload?.getAttribute("imagesizes"),
        },
        stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')]
          .map((e) => e.href)
          .filter((u) => u.startsWith(location.origin)),
        inlineLayout: [...document.querySelectorAll("style")].some((e) =>
          e.textContent.includes(".hero-art"),
        ),
        heroRequests: performance
          .getEntriesByType("resource")
          .filter((e) => /\/images\/hero(?:-768)?\.webp$/.test(e.name))
          .map((e) => e.name),
        fonts: [...document.fonts].map((f) => f.family),
        overflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(data.hero.complete);
    assert.equal(data.hero.priority, "high");
    assert.notEqual(data.hero.loading, "lazy");
    assert.equal(data.preload.srcset, data.hero.srcset);
    assert.equal(data.preload.sizes, data.hero.sizes);
    assert(data.inlineLayout);
    assert.equal(data.stylesheets.length, 0);
    assert.equal(
      data.heroRequests.length,
      1,
      "Duplicate responsive hero download",
    );
    assert(!data.overflow);
    assert.equal(
      await page.locator("link[rel=canonical]").getAttribute("href"),
      `${origin}/${lang}/`,
    );
    assert(
      (
        await page.locator("meta[name=robots]").getAttribute("content")
      ).includes("max-image-preview:large"),
    );
    assert.equal(
      await page
        .locator('script[src*="adsbygoogle.js?client=ca-pub-1382859681401211"]')
        .count(),
      1,
    );
    assert.equal(await page.locator("h1").count(), 1);
    assert((await page.locator("#story-grid .card-link").count()) > 0);
    await page.screenshot({ path: `${out}/${lang}-${width}.png` });
    proof.push({ lang, width, ...data });
    await context.close();
  }
  writeFileSync(`${out}/verification.json`, JSON.stringify(proof, null, 2));
  console.log(
    JSON.stringify({
      passed: proof.length,
      cases: proof.map((p) => ({
        lang: p.lang,
        width: p.width,
        CLS: p.cls,
        heroRequests: p.heroRequests.length,
        blockingStylesheets: p.stylesheets.length,
      })),
    }),
  );
} finally {
  await browser.close();
}
