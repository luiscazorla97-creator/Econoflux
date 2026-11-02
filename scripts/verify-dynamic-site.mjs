import { mkdtempSync, rmSync, readFileSync } from "node:fs";
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
  sql(
    readFileSync("automation/migrations/0008_academy.sql", "utf8")
      .replace(/--[^\n]*/g, "")
      .trim(),
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
  // Private fixtures prove the initial server HTML distinguishes all three
  // evidence tiers and that a denial updates the same URLs in both languages.
  for (const status of ["confirmed", "rumor", "leak"]) {
    const reports = pair.map((a) => ({
      ...a,
      id: `local-${status}-${a.lang}`,
      translationId: `local-${status}`,
      slug: `local-${status}-${a.lang}`,
      title: `LOCAL ${status.toUpperCase()} ${a.lang}`,
      confirmation: {
        status,
        resolution: status === "confirmed" ? "confirmed" : "pending",
        checkedAt: "2026-11-02T12:00:00Z",
        explanation: "Local source attribution only",
        confirmedFacts: ["An identifiable outlet reported a claim."],
        unconfirmedClaims:
          status === "confirmed"
            ? []
            : ["The underlying claim is not authenticated."],
        originalReport: {
          label: "Local original report",
          url: "https://example.org/original",
        },
      },
    }));
    sql(
      "INSERT INTO public_articles VALUES " +
        reports
          .map(
            (a) =>
              `(${literal(a.translationId)},${literal(a.lang)},${literal(a.slug)},1,${literal(JSON.stringify(a))},1,${literal(a.publishedAt)},NULL)`,
          )
          .join(",") +
        ";",
    );
    for (const a of reports) {
      const root = `http://127.0.0.1:${port}`;
      const path = `/${a.lang}/articles/${a.slug}/`;
      const html = await (await fetch(root + path)).text();
      assert(
        html.includes(`data-confirmation="${status}"`),
        "Evidence tier missing from initial HTML",
      );
      assert(
        html.includes("https://example.org/original"),
        "Original report missing",
      );
      assert(
        html.includes(`property="og:title" content="Fixture SEO"`),
        "Article social metadata changed",
      );
      const hub =
        a.lang === "en"
          ? "/en/rumors-and-leaks/"
          : "/es/rumores-y-filtraciones/";
      assert.equal(
        (await (await fetch(root + hub)).text()).includes(a.title),
        status !== "confirmed",
        "Rumors archive mixes confirmed and pending reports",
      );
      if (status === "rumor") {
        a.confirmation = {
          ...a.confirmation,
          status: "confirmed",
          resolution: "denied",
          originStatus: "rumor",
          explanation: "Identifiable evidence denies the earlier report",
          unconfirmedClaims: [],
          initialReport: a.confirmation.originalReport,
          originalReport: {
            label: "Denial record",
            url: "https://example.org/denial",
          },
        };
        a.updatedAt = "2026-11-02T13:00:00Z";
        sql(
          `UPDATE public_articles SET revision=2,value=${literal(JSON.stringify(a))},updated_at=${literal(a.updatedAt)} WHERE translation_id=${literal(a.translationId)} AND lang=${literal(a.lang)};`,
        );
        const updated = await (await fetch(root + path)).text();
        assert(
          updated.includes(
            a.lang === "en" ? "DENIED REPORT" : "REPORTE DESMENTIDO",
          ),
          "Denial not distinguished",
        );
        assert(
          updated.includes("https://example.org/original") &&
            updated.includes("https://example.org/denial"),
          "Original provenance lost during correction",
        );
        assert(
          updated.includes(a.publishedAt.slice(0, 10)),
          "Original publication date lost",
        );
        assert(
          (await (await fetch(root + hub)).text()).includes(a.title),
          "Resolved report disappeared from its archive",
        );
      }
    }
  }
  const guideId = "local-academy-fixture";
  sql(
    `INSERT INTO academy_topics(id,intent_key,category,cluster,spec,published_at) VALUES('${guideId}','fixture-guide','security','fixture','{"terms":["dynamic"],"cluster":"fixture"}','2026-11-01T12:00:00Z');`,
  );
  const guides = pair.map((a) => ({
    ...a,
    id: guideId + "-" + a.lang,
    translationId: guideId,
    kind: "guide",
    academyCategory: "security",
    cluster: "fixture",
    level: "beginner",
    title: "ACADEMY DYNAMIC FIXTURE " + a.lang,
    slug: "academy-fixture-" + a.lang,
  }));
  sql(
    "INSERT INTO public_guides(translation_id,lang,slug,revision,value,visible,published_at) VALUES " +
      guides
        .map(
          (a) =>
            `('${guideId}',${literal(a.lang)},${literal(a.slug)},1,${literal(JSON.stringify(a))},1,'2026-11-01T12:00:00Z')`,
        )
        .join(",") +
      ";",
  );
  sql(
    `INSERT INTO academy_assets(id,svg,png,created_at,rights) VALUES('${guideId}','<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>',X'89504e470d0a1a0a','2026-11-01T12:00:00Z','Local fixture only');`,
  );
  for (const extension of ["svg", "png"]) {
    const image = await fetch(
      `http://127.0.0.1:${port}/images/academy/${guideId}.${extension}`,
    );
    assert.equal(
      image.status,
      200,
      "Guide image route must resolve without a trailing slash",
    );
    assert.equal(
      image.headers.get("content-type"),
      extension === "svg" ? "image/svg+xml" : "image/png",
    );
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:${port}/images/academy/${guideId}.${extension}`,
          { method: "HEAD" },
        )
      ).status,
      200,
      "Scheduler must be able to verify the image",
    );
  }
  for (const g of guides) {
    const path = g.lang === "en" ? "/en/academy/" : "/es/academia/";
    const guidePath =
      path + (g.lang === "en" ? "guides/" : "guias/") + g.slug + "/";
    const response = await fetch(`http://127.0.0.1:${port}` + guidePath);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert(html.includes(g.title), "Academy title missing in initial HTML");
    assert(
      html.includes("FULL ARTICLE IN INITIAL HTML"),
      "Academy body missing in initial HTML",
    );
    assert(
      html.includes('property="og:title" content="Fixture SEO"'),
      "Guide-specific social metadata missing",
    );
    assert(
      html.includes('"@type":"Article"'),
      "Guide schema should be Article",
    );
    assert(
      html.includes('hreflang="' + (g.lang === "en" ? "es" : "en") + '"'),
      "Translation missing",
    );
    assert(
      (await (await fetch(`http://127.0.0.1:${port}` + path)).text()).includes(
        g.title,
      ),
      "Guide missing from Academy hub",
    );
    assert(
      (
        await (
          await fetch(
            `http://127.0.0.1:${port}/${g.lang}/articles/dynamic-fixture-${g.lang}/`,
          )
        ).text()
      ).includes(g.title),
      "News-to-guide internal link missing",
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
    "Live D1 inserts became visible in EN/ES news and Academy HTML, individual social metadata, translated routes, internal links, hubs and search without rebuilding. No provider calls or remote publication.",
  );
} finally {
  child?.kill("SIGTERM");
  rmSync(persist, { recursive: true, force: true });
}
