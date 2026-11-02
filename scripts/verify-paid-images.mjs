import { chromium } from "@playwright/test";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
const articles = JSON.parse(
  readFileSync(
    process.argv[2] || "/tmp/econoflux-paid-images-public.json",
    "utf8",
  ),
);
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
  pages: [],
  imageHashes: [],
  adSense:
    "HTML integration; ad delivery depends on Google account approval/settings",
};
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    for (const a of articles) {
      const url = `https://econoflux.com/${a.lang}/articles/${a.slug}/`,
        response = await page.goto(url, { waitUntil: "load" });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator("h1").innerText(), a.title);
      assert.equal(
        await page.locator('meta[property="og:image"]').getAttribute("content"),
        "https://econoflux.com" + a.public_path,
      );
      await page.waitForFunction(() => {
        const img = document.querySelector(".article-figure img");
        return img?.complete && img.naturalWidth > 0;
      });
      const data = await page.evaluate(async (path) => {
        const r = await fetch(path),
          body = await r.arrayBuffer(),
          bytes = new Uint8Array(body),
          image = document.querySelector(".article-figure img");
        return {
          status: r.status,
          type: r.headers.get("content-type"),
          size: bytes.length,
          format: new TextDecoder().decode(bytes.slice(8, 12)),
          hash: [...new Uint8Array(await crypto.subtle.digest("SHA-256", body))]
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""),
          width: image.naturalWidth,
          height: image.naturalHeight,
        };
      }, a.public_path);
      assert.equal(data.status, 200);
      assert.equal(data.type, "image/webp");
      assert.equal(data.format, "WEBP");
      assert.equal(data.hash, a.content_hash);
      assert.equal(data.width, 1536);
      assert.equal(data.height, 1024);
      assert(data.size < 300000);
      assert.equal(
        await page
          .locator(
            'script[src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1382859681401211"]',
          )
          .count(),
        1,
      );
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
      );
      proof.pages.push({ url, width, image: a.public_path, ...data });
      proof.imageHashes.push(data.hash);
      if (a.lang === "es" && width === 390)
        await page.screenshot({
          path: `/tmp/econoflux-paid-${a.translation_id}-mobile.png`,
          fullPage: false,
        });
      if (width === 1440 && a.lang === "en") {
        const bytes = await page.evaluate(
          async (path) => [
            ...new Uint8Array(await (await fetch(path)).arrayBuffer()),
          ],
          a.public_path,
        );
        writeFileSync(
          `/tmp/econoflux-paid-${a.translation_id}.webp`,
          Buffer.from(bytes),
        );
      }
    }
    await context.close();
  }
  assert.equal(
    new Set(proof.imageHashes).size,
    new Set(articles.map((a) => a.translation_id)).size,
    "Distinct stories must have distinct image bytes",
  );
  const page = await browser.newPage();
  let r = await page.goto("https://econoflux.com/ads.txt");
  assert.equal(r.status(), 200);
  assert(
    (await r.text()).includes(
      "google.com, pub-1382859681401211, DIRECT, f08c47fec0942fa0",
    ),
  );
  for (const lang of ["en", "es"]) {
    await page.goto(`https://econoflux.com/${lang}/privacy/`, {
      waitUntil: "load",
    });
    assert((await page.locator("main").innerText()).includes("Google"));
  }
  writeFileSync(
    "/tmp/econoflux-paid-images-proof.json",
    JSON.stringify(proof, null, 2),
  );
  console.log(
    JSON.stringify({
      articleViewportChecks: proof.pages.length,
      uniqueImages: new Set(proof.imageHashes).size,
      adsenseScript: "one per article",
      adsTxt: 200,
      proof: "/tmp/econoflux-paid-images-proof.json",
    }),
  );
} finally {
  await browser.close();
}
