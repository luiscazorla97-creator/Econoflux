import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { Store } from "../src/store";
import { stagePair, confirmPair, reserveCycle } from "../src/live-publish";
import { hourlyTick } from "../src/hourly";
import { handle } from "../src/index";
import { prepare } from "../src/engine";
import type { Env, Event } from "../src/types";
let mf: Miniflare, store: Store, env: Env;
const now = new Date();
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "hourly-test" },
  });
  const db = await mf.getD1Database("DB");
  for (const file of [
    "0001_editorial.sql",
    "0002_hourly.sql",
    "0003_editorial_updates.sql",
  ])
    for (const sql of readFileSync("automation/migrations/" + file, "utf8")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  store = new Store(db as any);
  env = {
    DB: db as any,
    SITE_URL: "https://example.org",
    AI_MODEL: "gpt-5-mini",
    GITHUB_REPOSITORY: "fixture/repo",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "fixture",
  };
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function enabled() {
  await store.db
    .prepare("UPDATE automation_control SET enabled=1,paused=0 WHERE id=1")
    .run();
}
async function job(n: number, score = 90) {
  const id = n.toString(16).padStart(24, "0");
  await store.db
    .prepare(
      "INSERT INTO events(id,provider_id,fingerprint,title,url,detected_at,state,selection_reason,approved_revision,importance) VALUES(?,?,?,?,?,?,'approved','Verified fixture',1,?)",
    )
    .bind(
      id,
      id,
      id,
      "Fixture " + n,
      "https://example.org/" + n,
      now.toISOString(),
      score,
    )
    .run();
  for (const lang of ["en", "es"]) {
    const a = {
      id: id + "-" + lang,
      translationId: id,
      lang,
      slug: "fixture-" + n + "-" + lang,
      title: "Verified fixture " + lang,
      summary: "A verified fixture",
      seoTitle: "Fixture",
      seoDescription: "Description",
      category: "bitcoin",
      tags: ["bitcoin"],
      image: {
        src: "/images/bitcoin.webp",
        alt: "Illustration",
        credit: "EconoFlux",
      },
      sources: [
        { label: "Primary fixture", url: "https://example.org/source" },
      ],
      publishedAt: now.toISOString(),
      status: "draft",
      demo: false,
      editorialRevision: 1,
      author: "Fixture",
      sections: [{ id: "facts", title: "Facts", text: ["5 verified facts."] }],
    };
    await store.db
      .prepare(
        "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(?,?,1,?,1,?)",
      )
      .bind(id, lang, JSON.stringify(a), now.toISOString())
      .run();
  }
  return (await store.event(id))!;
}
function publicFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any) => {
      const path = new URL(String(input)).pathname;
      const match = path.match(/fixture-(\d+)-(en|es)/);
      if (!match) return new Response("not found", { status: 404 });
      const id = Number(match[1]).toString(16).padStart(24, "0");
      return new Response(
        `<html lang="${match[2]}"><meta name="econoflux-article-id" content="${id}"><meta name="econoflux-revision" content="1">full fixture article`,
      );
    }),
  );
}
it("migration preserves private draft history and replaces daily targets without enabling anything", async () => {
  const s = (await store.settings()).value as any;
  expect(s.dailyTarget).toBeUndefined();
  expect(s.extraQuota).toBeUndefined();
  const c = await store.db.prepare("SELECT * FROM automation_control").first();
  expect([
    c?.enabled,
    c?.paused,
    c?.initial_target,
    c?.interval_minutes,
    c?.max_per_cycle,
  ]).toEqual([0, 1, 5, 60, 3]);
  expect(s.dailyBudgetMicrousd).toBe(1000000);
});
it("normal execution cannot publish or consume providers while disabled", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await hourlyTick(env)).status).toBe("disabled");
  expect(fetcher).not.toHaveBeenCalled();
});
it("runtime key absence blocks activation work before any provider call", async () => {
  await enabled();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await hourlyTick(env)).status).toBe("error");
  expect(fetcher).not.toHaveBeenCalled();
});
it("initial batch admits five distinct events once, not five per restart", async () => {
  await enabled();
  for (let n = 1; n <= 5; n++)
    expect(await reserveCycle(store, await job(n), "initial-once")).toBe(true);
  expect(await reserveCycle(store, await job(6), "initial-once")).toBe(false);
  expect(
    await reserveCycle(
      new Store(store.db),
      (await store.event("1".padStart(24, "0")))!,
      "initial-once",
    ),
  ).toBe(false);
});
it("concurrent reservations cannot exceed the three-per-hour cap", async () => {
  await enabled();
  await store.db
    .prepare(
      "INSERT INTO hourly_cycles(id,kind,started_at,limit_count) VALUES('hour-test','hourly',?,3)",
    )
    .bind(now.toISOString())
    .run();
  const jobs = await Promise.all([10, 11, 12, 13, 14].map((n) => job(n)));
  const results = await Promise.all(
    jobs.map((e) => reserveCycle(store, e, "hour-test")),
  );
  expect(results.filter(Boolean)).toHaveLength(3);
});
it("both languages become readable atomically and no build or Git call is used", async () => {
  await enabled();
  const event = await job(20);
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await stagePair(env, store, event, "initial-once");
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (await store.db.prepare("SELECT lang FROM public_articles").all()).results,
  ).toHaveLength(2);
  expect((await store.event(event.id))?.state).toBe("live_pending");
  expect(
    (
      await store.db
        .prepare(
          "SELECT count(*) AS n FROM cycle_items WHERE state='published'",
        )
        .first()
    )?.n,
  ).toBe(0);
  publicFetch();
  expect(await confirmPair(env, store, (await store.event(event.id))!)).toBe(
    true,
  );
  expect((await store.event(event.id))?.state).toBe("published");
});
it("failed second-language URL does not complete the initial batch or duplicate a staged pair", async () => {
  await enabled();
  const event = await job(30);
  await stagePair(env, store, event, "initial-once");
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("failure", { status: 503 })),
  );
  await expect(
    confirmPair(env, store, (await store.event(event.id))!),
  ).rejects.toThrow("503");
  expect((await store.event(event.id))?.state).toBe("live_pending");
  expect(
    (
      await store.db
        .prepare("SELECT count(*) AS n FROM public_articles")
        .first()
    )?.n,
  ).toBe(2);
  publicFetch();
  await confirmPair(env, store, (await store.event(event.id))!);
  expect(
    (
      await store.db
        .prepare(
          "SELECT count(*) AS n FROM cycle_items WHERE state='published'",
        )
        .first()
    )?.n,
  ).toBe(1);
});
it("pause prevents all cycle reservations", async () => {
  await enabled();
  await store.db.prepare("UPDATE automation_control SET paused=1").run();
  expect(await reserveCycle(store, await job(40), "initial-once")).toBe(false);
});
it("administrative routes are closed even when legacy Access configuration exists", async () => {
  env.CF_ACCESS_TEAM_DOMAIN = "example.cloudflareaccess.com";
  env.CF_ACCESS_AUD = "fixture";
  env.ADMIN_EMAILS = "owner@example.org";
  for (const path of ["/admin", "/api/manual", "/api/settings", "/panel.js"])
    expect(
      (await handle(new Request("https://admin.example.org" + path), env))
        .status,
    ).toBe(403);
});
it("completion of initial five is persistent and schedules the first regular review 60 minutes later", async () => {
  await enabled();
  env.CRYPTONEWS_API_KEY = "fixture";
  env.ECONOFLUX_OPENAI_API_KEY = "fixture";
  for (let n = 50; n < 55; n++) {
    const e = await job(n);
    await reserveCycle(store, e, "initial-once");
  }
  await store.db
    .prepare("UPDATE cycle_items SET state='published',published_at=?")
    .bind(now.toISOString())
    .run();
  await store.db.prepare("UPDATE events SET state='published'").run();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await hourlyTick(env, now)).status).toBe("initial_complete");
  const c = await store.db.prepare("SELECT * FROM automation_control").first();
  expect(c?.next_review).toBe(new Date(+now + 3600000).toISOString());
  expect(fetcher).not.toHaveBeenCalled();
  expect((await hourlyTick(env, new Date(+now + 60000))).status).toBe(
    "waiting",
  );
});

it("a full initial batch permits an existing correction without opening a sixth slot", async () => {
  await enabled();
  env.CRYPTONEWS_API_KEY = "fixture";
  env.ECONOFLUX_OPENAI_API_KEY = "fixture";
  for (let n = 60; n < 65; n++)
    await reserveCycle(store, await job(n), "initial-once");
  await store.db.prepare("UPDATE cycle_items SET state='published'").run();
  await store.db.prepare("UPDATE events SET state='published'").run();
  await store.db
    .prepare("UPDATE events SET state='approved' WHERE id=?")
    .bind((60).toString(16).padStart(24, "0"))
    .run();
  await store.db
    .prepare("UPDATE automation_control SET next_review=?")
    .bind(new Date(+now + 3600000).toISOString())
    .run();
  publicFetch();
  expect((await hourlyTick(env, now)).status).toBe("ok");
  expect(
    (await store.db.prepare("SELECT count(*) n FROM cycle_items").first())?.n,
  ).toBe(5);
  expect((await hourlyTick(env, new Date(+now + 60000))).status).toBe(
    "initial_complete",
  );
});

it("persists a Spanish phase before yielding and reuses a successful final review", async () => {
  const event = await job(90);
  await store.db
    .prepare("DELETE FROM drafts WHERE event_id=? AND lang='es'")
    .bind(event.id)
    .run();
  const originalEnglish = (await store.drafts(event.id))[0].value;
  const verification = {
    sufficient: true,
    reason: "Verified fixture",
    essentialFacts: ["5 verified facts."],
    eventDate: now.toISOString(),
    primaryUrls: ["https://example.org/source"],
    independentGroups: ["example.org"],
    highRisk: false,
    urgency: { confirmed: false, reason: "Routine" },
    canonicalEvent: "fixture-phase",
    category: "bitcoin",
    sourceIds: ["source"],
    relevanceScore: 90,
  };
  await store.db
    .prepare("UPDATE events SET verification=?,verified_at=? WHERE id=?")
    .bind(JSON.stringify(verification), now.toISOString(), event.id)
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,accessible,primary_source,fetched_at,excerpt) VALUES('source',?,'https://example.org/source',1,1,?,'5 verified facts.')",
    )
    .bind(event.id, now.toISOString())
    .run();
  env.ECONOFLUX_OPENAI_API_KEY = "fixture";
  const fetcher = vi.fn(async (_input: unknown, init: RequestInit) => {
    const system = JSON.parse(String(init.body)).input[0].content;
    const result = system.includes("Independently review")
      ? { passed: true, issues: [], invalidLanguages: [] }
      : {
          title: "Verified fixture es",
          summary: "A verified fixture",
          seoTitle: "Fixture",
          seoDescription: "Description",
          slug: "fixture-90-es",
          sections: [
            { id: "facts", title: "Facts", text: ["5 verified facts."] },
          ],
        };
    return Response.json({
      status: "completed",
      usage: { input_tokens: 100, output_tokens: 100 },
      output: [
        { content: [{ type: "output_text", text: JSON.stringify(result) }] },
      ],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  const settings = (await store.settings()).value;
  await expect(
    prepare(env, store, settings, (await store.event(event.id))!),
  ).rejects.toThrow("guardada");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (await store.drafts(event.id)).filter((draft) => draft.valid),
  ).toHaveLength(2);
  expect(
    (await store.drafts(event.id)).find((draft) => draft.lang === "en")?.value,
  ).toEqual(originalEnglish);
  await prepare(env, store, settings, (await store.event(event.id))!);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect((await store.event(event.id))?.state).toBe("approved");
  await prepare(env, store, settings, (await store.event(event.id))!);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
