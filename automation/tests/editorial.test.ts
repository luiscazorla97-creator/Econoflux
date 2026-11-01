import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { Store } from "../src/store";
import {
  capacity,
  dayKey,
  dayEnd,
  nextRegular,
  validateSettings,
  similarity,
  sufficient,
  validatePair,
} from "../src/policy";
import { handle } from "../src/index";
import { tick, prepare } from "../src/engine";
import { authorize } from "../src/auth";
import { reconcile, startPublication } from "../src/publish";
import { validatePublished } from "../../src/lib/published";
import type { Env, Event, Verification, PreparedArticle } from "../src/types";
let mf: Miniflare, store: Store, env: Env;
const now = new Date("2026-11-01T17:00:00Z");
async function event(n: number, extra: Partial<Event> = {}) {
  const id = n.toString(16).padStart(24, "0");
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,state,selection_reason,urgent,related_id,approved_revision,published_at) VALUES(?,?,?,?,?,'approved','Verified fixture',?,?,1,?)",
    )
    .bind(
      id,
      id,
      "Fixture " + n,
      "https://example.org/" + n,
      now.toISOString(),
      extra.urgent || 0,
      extra.related_id || null,
      extra.published_at || null,
    )
    .run();
  return (await store.event(id))!;
}
async function active(patch: Record<string, unknown> = {}) {
  const s = await store.settings();
  return store.updateSettings(
    { ...s.value, enabled: true, paused: false, mode: "active", ...patch },
    s.version,
    "test",
    now,
  );
}
function article(
  lang: "en" | "es",
  id: string,
  patch: Partial<PreparedArticle> = {},
): PreparedArticle {
  return {
    id: id + "-" + lang,
    translationId: id,
    lang,
    slug: "verified-" + lang,
    title: "Verified fixture",
    summary: "Verified facts",
    seoTitle: "Verified fixture",
    seoDescription: "Verified facts",
    category: "bitcoin",
    tags: ["bitcoin"],
    image: {
      src: "/images/bitcoin.webp",
      alt: "Editorial illustration",
      credit: "EconoFlux",
    },
    sources: [{ label: "Primary fixture", url: "https://example.org/primary" }],
    publishedAt: now.toISOString(),
    status: "published",
    demo: false,
    editorialRevision: 1,
    author: "Fixture editorial",
    sections: [{ id: "facts", title: "Facts", text: ["Verified 5 items."] }],
    ...patch,
  };
}
async function pair(id: string) {
  for (const lang of ["en", "es"] as const)
    await store.db
      .prepare(
        "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(?,?,1,?,1,?)",
      )
      .bind(id, lang, JSON.stringify(article(lang, id)), now.toISOString())
      .run();
}
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("test")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "test" },
  });
  const db = await mf.getD1Database("DB");
  for (const sql of readFileSync(
    "automation/migrations/0001_editorial.sql",
    "utf8",
  )
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  store = new Store(db as any);
  env = {
    DB: db as any,
    SITE_URL: "https://econoflux.pages.dev",
    GITHUB_REPOSITORY: "fixture/repo",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "econoflux",
    AI_MODEL: "gpt-5-mini",
  };
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
describe("persistent editable settings and schedule", () => {
  it("saves 5→17→3 without deploy, persists through a new Store, and preserves publication count", async () => {
    const e = await event(1);
    await active();
    await store.reserve(e, now);
    await store.db.prepare("UPDATE reservations SET state='published'").run();
    for (const target of [17, 3]) {
      const s = await store.settings();
      await store.updateSettings(
        { ...s.value, dailyTarget: target },
        s.version,
        "test",
        now,
      );
      expect((await new Store(store.db).settings()).value.dailyTarget).toBe(
        target,
      );
      expect((await store.counts(now)).regular).toBe(1);
    }
    expect((await store.settings()).value.dailyTarget).toBe(3);
  });
  it("accepts arbitrary valid integers, rejects fractions, zero and impossible configuration", async () => {
    const s = (await store.settings()).value;
    expect(validateSettings({ dailyTarget: 17 }, s).dailyTarget).toBe(17);
    for (const v of [0, -1, 1.5, NaN, 1001])
      expect(() => validateSettings({ dailyTarget: v }, s)).toThrow();
    expect(
      capacity({ ...s, dailyTarget: 20 }).limitations.length,
    ).toBeGreaterThan(0);
  });
  it("changes interval persistently and rejects stale saves", async () => {
    const s = await store.settings();
    await store.updateSettings(
      { ...s.value, intervalMinutes: 7 },
      s.version,
      "test",
      now,
    );
    expect((await store.settings()).value.intervalMinutes).toBe(7);
    expect((await store.status(now)).runtime?.next_check).toBe(
      "2026-11-01T17:07:00.000Z",
    );
    await expect(
      store.updateSettings(s.value, s.version, "test"),
    ).rejects.toThrow("cambió");
  });
  it("distributes additional articles and never immediately catches up", async () => {
    const next = nextRegular(now, 16, 20);
    expect(Date.parse(next) - +now).toBeGreaterThanOrEqual(20 * 60000);
    expect(dayKey(new Date(next))).toBe(dayKey(now));
  });
  it("counts one bilingual publication, not two pages", async () => {
    await active();
    const e = await event(2);
    await pair(e.id);
    await store.reserve(e, now);
    await store.db.prepare("UPDATE reservations SET state='published'").run();
    expect((await store.counts(now)).regular).toBe(1);
    expect(await store.drafts(e.id)).toHaveLength(2);
  });
  it("uses New York day boundaries across DST and does not carry yesterday quotas", async () => {
    expect(dayKey(new Date("2026-11-01T03:59:00Z"))).toBe("2026-10-31");
    expect(dayKey(new Date("2026-11-01T04:00:00Z"))).toBe("2026-11-01");
    expect(dayEnd(new Date("2026-11-01T04:00:00Z")).toISOString()).toBe(
      "2026-11-02T05:00:00.000Z",
    );
    expect(dayEnd(new Date("2026-03-08T05:00:00Z")).toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
    await active();
    await store.reserve(await event(3), new Date("2026-10-31T12:00:00Z"));
    await store.db.prepare("UPDATE reservations SET state='published'").run();
    expect((await store.counts(now)).regular).toBe(0);
  });
});
describe("atomic capacity, urgency, pause and budgets", () => {
  it("reserves a routine slot exactly once", async () => {
    await active();
    const e = await event(10);
    expect(await store.reserve(e, now)).toBe(true);
    expect(await store.reserve(e, now)).toBe(false);
  });
  it("urgent work uses regular quota first and extra quota only afterwards", async () => {
    await active({ dailyTarget: 1, extraQuota: 1 });
    const first = await event(11, { urgent: 1 }),
      second = await event(12, { urgent: 1 }),
      third = await event(13, { urgent: 1 });
    expect(await store.reserve(first, now)).toBe(true);
    expect(await store.reserve(second, now)).toBe(true);
    expect(await store.reserve(third, now)).toBe(false);
    const rows = (
      await store.db
        .prepare("SELECT kind FROM reservations ORDER BY event_id")
        .all()
    ).results;
    expect(rows.map((r) => r.kind)).toEqual(["regular", "extra"]);
  });
  it("zero extra quota stops additional urgency and a reduced goal deletes nothing", async () => {
    await active({ dailyTarget: 1, extraQuota: 0 });
    await store.reserve(await event(14), now);
    expect(await store.reserve(await event(15, { urgent: 1 }), now)).toBe(
      false,
    );
    expect(
      (await store.db.prepare("SELECT count(*) AS n FROM events").first())?.n,
    ).toBe(2);
  });
  it("concurrent requests cannot oversubscribe a single remaining slot", async () => {
    await active({ dailyTarget: 1, extraQuota: 0 });
    const events = await Promise.all([20, 21, 22, 23].map((n) => event(n)));
    const results = await Promise.all(events.map((e) => store.reserve(e, now)));
    expect(results.filter(Boolean)).toHaveLength(1);
  });
  it("global pause blocks urgency and scheduler network calls", async () => {
    await active({ paused: true });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    expect(await store.reserve(await event(24, { urgent: 1 }), now)).toBe(
      false,
    );
    expect((await tick(env)).status).toBe("paused");
    expect(fetcher).not.toHaveBeenCalled();
    const run = await store.db.prepare("SELECT result,ended_at FROM runs ORDER BY started_at DESC LIMIT 1").first();
    if(run) expect(run.ended_at).toBeTruthy();
  });
  it("scheduler lock prevents overlapping runs and can recover expired leases", async () => {
    expect(await store.lock("scheduler", "one", now)).toBe(true);
    expect(await store.lock("scheduler", "two", now)).toBe(false);
    expect(
      await store.lock("scheduler", "two", new Date(+now + 6 * 60000)),
    ).toBe(true);
  });
  it("consumption and estimated dollars are reserved atomically", async () => {
    const results = await Promise.allSettled(
      [1, 2, 3].map(() => store.charge("ai_calls", 3, now, 600, 1000)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    await store.settle(dayKey(now), 600, 100);
    await expect(store.charge("ai_calls", 3, now, 600, 1000)).resolves.toBe(
      dayKey(now),
    );
  });
  it("updates are accounted separately from new stories", async () => {
    await active({ dailyTarget: 1 });
    const original = await event(25);
    await store.reserve(original, now);
    await store.db.prepare("UPDATE reservations SET state='published'").run();
    const update = await event(26, {
      related_id: original.id,
      published_at: now.toISOString(),
    });
    expect(await store.reserve(update, now)).toBe(true);
    await store.db
      .prepare("UPDATE reservations SET state='published' WHERE event_id=?")
      .bind(update.id)
      .run();
    const c = await store.counts(now);
    expect(c.regular).toBe(1);
    expect(c.updates).toBe(1);
  });
});
describe("verification, translation and deployment gates", () => {
  it("a rumor without an accessible primary document cannot spend AI", async () => {
    const e = await event(30);
    await store.db
      .prepare(
        "INSERT INTO sources(id,event_id,url,accessible,primary_source,fetched_at) VALUES('source',?,'https://example.org/rumor',1,0,?)",
      )
      .bind(e.id, now.toISOString())
      .run();
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await prepare(env, store, (await store.settings()).value, e);
    expect((await store.event(e.id))?.state).toBe("needs_sources");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("syndication and a breaking keyword alone are insufficient", () => {
    const v = {
      sufficient: true,
      essentialFacts: ["Verified fact"],
      sourceIds: ["a"],
      primaryUrls: ["https://example.org/a"],
      highRisk: true,
      independentGroups: ["same", "same"],
      canonicalEvent: "fixture",
      eventDate: now.toISOString(),
    } as Verification;
    expect(sufficient(v, new Set(["a"]), new Set(v.primaryUrls))).toBe(false);
    expect(
      similarity(
        "Breaking big news about Bitcoin",
        "Breaking big news about Bitcoin",
      ),
    ).toBe(1);
  });
  it("keeps the valid English draft when Spanish is missing", async () => {
    const e = await event(31);
    await store.db
      .prepare(
        "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(?,'en',1,?,1,?)",
      )
      .bind(e.id, JSON.stringify(article("en", e.id)), now.toISOString())
      .run();
    expect((await store.drafts(e.id)).map((d) => d.lang)).toEqual(["en"]);
    expect(() =>
      validatePair(
        article("en", e.id),
        article("es", e.id, {
          sections: [{ id: "facts", title: "Facts", text: ["6 instead."] }],
        }),
      ),
    ).toThrow("cifras");
  });
  it("refuses partial pairs and duplicate routes in the static build", () => {
    const a = article("en", "fixture");
    expect(() => validatePublished([a])).toThrow();
    expect(validatePublished([a, article("es", "fixture")])).toHaveLength(2);
    expect(() => validatePublished([a, { ...a }])).toThrow();
  });
  it("does not count a deployment if one language URL fails", async () => {
    await active();
    const e = await event(32);
    await pair(e.id);
    await store.reserve(e, now);
    await store.db
      .prepare(
        "UPDATE events SET state='deploying',commit_sha='commit',deployment_id='deployment' WHERE id=?",
      )
      .bind(e.id)
      .run();
    const current = (await store.event(e.id))!;
    env.CLOUDFLARE_API_TOKEN = "test";
    env.CLOUDFLARE_ACCOUNT_ID = "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: any) => {
        const url = String(input);
        if (url.includes("api.cloudflare.com"))
          return Response.json({
            result: { latest_stage: { name: "deploy", status: "success" } },
          });
        if (url.includes("/es/"))
          return new Response("missing", { status: 404 });
        return new Response(
          '<html lang="en"><meta name="econoflux-article-id" content="' +
            e.id +
            '"><meta name="econoflux-revision" content="1">',
        );
      }),
    );
    await expect(reconcile(env, store, current)).rejects.toThrow("URL");
    expect((await store.counts(now)).regular).toBe(0);
    expect((await store.event(e.id))?.state).toBe("deploying");
  });
  it("counts only after both final URLs carry the expected revision", async () => {
    await active();
    const e = await event(33);
    await pair(e.id);
    await store.reserve(e, now);
    await store.db
      .prepare(
        "UPDATE events SET state='deploying',commit_sha='commit',deployment_id='deployment' WHERE id=?",
      )
      .bind(e.id)
      .run();
    env.CLOUDFLARE_API_TOKEN = "test";
    env.CLOUDFLARE_ACCOUNT_ID = "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: any) => {
        const url = String(input);
        if (url.includes("api.cloudflare.com"))
          return Response.json({
            result: { latest_stage: { name: "deploy", status: "success" } },
          });
        const lang = url.includes("/es/") ? "es" : "en";
        return new Response(
          '<html lang="' +
            lang +
            '"><meta name="econoflux-article-id" content="' +
            e.id +
            '"><meta name="econoflux-revision" content="1">',
        );
      }),
    );
    expect(await reconcile(env, store, (await store.event(e.id))!)).toBe(true);
    expect((await store.counts(now)).regular).toBe(1);
  });
  it("retains a failed deployment reservation rather than overpublishing", async () => {
    await active();
    const e = await event(34);
    await pair(e.id);
    await store.reserve(e, now);
    await store.db
      .prepare(
        "UPDATE events SET state='deploying',commit_sha='commit',deployment_id='deployment' WHERE id=?",
      )
      .bind(e.id)
      .run();
    env.CLOUDFLARE_API_TOKEN = "test";
    env.CLOUDFLARE_ACCOUNT_ID = "a".repeat(32);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          result: { latest_stage: { name: "build", status: "failure" } },
        }),
      ),
    );
    expect(await reconcile(env, store, (await store.event(e.id))!)).toBe(false);
    expect((await store.counts(now)).reserved).toBe(1);
    expect((await store.event(e.id))?.state).toBe("deployment_failed");
  });
});
describe("private administration", () => {
  it("closes both panel and operations with no Access configuration", async () => {
    for (const path of ["/admin", "/api/status", "/api/manual", "/panel.js"]) {
      const r = await handle(
        new Request("https://admin.example.org" + path),
        env,
      );
      expect(r.status).toBe(403);
      expect(await r.text()).not.toContain("test-secret");
    }
  });
  it("rejects an unsigned identity header", async () => {
    Object.assign(env, {
      CF_ACCESS_TEAM_DOMAIN: "fixture.cloudflareaccess.com",
      CF_ACCESS_AUD: "fixture",
      ADMIN_EMAILS: "owner@example.org",
    });
    expect(
      await authorize(
        new Request("https://admin.example.org/admin", {
          headers: {
            "Cf-Access-Authenticated-User-Email": "owner@example.org",
          },
        }),
        env,
      ),
    ).toBeNull();
  });
  it("verifies signature, audience, administrator and same-origin mutation", async () => {
    const keys = await generateKeyPair("RS256", { extractable: true });
    const jwk = await exportJWK(keys.publicKey);
    jwk.kid = "fixture";
    Object.assign(env, {
      CF_ACCESS_TEAM_DOMAIN: "fixture.cloudflareaccess.com",
      CF_ACCESS_AUD: "audience",
      ADMIN_EMAILS: "owner@example.org",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ keys: [jwk] })),
    );
    const token = await new SignJWT({ email: "owner@example.org" })
      .setProtectedHeader({ alg: "RS256", kid: "fixture" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setSubject("owner")
      .setIssuer("https://fixture.cloudflareaccess.com")
      .setAudience("audience")
      .sign(keys.privateKey);
    const headers = { "Cf-Access-Jwt-Assertion": token };
    expect(
      (
        await handle(
          new Request("https://admin.example.org/api/status", { headers }),
          env,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handle(
          new Request("https://admin.example.org/api/pause", {
            method: "POST",
            headers: {
              ...headers,
              Origin: "https://attacker.org",
              "Content-Type": "application/json",
            },
            body: "{}",
          }),
          env,
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await handle(
          new Request("https://admin.example.org/api/pause", {
            method: "POST",
            headers: {
              ...headers,
              Origin: "https://admin.example.org",
              "Content-Type": "application/json",
            },
            body: "{}",
          }),
          env,
        )
      ).status,
    ).toBe(200);
    const bad = await new SignJWT({ email: "intruder@example.org" })
      .setProtectedHeader({ alg: "RS256", kid: "fixture" })
      .setIssuedAt()
      .setExpirationTime("5m")
      .setSubject("intruder")
      .setIssuer("https://fixture.cloudflareaccess.com")
      .setAudience("audience")
      .sign(keys.privateKey);
    expect(
      await authorize(
        new Request("https://admin.example.org/admin", {
          headers: { "Cf-Access-Jwt-Assertion": bad },
        }),
        env,
      ),
    ).toBeNull();
  });
  it("defaults remain 5 / 10 minutes / 3 / disabled", async () => {
    const s = (await store.settings()).value;
    expect([
      s.dailyTarget,
      s.intervalMinutes,
      s.extraQuota,
      s.enabled,
      s.paused,
    ]).toEqual([5, 10, 3, false, true]);
  });
});

it("simulates a complete routine Git commit, Pages build and two verified URLs without live publication", async () => {
  await active();
  const e = await event(60);
  await pair(e.id);
  Object.assign(env, {
    GITHUB_TOKEN: "fixture",
    CLOUDFLARE_API_TOKEN: "fixture",
    CLOUDFLARE_ACCOUNT_ID: "a".repeat(32),
  });
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const url = String(input);
      calls.push((init?.method || "GET") + " " + url);
      if (url.includes("api.github.com") && init?.method === "PUT") {
        const body = JSON.parse(init.body);
        const value = JSON.parse(atob(body.content));
        expect(value).toHaveLength(2);
        expect(new Set(value.map((a: any) => a.lang)).size).toBe(2);
        return Response.json({ commit: { sha: "new-commit" } });
      }
      if (url.includes("api.github.com"))
        return Response.json({ content: btoa("[]"), sha: "old-content" });
      if (url.endsWith("/deployments") && init?.method === "POST")
        return Response.json({ result: { id: "new-deployment" } });
      if (url.endsWith("/deployments")) return Response.json({ result: [] });
      if (url.endsWith("/deployments/new-deployment"))
        return Response.json({
          result: { latest_stage: { name: "deploy", status: "success" } },
        });
      if (url.includes("api.cloudflare.com"))
        return Response.json({ result: { source: { type: "github" } } });
      const lang = url.includes("/es/") ? "es" : "en";
      return new Response(
        '<html lang="' +
          lang +
          '"><meta name="econoflux-article-id" content="' +
          e.id +
          '"><meta name="econoflux-revision" content="1">',
      );
    }),
  );
  await startPublication(env, store, (await store.settings()).value, e, now);
  expect((await store.event(e.id))?.state).toBe("deploying");
  expect((await store.counts(now)).regular).toBe(0);
  await reconcile(env, store, (await store.event(e.id))!);
  expect((await store.event(e.id))?.state).toBe("published");
  expect(calls.filter((c) => c.startsWith("PUT"))).toHaveLength(1);
});
it("carries an in-flight reservation safely across midnight but not yesterday completed target", async () => {
  await active({ dailyTarget: 1 });
  await store.reserve(await event(61), new Date("2026-10-31T23:00:00Z"));
  expect((await store.counts(now)).reserved).toBe(1);
  expect(await store.reserve(await event(62), now)).toBe(false);
});
it("a Spanish generation failure preserves verified English and does not regenerate it", async () => {
  const e = await event(70);
  const verification = {
    sufficient: true,
    reason: "Primary fixture",
    essentialFacts: ["Verified 5 items."],
    sourceIds: ["source"],
    primaryUrls: ["https://example.org/primary"],
    independentGroups: ["example.org"],
    highRisk: false,
    eventDate: now.toISOString(),
    canonicalEvent: "fixture-event",
    category: "bitcoin",
    urgency: { confirmed: false, reason: "Routine" },
  };
  await store.db
    .prepare("UPDATE events SET verification=?,verified_at=? WHERE id=?")
    .bind(JSON.stringify(verification), now.toISOString(), e.id)
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,accessible,primary_source,fetched_at,excerpt) VALUES('source',?,'https://example.org/primary',1,1,?,'Verified 5 items in a primary fixture.')",
    )
    .bind(e.id, now.toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(?,'en',1,?,1,?)",
    )
    .bind(e.id, JSON.stringify(article("en", e.id)), now.toISOString())
    .run();
  env.ECONOFLUX_OPENAI_API_KEY = "fixture";
  const fetcher = vi.fn(async (_input: any, init: any) => {
    expect(JSON.parse(init.body).input[0].content).toContain("Spanish");
    return new Response("Failure fixture", { status: 503 });
  });
  vi.stubGlobal("fetch", fetcher);
  await expect(
    prepare(
      env,
      store,
      (await store.settings()).value,
      (await store.event(e.id))!,
    ),
  ).rejects.toThrow("503");
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (await store.drafts(e.id)).filter((d) => d.valid).map((d) => d.lang),
  ).toEqual(["en"]);
});
