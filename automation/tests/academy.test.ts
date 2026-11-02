import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import {
  academySlot,
  academyWeek,
  nextAcademySlot,
  academyTick,
  publishGuidePair,
  seedAcademy,
  sourceSignature,
  guideAuditView,
  validateGuideAudit,
} from "../src/academy";
import { initialTopics } from "../src/academy-topics";
import { Store } from "../src/store";
import { hash } from "../src/policy";
import { guideUrl } from "../../src/content/academy";
import { relevantGuide } from "../../src/lib/academy";
import type { Env } from "../src/types";
let mf: Miniflare, store: Store, env: Env;
const now = new Date("2026-11-02T10:00:00Z");
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "academy-test" },
  });
  const db = await mf.getD1Database("DB");
  for (const file of [
    "0001_editorial.sql",
    "0002_hourly.sql",
    "0008_academy.sql",
  ]) {
    const sql = readFileSync("automation/migrations/" + file, "utf8").replace(
      /--[^\n]*/g,
      "",
    );
    for (const s of sql.split(";").filter((s) => s.trim()))
      await db.prepare(s).run();
  }
  store = new Store(db as any);
  env = {
    DB: db as any,
    AI_MODEL: "gpt-5-mini",
    SITE_URL: "https://econoflux.com",
    GITHUB_REPOSITORY: "fixture",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "econoflux",
  };
  await seedAcademy(store);
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function enable() {
  await store.db
    .prepare("UPDATE automation_control SET enabled=1,paused=0 WHERE id=1")
    .run();
  await store.db
    .prepare("UPDATE academy_control SET enabled=1 WHERE id=1")
    .run();
  await store.db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.enabled',json('true'),'$.paused',json('false'),'$.mode','active','$.dailyBudgetMicrousd',3000000,'$.dailyAICalls',160)",
    )
    .run();
}
function pair() {
  return ["en", "es"].map((lang) => ({
    kind: "guide",
    id: initialTopics[0].id + "-" + lang,
    translationId: initialTopics[0].id,
    lang,
    slug: lang === "en" ? initialTopics[0].slugEn : initialTopics[0].slugEs,
    editorialRevision: 1,
    academyCategory: "security",
    cluster: "wallet-security",
    level: "beginner",
    category: "bitcoin",
    tags: ["security"],
    title: "Fixture guide",
    summary: "Educational security fixture",
    seoTitle: "Educational guide",
    seoDescription: "A test guide",
    sources: initialTopics[0].sources.map((s) => ({
      url: s.url,
      label: s.label,
    })),
    status: "published",
    demo: false,
    publishedAt: now.toISOString(),
    author: "AI-assisted EconoFlux",
    image: {
      src: "/images/academy/test.svg",
      alt: "Diagram",
      credit: "EconoFlux original",
    },
    sections: Array.from({ length: 9 }, (_, i) => ({
      id: i === 8 ? "faq" : "section-" + i,
      title: i === 8 ? "FAQ" : "Section",
      text: [Array(180).fill("educational").join(" ")],
    })),
  }));
}
it("uses UTC slots, a Monday week and no catch-up burst", () => {
  expect(academySlot(new Date("2026-11-02T09:59:59Z"))).toBeNull();
  expect(academySlot(now)).toContain("10:00");
  expect(academySlot(new Date("2026-11-03T12:00:00Z"))).toBeNull();
  expect(academyWeek(new Date("2026-11-08T23:59:59Z"))).toBe(
    "2026-11-02T00:00:00.000Z",
  );
  expect(nextAcademySlot(now, true)).toBe("2026-11-09T10:00:00.000Z");
});
it("never spends while news is active or when Academy is disabled", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await academyTick(env, { status: "ok", didWork: true }, now)).status,
  ).toBe("news_priority");
  expect((await academyTick(env, { status: "ok" }, now)).status).toBe(
    "disabled",
  );
  expect(fetcher).not.toHaveBeenCalled();
});
it("defers guides to preserve the news budget", async () => {
  await enable();
  const { dayKey } = await import("../src/policy");
  await store.db
    .prepare("INSERT INTO usage(day,ai_actual) VALUES(?,?)")
    .bind(dayKey(now), 2300000)
    .run();
  expect((await academyTick(env, { status: "waiting" }, now)).status).toBe(
    "budget_deferred",
  );
  expect(
    await store.db.prepare("SELECT id FROM academy_jobs").first(),
  ).toBeNull();
});
it("enqueues a unique initial topic independently of news cycles", async () => {
  await enable();
  const result = await academyTick(env, { status: "waiting" }, now);
  expect(result.status).toBe("queued");
  expect(
    (await store.db.prepare("SELECT count(*) n FROM academy_jobs").first<any>())
      ?.n,
  ).toBe(1);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM cycle_items").first<any>())
      ?.n,
  ).toBe(0);
});
it("publishes both languages atomically and keeps slugs and dates on update", async () => {
  const topic = initialTopics[0],
    p: any = {
      pair: pair(),
      audit: { approved: true },
      signature: "sourcehash",
    };
  p.auditHash = await hash(JSON.stringify(p.pair));
  const job: any = {
    id: topic.id + "-r1",
    topic_id: topic.id,
    kind: "new",
    revision: 1,
  };
  await store.db
    .prepare(
      "INSERT INTO academy_jobs(id,topic_id,kind,revision,next_attempt,created_at) VALUES(?,?,'new',1,?,?)",
    )
    .bind(job.id, topic.id, now.toISOString(), now.toISOString())
    .run();
  await publishGuidePair(store, job, topic, p, now);
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    )?.n,
  ).toBe(2);
  expect(
    (await store.db.prepare("SELECT png FROM academy_assets").first<any>())?.png
      .length,
  ).toBeGreaterThan(1000);
  const second = new Date(+now + 86400000);
  p.pair = pair().map((a) => ({
    ...a,
    slug: "changed-slug",
    editorialRevision: 2,
  }));
  p.auditHash = await hash(JSON.stringify(p.pair));
  await publishGuidePair(
    store,
    { ...job, kind: "review", revision: 2 },
    topic,
    p,
    second,
  );
  const rows = (
    await store.db
      .prepare("SELECT slug,published_at,updated_at FROM public_guides")
      .all<any>()
  ).results;
  expect(rows[0].published_at).toBe(now.toISOString());
  expect(rows[0].updated_at).toBe(second.toISOString());
  expect(rows.some((r) => r.slug === "changed-slug")).toBe(false);
});
it("refuses partial or unaudited pairs", async () => {
  const p: any = { pair: pair().slice(0, 1), audit: { approved: true } };
  p.auditHash = await hash(JSON.stringify(p.pair));
  await expect(
    publishGuidePair(
      store,
      { kind: "new", revision: 1 } as any,
      initialTopics[0],
      p,
      now,
    ),
  ).rejects.toThrow();
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    )?.n,
  ).toBe(0);
});
it("enforces three new topics per week, without consuming news capacity", async () => {
  await store.db
    .prepare("UPDATE academy_topics SET published_at=? WHERE id IN (?,?,?)")
    .bind(now.toISOString(), ...initialTopics.map((t) => t.id))
    .run();
  const spec = { ...initialTopics[0], id: "fourth-guide" };
  const p: any = {
    pair: pair().map((a) => ({ ...a, translationId: spec.id })),
    audit: { approved: true },
  };
  p.auditHash = await hash(JSON.stringify(p.pair));
  await expect(
    publishGuidePair(store, { kind: "new", revision: 1 } as any, spec, p, now),
  ).rejects.toThrow("Tres temas");
});
it("uses localized official routes and relevant matches", () => {
  expect(guideUrl({ lang: "es", slug: "wallet-fria" })).toBe(
    "/es/academia/guias/wallet-fria/",
  );
  expect(guideUrl({ lang: "en", slug: "cold-wallet" })).toBe(
    "/en/academy/guides/cold-wallet/",
  );
  expect(
    relevantGuide(
      {
        title: "SEC alleges fraud",
        summary: "An alleged scheme",
        tags: [],
      } as any,
      ["fraud"],
    ),
  ).toBe(true);
  expect(
    relevantGuide(
      {
        title: "Bitcoin fee update",
        summary: "Network activity",
        tags: [],
      } as any,
      ["fraud"],
    ),
  ).toBe(false);
});
it("keeps site metadata out of factual review and refuses hallucinated findings", () => {
  const a = pair()[0] as any,
    view = guideAuditView(a);
  expect(view).not.toHaveProperty("publishedAt");
  expect(view).not.toHaveProperty("author");
  expect(view).not.toHaveProperty("image");
  expect(() =>
    validateGuideAudit(
      {
        approved: false,
        issues: [
          {
            lang: "en",
            quote: "Imaginary unsafe claim",
            reason: "fixture",
            correction: "fixture",
          },
        ],
      },
      [a],
    ),
  ).toThrow("pasaje real");
  expect(() =>
    validateGuideAudit(
      {
        approved: false,
        issues: [
          {
            lang: "en",
            quote: a.title,
            reason: "fixture",
            correction: "fixture",
          },
        ],
      },
      [a],
    ),
  ).not.toThrow();
  expect(() =>
    validateGuideAudit({ approved: true, issues: [] }, [a]),
  ).not.toThrow();
});
it("checks unchanged sources after 90 days without refreshing public dates", async () => {
  await enable();
  const spec = initialTopics[0],
    text = Array(100).fill("Official documentation evidence").join(" ");
  const signature = await hash(
    sourceSignature(spec.sources.map((s) => ({ url: s.url, text }))),
  );
  const published = new Date(+now - 91 * 86400000).toISOString();
  await store.db
    .prepare(
      "UPDATE academy_topics SET status='published',published_at=?,revision=1 WHERE id IN (?,?,?)",
    )
    .bind(published, ...initialTopics.map((t) => t.id))
    .run();
  await store.db
    .prepare(
      "UPDATE academy_topics SET next_review_at=?,source_hash=? WHERE id=?",
    )
    .bind(now.toISOString(), signature, spec.id)
    .run();
  for (const a of pair())
    await store.db
      .prepare(
        "INSERT INTO public_guides(translation_id,lang,slug,revision,value,published_at) VALUES(?,?,?,1,?,?)",
      )
      .bind(
        spec.id,
        a.lang,
        a.slug,
        JSON.stringify({ ...a, publishedAt: published }),
        published,
      )
      .run();
  // No slot is due on Tuesday, so the pending 90-day review gets the turn.
  const reviewDate = new Date("2026-11-03T09:00:00Z");
  expect(
    (await academyTick(env, { status: "waiting" }, reviewDate)).status,
  ).toBe("queued");
  const fetcher = vi.fn(
    async () =>
      new Response(text, { headers: { "content-type": "text/plain" } }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(
    (
      await academyTick(
        env,
        { status: "waiting" },
        new Date(+reviewDate + 120000),
      )
    ).status,
  ).toBe("ok");
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    (await store.db.prepare("SELECT phase FROM academy_jobs").first<any>())
      ?.phase,
  ).toBe("unchanged");
  const rows = (
    await store.db
      .prepare("SELECT published_at,updated_at,revision FROM public_guides")
      .all<any>()
  ).results;
  expect(
    rows.every(
      (r) =>
        r.published_at === published &&
        r.updated_at === null &&
        r.revision === 1,
    ),
  ).toBe(true);
});
