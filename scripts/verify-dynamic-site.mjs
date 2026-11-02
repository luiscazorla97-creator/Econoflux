import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const persist = mkdtempSync(join(tmpdir(), "econoflux-live-test-"));
const port = 4329;
let child;
const base = ["node_modules/wrangler/bin/wrangler.js"];
function command(args) {
  const r = spawnSync(process.execPath, [...base, ...args], {
    env: {
      ...process.env,
      CLOUDFLARE_SEND_METRICS: "false",
      WRANGLER_LOG_PATH: join(persist, "cli.log"),
    },
    encoding: "utf8",
  });
  if (r.status !== 0) throw Error(r.stderr.slice(-1200));
}
const sql = (statement) =>
  command([
    "d1",
    "execute",
    "econoflux-editorial",
    "--local",
    "--config",
    "wrangler.toml",
    "--persist-to",
    persist,
    "--command",
    statement,
  ]);
try {
  sql(
    "CREATE TABLE public_articles(translation_id TEXT,lang TEXT,slug TEXT,revision INTEGER,value TEXT,visible INTEGER,published_at TEXT,updated_at TEXT,PRIMARY KEY(translation_id,lang));",
  );
  child = spawn(
    process.execPath,
    [
      ...base,
      "pages",
      "dev",
      "dist",
      "--port",
      String(port),
      "--ip",
      "127.0.0.1",
      "--persist-to",
      persist,
    ],
    {
      env: {
        ...process.env,
        CLOUDFLARE_SEND_METRICS: "false",
        WRANGLER_LOG_PATH: join(persist, "server.log"),
      },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let errors = "";
  child.stderr.on("data", (b) => (errors += b.toString()));
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/en/`);
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  assert(ready, "Runtime not ready: " + errors.slice(-1000));
  const emptyHome = await (await fetch(`http://127.0.0.1:${port}/en/`)).text();
  assert(!emptyHome.includes("/articles/"), "Demo articles exposed by default");
  const make = (lang) => ({
    id: "local-only-" + lang,
    translationId: "local-only-fixture",
    lang,
    slug: "dynamic-fixture-" + lang,
    title: "LOCAL DYNAMIC FIXTURE " + lang,
    summary: "A local-only runtime fixture",
    seoTitle: "Fixture SEO",
    seoDescription: "Fixture description",
    category: "bitcoin",
    tags: ["bitcoin"],
    image: {
      src: "/images/bitcoin.webp",
      alt: "Local fixture illustration",
      credit: "EconoFlux",
    },
    sources: [{ label: "Fixture", url: "https://example.org/source" }],
    publishedAt: "2026-11-01T12:00:00Z",
    status: "published",
    demo: false,
    editorialRevision: 1,
    author: "Local fixture",
    sections: [
      {
        id: "facts",
        title: "Local facts",
        text: ["FULL ARTICLE IN INITIAL HTML. LOCAL ONLY."],
      },
    ],
  });
  const pair = ["en", "es"].map(make);
  const literal = (s) => "'" + s.replaceAll("'", "''") + "'";
  sql(
    "INSERT INTO public_articles VALUES " +
      pair
        .map(
          (a) =>
            `('local-only-fixture',${literal(a.lang)},${literal(a.slug)},1,${literal(JSON.stringify(a))},1,'2026-11-01T12:00:00Z',NULL)`,
        )
        .join(",") +
      ";",
  );
  for (const a of pair) {
    const root = `http://127.0.0.1:${port}`;
    const article = await fetch(root + `/${a.lang}/articles/${a.slug}/`);
    assert.equal(article.status, 200);
    assert(article.headers.get("x-robots-tag").includes("noindex"));
    const html = await article.text();
    assert(html.includes("FULL ARTICLE IN INITIAL HTML"));
    assert(
      html.includes('name="econoflux-article-id" content="local-only-fixture"'),
    );
    assert(
      html.includes(
        "/" + (a.lang === "en" ? "es" : "en") + "/articles/dynamic-fixture-",
      ),
    );
    for (const path of [
      `/${a.lang}/`,
      `/${a.lang}/category/bitcoin/`,
      `/${a.lang}/search/`,
    ])
      assert(
        (await (await fetch(root + path)).text()).includes(a.title),
        "New D1 record not immediately visible at " + path,
      );
  }
  const searchResponse = await fetch(
    `http://127.0.0.1:${port}/api/search?lang=en&q=DYNAMIC`,
  );
  assert.equal(searchResponse.status, 200);
  assert(
    (await searchResponse.json()).items.some(
      (a) => a.title === "LOCAL DYNAMIC FIXTURE en",
    ),
  );
  console.log(
    "Live D1 insert became visible in EN/ES article HTML, home, category and search without rebuilding. No provider calls or remote publication.",
  );
} finally {
  child?.kill("SIGTERM");
  rmSync(persist, { recursive: true, force: true });
}
