import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const file = "src/content/published.json",
  original = readFileSync(file, "utf8"),
  out = mkdtempSync(join(tmpdir(), "econoflux-editorial-"));
assert.deepEqual(
  JSON.parse(original),
  [],
  "This integration fixture requires the initial empty catalog; never overwrite existing articles",
);
const pair = ["en", "es"].map((lang) => ({
  id: "fixture-" + lang,
  translationId: "editorial-build-fixture",
  lang,
  slug: "editorial-integration-" + lang,
  title: lang === "en" ? "EDITORIAL BUILD TEST" : "PRUEBA EDITORIAL",
  summary: "Local integration fixture only",
  seoTitle: "Local fixture SEO " + lang,
  seoDescription: "Local fixture description " + lang,
  category: "bitcoin",
  tags: ["bitcoin"],
  image: {
    src: "/images/bitcoin.webp",
    alt: "Test illustration",
    credit: "EconoFlux",
  },
  sources: [{ label: "Fixture source", url: "https://example.org/primary" }],
  publishedAt: "2026-10-28T14:23:53Z",
  updatedAt: "2026-11-01T12:00:00Z",
  status: "published",
  demo: false,
  editorialRevision: 2,
  author: "Integration fixture",
  sections: [
    {
      id: "facts",
      title: "Fixture",
      text: ["LOCAL TEST ONLY. Never deployed."],
    },
  ],
}));
try {
  writeFileSync(file, JSON.stringify(pair));
  const result = spawnSync(
    process.execPath,
    ["node_modules/astro/astro.js", "build", "--outDir", out],
    {
      env: {
        ...process.env,
        ASTRO_TELEMETRY_DISABLED: "1",
        SITE_MODE: "preview",
      },
      encoding: "utf8",
    },
  );
  if (result.status !== 0)
    throw Error("Integration build failed: " + result.stderr.slice(-1500));
  for (const a of pair) {
    const html = readFileSync(
      join(out, a.lang, "articles", a.slug, "index.html"),
      "utf8",
    );
    assert(
      html.includes(
        'name="econoflux-article-id" content="editorial-build-fixture"',
      ),
    );
    assert(html.includes('name="econoflux-revision" content="2"'));
    assert(html.includes("noindex, nofollow"));
    assert(html.includes("LOCAL TEST ONLY. Never deployed."));
    assert(
      html.includes(
        "/" +
          (a.lang === "en" ? "es" : "en") +
          "/articles/editorial-integration-",
      ),
    );
    assert(!html.includes("Invalid Date"));
    assert(
      readFileSync(join(out, a.lang, "search", "index.html"), "utf8").includes(
        a.title,
      ),
    );
    assert(
      readFileSync(
        join(out, a.lang, "category", "bitcoin", "index.html"),
        "utf8",
      ).includes(a.title),
    );
  }
  console.log(
    "Bilingual articles rendered as initial HTML with revision markers, correct dates, translation links, search/category inclusion and noindex. Fixtures never deployed.",
  );
} finally {
  writeFileSync(file, original);
  rmSync(out, { recursive: true, force: true });
}
