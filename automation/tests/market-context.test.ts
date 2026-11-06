import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readdirSync, readFileSync } from "node:fs";
import { Store } from "../src/store";
import { hash } from "../src/policy";
import { marketEditorialTick } from "../src/market-editorial";
import { marketContextTick, checkContextDraft } from "../src/market-context";
import type { Env } from "../src/types";
let mf: Miniflare, store: Store, env: Env;
const now = new Date("2026-11-04T18:00:00Z"),
  id = "market-2026-11-04-1";
const quotes = ["BTC", "ETH", "SOL"].map((symbol, i) => ({
  symbol,
  price: 80000 / (i + 1),
  change24h: 3 - i,
  updatedAt: now.toISOString(),
}));
const sources = [
  {
    id: "source-1",
    url: "https://example.org/original",
    label: "Original reporting",
    text: "The analyst described changing expectations but did not establish a unique cause.",
    checkedAt: now.toISOString(),
  },
];
const draft = {
  en: {
    lead: "The report describes market context while preserving uncertainty about the exact cause.",
    sections: [
      {
        id: "timing",
        title: "Reported context",
        text: ["The source describes changing expectations."],
      },
      {
        id: "interpretation",
        title: "Attributed interpretation",
        text: [
          "The analyst offers an interpretation, not proof of a unique cause.",
        ],
      },
      {
        id: "limits",
        title: "What remains unknown",
        text: ["The source does not isolate a single explanation."],
      },
    ],
  },
  es: {
    lead: "El informe describe el contexto del mercado y conserva la incertidumbre sobre su causa exacta.",
    sections: [
      {
        id: "timing",
        title: "Contexto publicado",
        text: ["La fuente describe expectativas cambiantes."],
      },
      {
        id: "interpretation",
        title: "Interpretación atribuida",
        text: [
          "El analista ofrece una interpretación, no una prueba de una causa única.",
        ],
      },
      {
        id: "limits",
        title: "Qué se desconoce",
        text: ["La fuente no aísla una explicación única."],
      },
    ],
  },
  evidence: [
    {
      sourceId: "source-1",
      quote: "The analyst described changing expectations",
    },
  ],
};
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("test")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "market-context" },
  });
  const db = await mf.getD1Database("DB");
  for (const f of readdirSync("automation/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const s of readFileSync("automation/migrations/" + f, "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(s).run();
  store = new Store(db as any);
  env = {
    DB: db as any,
    AI_MODEL: "gpt-5-mini",
    ECONOFLUX_OPENAI_API_KEY: "local-fixture",
  } as Env;
  await db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.dailyBudgetMicrousd',6000000,'$.dailyAICalls',480)",
    )
    .run();
  await db.prepare("UPDATE automation_control SET enabled=1,paused=0").run();
  await db
    .prepare("UPDATE market_editorial_control SET enabled=1,activation_at=?")
    .bind(now.toISOString())
    .run();
  await db
    .prepare("UPDATE market_cache SET value=?,updated_at=?")
    .bind(JSON.stringify(quotes), now.toISOString())
    .run();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function job(phase = "draft", extra: Record<string, unknown> = {}) {
  await store.db
    .prepare(
      "INSERT INTO market_editions(id,day,edition,due_at) VALUES(?,?,1,?) ON CONFLICT DO NOTHING",
    )
    .bind(id, "2026-11-04", now.toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO market_context_jobs(id,phase,payload,updated_at) VALUES(?,?,?,?)",
    )
    .bind(
      id,
      phase,
      JSON.stringify({
        sources,
        checkedAt: now.toISOString(),
        orientation: quotes.map((q) => [q.symbol, Math.sign(q.change24h)]),
        ...extra,
      }),
      now.toISOString(),
    )
    .run();
}
const response = (value: unknown) =>
  Response.json({
    status: "completed",
    usage: { input_tokens: 100, output_tokens: 100 },
    output: [
      { content: [{ type: "output_text", text: JSON.stringify(value) }] },
    ],
  });
it("rejects invented source quotations and missing Spanish explanations", () => {
  expect(() => checkContextDraft(draft, sources)).not.toThrow();
  expect(() =>
    checkContextDraft(
      {
        ...draft,
        evidence: [
          {
            sourceId: "source-1",
            quote: "An invented quote long enough to sound plausible",
          },
        ],
      },
      sources,
    ),
  ).toThrow("unsupported");
  expect(() => checkContextDraft({ ...draft, es: null }, sources)).toThrow(
    "bilingual",
  );
});
it("requires drafting and a separate audit, charges the shared budget, then reuses the approved context", async () => {
  await job();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(response(draft))
    .mockResolvedValueOnce(response({ approved: true, issues: [] }));
  vi.stubGlobal("fetch", fetcher);
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  const context = await marketContextTick(env, store, id, quotes, now);
  expect(context?.en.sections).toHaveLength(3);
  expect(context?.es.sections).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(
    await store.db
      .prepare("SELECT ai_calls,ai_reserved FROM usage")
      .first<any>(),
  ).toEqual({ ai_calls: 2, ai_reserved: 0 });
  await marketContextTick(env, store, id, quotes, now);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not call the model when the daily cap cannot cover the reservation", async () => {
  await job();
  await store.db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.dailyBudgetMicrousd',1)",
    )
    .run();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
  const row = await store.db
    .prepare("SELECT phase,last_error FROM market_context_jobs")
    .first<any>();
  expect(row.phase).toBe("draft");
  expect(row.last_error).toContain("budget");
});
it("invalidates edited or directionally stale context instead of publishing an unaudited explanation", async () => {
  const digest = await hash(JSON.stringify([sources, draft]));
  await job("ready", { draft, hash: digest, auditPassed: true });
  const tampered = JSON.parse(JSON.stringify(draft));
  tampered.en.sections[0].text = ["Changed after the independent audit"];
  await store.db
    .prepare("UPDATE market_context_jobs SET payload=? WHERE id=?")
    .bind(
      JSON.stringify({
        sources,
        draft: tampered,
        hash: digest,
        auditPassed: true,
        checkedAt: now.toISOString(),
        orientation: quotes.map((q) => [q.symbol, 1]),
      }),
      id,
    )
    .run();
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  expect(
    (
      await store.db
        .prepare("SELECT phase FROM market_context_jobs")
        .first<any>()
    ).phase,
  ).toBe("audit");
});
it("upgrades both existing translations atomically, preserving original URLs, prices and publication dates", async () => {
  expect((await marketEditorialTick(env, now)).status).toBe("published");
  const prior = (
    await store.db
      .prepare("SELECT value FROM public_articles ORDER BY lang")
      .all<{ value: string }>()
  ).results.map((r) => JSON.parse(r.value));
  const digest = await hash(JSON.stringify([sources, draft]));
  await store.db
    .prepare(
      "INSERT INTO market_context_jobs(id,phase,payload,updated_at) VALUES(?,?,?,?)",
    )
    .bind(
      id,
      "ready",
      JSON.stringify({
        sources,
        draft,
        hash: digest,
        auditPassed: true,
        checkedAt: now.toISOString(),
        orientation: quotes.map((q) => [q.symbol, Math.sign(q.change24h)]),
      }),
      now.toISOString(),
    )
    .run();
  await store.db
    .prepare(
      "UPDATE market_editorial_control SET analysis_required=1,upgrade_existing=1",
    )
    .run();
  const result = await marketEditorialTick(env, new Date(+now + 60000));
  expect(result.status).toBe("analysis_updated");
  const after = (
    await store.db
      .prepare("SELECT value FROM public_articles ORDER BY lang")
      .all<{ value: string }>()
  ).results.map((r) => JSON.parse(r.value));
  for (const [i, a] of after.entries()) {
    expect(a.slug).toBe(prior[i].slug);
    expect(a.publishedAt).toBe(prior[i].publishedAt);
    expect(a.sections[0].table.rows).toEqual(prior[i].sections[0].table.rows);
    expect(a.editorialRevision).toBe(2);
    expect(a.sections.filter((s: any) => s.id.startsWith("why-"))).toHaveLength(
      3,
    );
    expect(a.sources.some((s: any) => s.url === sources[0].url)).toBe(true);
  }
});

it("re-reads original accessible reporting within the requested period without calling the model", async () => {
  await job("sources");
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,event_at,selection_reason) VALUES('context-event','context-event','Crypto rally and market drivers','https://example.org/original',?,?,'fixture')",
    )
    .bind(now.toISOString(), new Date(+now - 60000).toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,publisher,accessible,excerpt) VALUES('context-source','context-event','https://example.org/original','Original reporting',1,?)",
    )
    .bind("A source excerpt with market information. ".repeat(40))
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,publisher,accessible,excerpt) VALUES('context-ad','context-event','https://ads.example/signup','Signup',1,?)",
    )
    .bind("Promotional signup text. ".repeat(70))
    .run();
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,event_at,selection_reason) VALUES('evergreen','evergreen','Crypto arbitrage explained with prices','https://guide.example/arbitrage',?,?,'fixture')",
    )
    .bind(now.toISOString(), new Date(+now - 30000).toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,publisher,accessible,excerpt) VALUES('evergreen-source','evergreen','https://guide.example/arbitrage','Evergreen',1,?)",
    )
    .bind("General trading tutorial, not current market drivers. ".repeat(40))
    .run();
  const fetcher = vi.fn(
    async () =>
      new Response(
        "<article><h1>Reported market context</h1><p>" +
          sources[0].text.repeat(30) +
          "</p></article>",
        { headers: { "Content-Type": "text/html" } },
      ),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0][0]).toBe("https://example.org/original");
  const row = await store.db
    .prepare("SELECT phase,payload FROM market_context_jobs")
    .first<any>();
  expect(row.phase).toBe("draft");
  expect(JSON.parse(row.payload).sources[0].url).toBe(
    "https://example.org/original",
  );
});

it("keeps a rejected explanation private and does not retry the model indefinitely", async () => {
  await job("audit", { draft });
  await store.db.prepare("UPDATE market_context_jobs SET attempts=1").run();
  const fetcher = vi.fn(async () =>
    response({ approved: false, issues: ["Unsupported causal claim"] }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect(await marketContextTick(env, store, id, quotes, now)).toBeNull();
  expect(
    (
      await store.db
        .prepare("SELECT phase FROM market_context_jobs")
        .first<any>()
    ).phase,
  ).toBe("held");
  await marketContextTick(env, store, id, quotes, now);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_articles")
        .first<any>()
    ).n,
  ).toBe(0);
});
it("a held historical upgrade cannot starve a later fully reviewed edition", async () => {
  expect((await marketEditorialTick(env, now)).status).toBe("published");
  await job("held", { draft });
  const later = new Date(+now + 120 * 60000),
    nextId = "market-2026-11-04-2";
  const nextQuotes = quotes.map((q) => ({
    ...q,
    price: q.price + 100,
    updatedAt: later.toISOString(),
  }));
  await store.db
    .prepare("UPDATE market_cache SET value=?,updated_at=?")
    .bind(JSON.stringify(nextQuotes), later.toISOString())
    .run();
  await store.db
    .prepare(
      "UPDATE market_editorial_control SET analysis_required=1,upgrade_existing=1",
    )
    .run();
  const digest = await hash(JSON.stringify([sources, draft]));
  await store.db
    .prepare(
      "INSERT INTO market_context_jobs(id,phase,payload,updated_at) VALUES(?,?,?,?)",
    )
    .bind(
      nextId,
      "ready",
      JSON.stringify({
        sources,
        draft,
        hash: digest,
        auditPassed: true,
        checkedAt: later.toISOString(),
        orientation: nextQuotes.map((q) => [q.symbol, Math.sign(q.change24h)]),
      }),
      later.toISOString(),
    )
    .run();
  expect((await marketEditorialTick(env, later)).status).toBe("published");
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM public_articles")
        .first<any>()
    ).n,
  ).toBe(4);
});
