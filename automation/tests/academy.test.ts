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
  validateGuidePair,
  activeAcademyLaunch,
} from "../src/academy";
import {
  initialTopics,
  queuedTopics,
  type TopicSpec,
} from "../src/academy-topics";
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
    "0012_academy_launch.sql",
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
  vi.useRealTimers();
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
      ...(i === 0 ? { subheading: "Practical example" } : {}),
      text: [Array(180).fill("educational").join(" ")],
    })),
  }));
}
async function readyGuide(spec: TopicSpec, at = now) {
  const p: any = {
    pair: pair().map((a) => ({
      ...a,
      id: spec.id + "-" + a.lang,
      translationId: spec.id,
      academyCategory: spec.category,
      cluster: spec.cluster,
      publishedAt: at.toISOString(),
      sources: spec.sources.map((s) => ({ url: s.url, label: s.label })),
    })),
    audit: { approved: true },
    signature: "local-source-fixture",
  };
  p.auditHash = await hash(JSON.stringify(p.pair));
  const job: any = {
    id: spec.id + "-r1",
    topic_id: spec.id,
    kind: "new",
    revision: 1,
  };
  await store.db
    .prepare(
      "INSERT INTO academy_jobs(id,topic_id,kind,revision,phase,payload,next_attempt,created_at) VALUES(?,?,'new',1,'publish',?,?,?)",
    )
    .bind(
      job.id,
      spec.id,
      JSON.stringify(p),
      at.toISOString(),
      at.toISOString(),
    )
    .run();
  return { job, p, spec };
}
it("uses UTC slots, a Monday week and no catch-up burst", () => {
  expect(academySlot(new Date("2026-11-02T09:59:59Z"))).toBeNull();
  expect(academySlot(now)).toContain("10:00");
  for (let day = 2; day <= 8; day++)
    expect(academySlot(new Date(`2026-11-0${day}T12:00:00Z`))).toBe(
      `2026-11-0${day}T10:00:00.000Z`,
    );
  expect(nextAcademySlot(now)).toBe("2026-11-03T10:00:00.000Z");
  expect(nextAcademySlot(new Date("2026-11-07T23:59:59Z"))).toBe(
    "2026-11-08T10:00:00.000Z",
  );
  expect(nextAcademySlot(new Date("2026-11-03T09:59:59Z"))).toBe(
    "2026-11-03T10:00:00.000Z",
  );
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
  const next = await readyGuide(
    queuedTopics.find((t) => t.id === "recovery-phrase-safe-backup")!,
    second,
  );
  await publishGuidePair(
    store,
    next.job,
    next.spec,
    structuredClone(next.p),
    second,
  );
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(4);
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
it("enforces seven new topics per UTC week and reopens the quota on Monday", async () => {
  const topics = [...initialTopics, ...queuedTopics];
  for (let i = 0; i < 7; i++)
    await store.db
      .prepare("UPDATE academy_topics SET published_at=? WHERE id=?")
      .bind(new Date(Date.UTC(2026, 10, 9 + i, 10)).toISOString(), topics[i].id)
      .run();
  const at = new Date("2026-11-15T12:00:00Z");
  const { job, p, spec } = await readyGuide(topics[7], at);
  await expect(
    publishGuidePair(store, job, spec, structuredClone(p), at),
  ).rejects.toThrow("Siete guías");
  await publishGuidePair(
    store,
    job,
    spec,
    structuredClone(p),
    new Date("2026-11-16T10:00:00Z"),
  );
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(2);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM cycle_items").first<any>())
      .n,
  ).toBe(0);
});
it("counts a complete EN/ES pair as one daily guide and never catches up with two new topics on one day", async () => {
  const first = await readyGuide(
    queuedTopics.find((t) => t.id === "recovery-phrase-safe-backup")!,
  );
  const second = await readyGuide(
    queuedTopics.find((t) => t.id === "how-stablecoins-work-risks")!,
  );
  const at = new Date("2026-11-03T10:00:00Z");
  await publishGuidePair(
    store,
    first.job,
    first.spec,
    structuredClone(first.p),
    at,
  );
  await expect(
    publishGuidePair(
      store,
      second.job,
      second.spec,
      structuredClone(second.p),
      at,
    ),
  ).rejects.toThrow("Una guía");
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(2);
  expect(
    await store.db
      .prepare("SELECT topic_id,state FROM academy_slots WHERE id=?")
      .bind("2026-11-03T10:00:00.000Z")
      .first(),
  ).toMatchObject({ topic_id: first.spec.id, state: "published" });
  await publishGuidePair(
    store,
    second.job,
    second.spec,
    structuredClone(second.p),
    new Date("2026-11-04T10:00:00Z"),
  );
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(4);
});
it("leaves the launch day full but allows the next daily guide tomorrow despite ten launch publications this week", async () => {
  await enable();
  const launch = await store.db
    .prepare("SELECT topic_ids FROM academy_launch")
    .first<any>();
  const ids = JSON.parse(launch.topic_ids) as string[];
  await store.db
    .prepare("UPDATE academy_launch SET completed_at=?")
    .bind(now.toISOString())
    .run();
  await store.db
    .prepare(
      `UPDATE academy_topics SET published_at=?,status='published' WHERE id IN (${ids.map(() => "?").join(",")})`,
    )
    .bind(now.toISOString(), ...ids)
    .run();
  expect((await academyTick(env, { status: "waiting" }, now)).status).toBe(
    "waiting",
  );
  expect(
    (await store.db.prepare("SELECT count(*) n FROM academy_jobs").first<any>())
      .n,
  ).toBe(0);
  const result = await academyTick(
    env,
    { status: "waiting" },
    new Date("2026-11-03T10:00:00Z"),
  );
  expect(result).toMatchObject({
    status: "queued",
    id: "recovery-phrase-safe-backup",
  });
});
it("keeps an audited daily-limit deferral pending until tomorrow without charging AI or consuming retries", async () => {
  await enable();
  const first = await readyGuide(
    queuedTopics.find((t) => t.id === "recovery-phrase-safe-backup")!,
  );
  const second = await readyGuide(
    queuedTopics.find((t) => t.id === "how-stablecoins-work-risks")!,
  );
  const at = new Date("2026-11-03T12:00:00Z");
  await publishGuidePair(
    store,
    first.job,
    first.spec,
    structuredClone(first.p),
    at,
  );
  await store.db
    .prepare("UPDATE academy_jobs SET state='done' WHERE id=?")
    .bind(first.job.id)
    .run();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect((await academyTick(env, { status: "waiting" }, at)).status).toBe(
    "deferred",
  );
  expect(
    await store.db
      .prepare(
        "SELECT state,attempts,next_attempt FROM academy_jobs WHERE id=?",
      )
      .bind(second.job.id)
      .first(),
  ).toMatchObject({
    state: "pending",
    attempts: 0,
    next_attempt: "2026-11-04T10:00:00.000Z",
  });
  expect(fetcher).not.toHaveBeenCalled();
});
it("holds a ready ordinary guide before 10 UTC and permits publication at the daily turn", async () => {
  const { job, p, spec } = await readyGuide(
    queuedTopics.find((t) => t.id === "recovery-phrase-safe-backup")!,
  );
  await expect(
    publishGuidePair(
      store,
      job,
      spec,
      structuredClone(p),
      new Date("2026-11-03T09:59:59Z"),
    ),
  ).rejects.toThrow("10:00 UTC");
  await publishGuidePair(
    store,
    job,
    spec,
    structuredClone(p),
    new Date("2026-11-03T10:00:00Z"),
  );
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(2);
});
it("publishes a reviewed named launch guide beyond the ordinary weekly quota, without a news reservation", async () => {
  const { queuedTopics } = await import("../src/academy-topics");
  const spec = queuedTopics.find(
    (t) => t.id === "what-is-bitcoin-how-it-works",
  )!;
  await store.db.prepare("UPDATE academy_launch SET enabled=1").run();
  await store.db
    .prepare(
      "UPDATE academy_topics SET published_at=?,status='published' WHERE id IN (?,?,?)",
    )
    .bind(now.toISOString(), ...initialTopics.map((t) => t.id))
    .run();
  const p: any = {
    pair: pair().map((a) => ({
      ...a,
      id: spec.id + "-" + a.lang,
      translationId: spec.id,
      academyCategory: spec.category,
      cluster: spec.cluster,
      sources: spec.sources.map((s) => ({ url: s.url, label: s.label })),
    })),
    audit: { approved: true },
    signature: "actual-source-signature-fixture",
  };
  p.auditHash = await hash(JSON.stringify(p.pair));
  const job: any = {
    id: spec.id + "-r1",
    topic_id: spec.id,
    kind: "new",
    revision: 1,
  };
  await store.db
    .prepare(
      "INSERT INTO academy_jobs(id,topic_id,kind,revision,next_attempt,created_at) VALUES(?,?,'new',1,?,?)",
    )
    .bind(job.id, spec.id, now.toISOString(), now.toISOString())
    .run();
  await publishGuidePair(store, job, spec, p, now);
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(2);
  expect(
    (
      await store.db
        .prepare(
          "SELECT count(*) n FROM academy_topics WHERE published_at IS NOT NULL",
        )
        .first<any>()
    ).n,
  ).toBe(4);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM cycle_items").first<any>())
      .n,
  ).toBe(0);
});
it("queues the dated launch after routine news work and still gives urgent news priority", async () => {
  await enable();
  await store.db.prepare("UPDATE academy_launch SET enabled=1").run();
  await store.db
    .prepare(
      "UPDATE academy_topics SET published_at=?,status='published' WHERE id IN (?,?,?)",
    )
    .bind(now.toISOString(), ...initialTopics.map((t) => t.id))
    .run();
  const result = await academyTick(env, { status: "ok", didWork: true }, now);
  expect(result.status).toBe("queued");
  expect((result as any).id).toBe("what-is-bitcoin-how-it-works");
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,state,importance,selection_reason) VALUES('urgent','urgent','Urgent news','https://example.org/urgent',?,'qualified',90,'fixture')",
    )
    .bind(now.toISOString())
    .run();
  expect(
    (
      await academyTick(
        env,
        { status: "ok", didWork: true },
        new Date(+now + 60000),
      )
    ).status,
  ).toBe("news_priority");
  expect(
    (await store.db.prepare("SELECT count(*) n FROM cycle_items").first<any>())
      .n,
  ).toBe(0);
});
it("allows only named launch topics today and restores the ordinary weekly quota afterward", async () => {
  await store.db.prepare("UPDATE academy_launch SET enabled=1").run();
  expect((await activeAcademyLaunch(store, now))?.target).toBe(10);
  expect(
    await activeAcademyLaunch(store, new Date("2026-11-03T00:00:00Z")),
  ).toBeNull();
  const launch = await activeAcademyLaunch(store, now);
  await store.db
    .prepare(
      `UPDATE academy_topics SET published_at=? WHERE id IN (${launch!.topicIds.map(() => "?").join(",")})`,
    )
    .bind(now.toISOString(), ...launch!.topicIds)
    .run();
  expect(await activeAcademyLaunch(store, now)).toBeNull();
  expect(
    (await store.db.prepare("SELECT enabled FROM academy_launch").first<any>())
      .enabled,
  ).toBe(0);
  expect(nextAcademySlot(now, true)).toBe("2026-11-09T10:00:00.000Z");
});
it("finishes a reviewed launch pair and real URL checks without another paid generation phase", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  await enable();
  await store.db.prepare("UPDATE academy_launch SET enabled=1").run();
  await store.db
    .prepare(
      "UPDATE academy_topics SET status='published',published_at=? WHERE id IN (?,?,?)",
    )
    .bind(now.toISOString(), ...initialTopics.map((t) => t.id))
    .run();
  const { queuedTopics } = await import("../src/academy-topics");
  const spec = queuedTopics.find(
    (t) => t.id === "what-is-bitcoin-how-it-works",
  )!;
  const guides = pair().map((a) => ({
    ...a,
    id: spec.id + "-" + a.lang,
    translationId: spec.id,
    academyCategory: spec.category,
    sources: spec.sources.map((s) => ({ url: s.url, label: s.label })),
  }));
  const payload = {
    en: guides[0],
    es: guides[1],
    plan: { facts: [] },
    signature: "fixture-sources",
    sources: spec.sources.map((s) => ({
      ...s,
      text: "Local official source fixture",
    })),
  };
  await store.db
    .prepare(
      "INSERT INTO academy_jobs(id,topic_id,kind,revision,phase,payload,next_attempt,created_at) VALUES(?,?,'new',1,'audit',?,?,?)",
    )
    .bind(
      spec.id + "-r1",
      spec.id,
      JSON.stringify(payload),
      now.toISOString(),
      now.toISOString(),
    )
    .run();
  await store.db
    .prepare(
      "INSERT INTO academy_assets(id,svg,png,created_at,rights) VALUES(?,'<svg/>',X'89504e47',?,'local original fixture')",
    )
    .bind(spec.id, now.toISOString())
    .run();
  env.ECONOFLUX_OPENAI_API_KEY = "local-fixture-key";
  const fetcher = vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    if (url.startsWith("https://api.openai.com/"))
      return Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 20 },
        output: [
          {
            content: [
              {
                type: "output_text",
                text: JSON.stringify({ approved: true, issues: [] }),
              },
            ],
          },
        ],
      });
    if (init?.method === "HEAD")
      return new Response(null, { headers: { "content-type": "image/png" } });
    const lang = url.includes("/en/") ? "en" : "es";
    return new Response(
      `<html lang="${lang}"><meta content="${spec.id}"><meta content="1">`,
    );
  });
  vi.stubGlobal("fetch", fetcher);
  expect(
    (await academyTick(env, { status: "ok", didWork: true }, now)).status,
  ).toBe("ok");
  expect(
    await store.db.prepare("SELECT state,phase FROM academy_jobs").first<any>(),
  ).toMatchObject({ state: "done", phase: "complete" });
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(2);
  expect(
    fetcher.mock.calls.filter(([url]) => String(url).includes("api.openai.com"))
      .length,
  ).toBe(1);
});
it("requests a strict guide format and preserves valid prose while normalizing nullable optional fields", async () => {
  await enable();
  await store.db.prepare("UPDATE academy_launch SET enabled=1").run();
  const spec = initialTopics[0],
    guide = pair()[0];
  const payload = {
    plan: {
      facts: [],
      en: {
        primaryKeyword: "security",
        searchIntent: "learn",
        relatedQueries: [],
        readerQuestions: [],
      },
    },
    sources: spec.sources.map((s) => ({
      ...s,
      text: "Official local fixture",
    })),
  };
  await store.db
    .prepare(
      "INSERT INTO academy_jobs(id,topic_id,kind,revision,phase,payload,next_attempt,created_at) VALUES(?,?,'new',1,'en',?,?,?)",
    )
    .bind(
      spec.id + "-r1",
      spec.id,
      JSON.stringify(payload),
      now.toISOString(),
      now.toISOString(),
    )
    .run();
  env.ECONOFLUX_OPENAI_API_KEY = "local-fixture-key";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: any, init: any) => {
      const body = JSON.parse(init.body);
      expect(body.text.format.type).toBe("json_schema");
      expect(body.text.format.strict).toBe(true);
      const draft = {
        title: guide.title,
        summary: guide.summary,
        seoTitle: guide.seoTitle,
        seoDescription: guide.seoDescription,
        sections: guide.sections.map((s) => ({
          ...s,
          subheading: s.subheading || null,
          list: null,
          table: null,
        })),
      };
      return Response.json({
        status: "completed",
        usage: { input_tokens: 100, output_tokens: 20 },
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(draft) }] },
        ],
      });
    }),
  );
  expect(
    (await academyTick(env, { status: "ok", didWork: true }, now)).status,
  ).toBe("ok");
  const job = await store.db
    .prepare("SELECT phase,payload FROM academy_jobs")
    .first<any>();
  expect(job.phase).toBe("es");
  const saved = JSON.parse(job.payload).en;
  expect(saved.sections[0].text).toEqual(guide.sections[0].text);
  expect(saved.sections[1]).not.toHaveProperty("table");
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    ).n,
  ).toBe(0);
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
it("rejects an unintended bilingual drafting note before publication", () => {
  const guides = pair() as any;
  guides[0].sections.push({
    id: "subheading_es",
    title: "Subtítulo H3 en español — Nota práctica",
    text: ["A drafting artifact must never become reader content."],
  });
  expect(() => validateGuidePair(guides, initialTopics[0])).toThrow(
    "Nota de redacción",
  );
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

it("publishes two complete guide pairs in separate daily windows under the balanced plan", async () => {
  await store.db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.editorialDailyPlan',json('true'))",
    )
    .run();
  const first = await readyGuide(
    queuedTopics.find((t) => t.id === "recovery-phrase-safe-backup")!,
  );
  const second = await readyGuide(
    queuedTopics.find((t) => t.id === "how-stablecoins-work-risks")!,
  );
  await publishGuidePair(
    store,
    first.job,
    first.spec,
    structuredClone(first.p),
    new Date("2026-11-03T10:00:00Z"),
  );
  await expect(
    publishGuidePair(
      store,
      second.job,
      second.spec,
      structuredClone(second.p),
      new Date("2026-11-03T12:00:00Z"),
    ),
  ).rejects.toThrow("ventana");
  await publishGuidePair(
    store,
    second.job,
    second.spec,
    structuredClone(second.p),
    new Date("2026-11-03T18:00:00Z"),
  );
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_guides")
        .first<any>()
    )?.n,
  ).toBe(4);
  expect(nextAcademySlot(new Date("2026-11-03T12:00:00Z"), false, true)).toBe(
    "2026-11-03T18:00:00.000Z",
  );
});
