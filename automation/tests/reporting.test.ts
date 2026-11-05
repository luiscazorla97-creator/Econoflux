import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import { Store } from "../src/store";
import {
  sufficientReporting,
  reportingOrigins,
  nextNewsPoll,
} from "../src/reporting";
import { hourlyTick } from "../src/hourly";
import { collect } from "../src/engine";
import { sourceDigest, checkReportFollowup } from "../src/report-followups";
import { verificationSchema } from "../src/editorial-schema";
import { confirmationLabel, isReported } from "../../src/lib/confirmation";
import type { Env, Source, Verification } from "../src/types";
const now = new Date("2026-11-02T16:00:00Z");
let mf: Miniflare, store: Store, env: Env;
const quote =
  "Jane Smith, the lead engineer, said the public test network is available today.";
function source(id = "report", primary = 0, text = quote.repeat(6)): Source {
  return {
    id,
    event_id: "candidate",
    url: `https://${id}.example/report`,
    publisher: id,
    published_at: now.toISOString(),
    fetched_at: now.toISOString(),
    accessible: 1,
    primary_source: primary,
    independence_group: id + ".example",
    excerpt: text,
    error: null,
  };
}
function verdict(sources = [source()]): Verification {
  return {
    sufficient: true,
    reason: "Identified on-record report",
    essentialFacts: [quote],
    eventDate: now.toISOString(),
    primaryUrls: sources.filter((s) => s.primary_source).map((s) => s.url),
    sourceIds: sources.map((s) => s.id),
    independentGroups: sources.map((s) => s.independence_group!),
    highRisk: false,
    urgency: { confirmed: false, reason: "Routine" },
    canonicalEvent: "example-product-test-network",
    category: "altcoins",
    relevanceScore: 70,
    materialUpdate: false,
    confirmation: {
      status: "confirmed",
      resolution: "confirmed",
      basis: "on_record_reporting",
      originalReportUrl: sources[0].url,
      explanation: "Named engineer quoted by the original outlet",
      confirmedFacts: [quote],
      unconfirmedClaims: [],
      evidence: sources.map((s) => ({
        sourceId: s.id,
        quote: (s.excerpt || "").slice(0, quote.length),
        originUrl: s.url,
        originalReporting: true,
        onRecord: true,
      })),
    },
  };
}
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "reporting" },
  });
  const db = await mf.getD1Database("DB");
  for (const file of readdirSync("automation/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync("automation/migrations/" + file, "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
  store = new Store(db as any);
  env = {
    DB: db as any,
    SITE_URL: "https://econoflux.com",
    AI_MODEL: "gpt-5-mini",
    CRYPTONEWS_API_KEY: "test-news-key",
    ECONOFLUX_OPENAI_API_KEY: "test-ai-key",
    GITHUB_REPOSITORY: "fixture",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "econoflux",
  };
  await db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.reportingPolicy',2,'$.dailyBudgetMicrousd',3000000)",
    )
    .run();
  await db
    .prepare(
      "UPDATE automation_control SET enabled=1,paused=0,initial_target=0,initial_completed_at=?,next_review=?",
    )
    .bind(now.toISOString(), now.toISOString())
    .run();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
it("accepts an identified on-record journalistic report without an official primary", () => {
  expect(sufficientReporting(verdict(), [source()])).toBe(true);
});
it("labels identifiable unconfirmed reporting as rumor or leak without authenticating the underlying claim", () => {
  for (const status of ["rumor", "leak"] as const) {
    const v = verdict();
    Object.assign(v.confirmation!, {
      status,
      resolution: "pending",
      basis: "attributed_reporting",
      unconfirmedClaims: ["Release date is not independently authenticated"],
    });
    v.confirmation!.evidence[0].onRecord = false;
    expect(sufficientReporting(v, [source()])).toBe(true);
  }
});
it("rejects unsupported certainty and quotations that are absent from the report", () => {
  const v = verdict();
  v.confirmation!.evidence[0].onRecord = false;
  expect(sufficientReporting(v, [source()])).toBe(false);
  v.confirmation!.evidence[0].onRecord = true;
  v.confirmation!.evidence[0].quote =
    "A quotation that was never in this source document.";
  expect(sufficientReporting(v, [source()])).toBe(false);
});
it("withholds potentially harmful rumors and requires independent support for high-risk assertions", () => {
  const v = verdict();
  v.essentialFacts = ["The company committed fraud."];
  Object.assign(v.confirmation!, {
    status: "rumor",
    resolution: "pending",
    basis: "attributed_reporting",
    unconfirmedClaims: ["An anonymous accusation"],
  });
  expect(sufficientReporting(v, [source()])).toBe(false);
  const p = source("official", 1),
    a = source(
      "report",
      0,
      "A separate investigation established further independently obtained records. ".repeat(
        8,
      ),
    ),
    confirmed = verdict([p, a]);
  confirmed.highRisk = true;
  expect(sufficientReporting(confirmed, [p, a])).toBe(true);
  expect(sufficientReporting(verdict([p]), [p])).toBe(true);
  confirmed.sourceIds = [p.id];
  confirmed.confirmation!.evidence = confirmed.confirmation!.evidence.slice(
    0,
    1,
  );
  expect(sufficientReporting(confirmed, [p])).toBe(false);
});
it("counts wire copies and reports sharing one original as one origin", () => {
  const a = source(
      "a",
      0,
      "According to Reuters, the test network is live. " + quote.repeat(8),
    ),
    b = source(
      "b",
      0,
      "According to Reuters, engineers announced a network test. " +
        quote.repeat(8),
    );
  const v = verdict([a, b]);
  v.confirmation!.basis = "independent_reporting";
  v.confirmation!.evidence.forEach((e) => (e.onRecord = false));
  expect(new Set(reportingOrigins([a, b]).values()).size).toBe(1);
  expect(sufficientReporting(v, [a, b])).toBe(false);
  for (const s of [a, b])
    s.origin_links = JSON.stringify(["https://original.example/report"]);
  v.confirmation!.evidence.forEach(
    (e) => (e.originUrl = "https://original.example/report"),
  );
  expect(sufficientReporting(v, [a, b])).toBe(false);
});
it("supports an empty official-source list in the strict model schema", () => {
  const schema: any = verificationSchema([source()], [], true);
  expect(schema.properties.primaryUrls.maxItems).toBe(0);
  expect(schema.properties.confirmation.properties.status.enum).toEqual([
    "confirmed",
    "rumor",
    "leak",
  ]);
});
it("polls six times in one hour without opening six publication windows", async () => {
  const fetcher = vi.fn(async () => Response.json({ data: [] }));
  vi.stubGlobal("fetch", fetcher);
  for (let i = 0; i < 6; i++)
    expect((await hourlyTick(env, new Date(+now + i * 600000))).status).toBe(
      "collected",
    );
  await hourlyTick(env, new Date(+now + 50 * 60000 + 30000));
  expect(fetcher).toHaveBeenCalledTimes(6);
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM news_polls WHERE result='ok'")
        .first<any>()
    ).n,
  ).toBe(6);
  expect(
    (
      await store.db
        .prepare("SELECT count(*) n FROM hourly_cycles WHERE kind='hourly'")
        .first<any>()
    ).n,
  ).toBe(1);
  expect(nextNewsPoll(new Date(+now + 599999))).toBe(
    "2026-11-02T16:10:00.000Z",
  );
});
it("uses the authorized five-story maximum without multiplying windows across polls", async () => {
  await store.db.prepare("UPDATE automation_control SET max_per_cycle=5").run();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ data: [] })),
  );
  for (let i = 0; i < 6; i++)
    await hourlyTick(env, new Date(+now + i * 600000));
  const rows = (
    await store.db
      .prepare("SELECT limit_count FROM hourly_cycles WHERE kind='hourly'")
      .all<any>()
  ).results;
  expect(rows).toEqual([{ limit_count: 5 }]);
});
it("backs off a provider quota response without upgrading the plan or polling per minute", async () => {
  const fetcher = vi.fn(
    async () =>
      new Response("{}", { status: 429, headers: { "retry-after": "7200" } }),
  );
  vi.stubGlobal("fetch", fetcher);
  expect((await hourlyTick(env, now)).status).toBe("error");
  await hourlyTick(env, new Date(+now + 60000));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (
      await store.db
        .prepare("SELECT next_review FROM automation_control")
        .first<any>()
    ).next_review,
  ).toBe("2026-11-02T18:00:00.000Z");
});
it("deduplicates unchanged API reports across frequent polls", async () => {
  const row = {
    title: "A new public test network launches",
    news_url: "https://report.example/report",
    date: new Date().toISOString(),
    source_name: "Reporter",
    news_id: "original-1",
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ data: [row] })),
  );
  const s = (await store.settings()).value;
  await collect(env, store, s);
  await collect(env, store, s);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM events").first<any>()).n,
  ).toBe(1);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM sources").first<any>()).n,
  ).toBe(1);
});
it("uses clear localized labels and retains resolved reports in the archive", () => {
  expect(
    confirmationLabel({ status: "leak", resolution: "pending" } as any, "es"),
  ).toBe("FILTRACIÓN");
  expect(
    confirmationLabel({ status: "rumor", resolution: "pending" } as any, "en"),
  ).toBe("RUMOR");
  expect(
    confirmationLabel(
      { status: "confirmed", resolution: "denied" } as any,
      "es",
    ),
  ).toBe("REPORTE DESMENTIDO");
  expect(
    isReported({ status: "confirmed", originStatus: "rumor" } as any),
  ).toBe(true);
});
it("does not change a public article or its dates when a follow-up source is unchanged", async () => {
  const s = source(),
    text = s.excerpt!;
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,state,selection_reason,published_at) VALUES('candidate','candidate','Original report',?,?,'published','fixture',?)",
    )
    .bind(s.url, now.toISOString(), now.toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO sources(id,event_id,url,publisher,fetched_at,accessible,primary_source,excerpt) VALUES(?,?,?,?,?,1,0,?)",
    )
    .bind(s.id, "candidate", s.url, s.publisher, now.toISOString(), text)
    .run();
  await store.db
    .prepare(
      "INSERT INTO report_followups(translation_id,signature,next_check) VALUES(?,?,?)",
    )
    .bind("candidate", await sourceDigest([s]), now.toISOString())
    .run();
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(text, { headers: { "content-type": "text/plain" } }),
    ),
  );
  await checkReportFollowup(env, store, (await store.settings()).value, now);
  expect(
    (await store.db.prepare("SELECT count(*) n FROM events").first<any>()).n,
  ).toBe(1);
  expect((await store.event("candidate"))?.published_at).toBe(
    now.toISOString(),
  );
  // A busy queue must not postpone a due confirmation check indefinitely.
  const followupNow = new Date(+now + 60000);
  await store.db
    .prepare("UPDATE automation_control SET next_review=?")
    .bind(nextNewsPoll(now))
    .run();
  await store.db
    .prepare("UPDATE report_followups SET next_check=?")
    .bind(followupNow.toISOString())
    .run();
  await store.db
    .prepare(
      "INSERT INTO events(id,provider_id,fingerprint,title,url,detected_at,state,selection_reason) VALUES('backlog','backlog','backlog','Unprocessed news','https://backlog.example/story',?,'detected','fixture')",
    )
    .bind(now.toISOString())
    .run();
  expect((await hourlyTick(env, followupNow)).status).toBe("report_followup");
  expect((await store.event("backlog"))?.state).toBe("detected");
  expect((await store.event("candidate"))?.published_at).toBe(
    now.toISOString(),
  );
});
it("distinguishes legal safeguards from an allegation while retaining mixed-claim protection", () => {
  const v = verdict();
  Object.assign(v.confirmation!, {
    status: "rumor",
    resolution: "pending",
    basis: "attributed_reporting",
    unconfirmedClaims: [
      "The unpublished bill may contain these proposed safeguards.",
    ],
  });
  v.essentialFacts = [
    "The outlet describes fraud exceptions and insolvency treatment in earlier proposed customer-protection rules, not an allegation against a company.",
  ];
  expect(sufficientReporting(v, [source()])).toBe(true);
  v.essentialFacts.push(
    "The company committed fraud despite its anti-fraud policies.",
  );
  expect(sufficientReporting(v, [source()])).toBe(false);
  v.essentialFacts = ["The company is insolvent."];
  expect(sufficientReporting(v, [source()])).toBe(false);
});
