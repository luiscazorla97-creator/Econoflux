import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readdirSync, readFileSync } from "node:fs";
import { Store } from "../src/store";
import {
  reportDailyPlan,
  reportOrder,
  reportQueueFilter,
  mayPublishReport,
} from "../src/report-daily";
import type { Event } from "../src/types";
let mf: Miniflare, store: Store;
const morning = new Date("2026-11-04T15:00:00Z"),
  evening = new Date("2026-11-04T23:00:00Z");
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("test")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "report-daily" },
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
  await store.db.prepare("UPDATE report_editorial_control SET enabled=1").run();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function published(
  id: string,
  date: string,
  status = "rumor",
  originStatus?: string,
) {
  for (const lang of ["en", "es"])
    await store.db
      .prepare(
        "INSERT INTO public_articles(translation_id,lang,slug,revision,value,published_at) VALUES(?,?,?,1,?,?)",
      )
      .bind(
        id,
        lang,
        id,
        JSON.stringify({ confirmation: { status, originStatus } }),
        date,
      )
      .run();
}
function event(id: string, status = "rumor") {
  return {
    id,
    verification: JSON.stringify({ confirmation: { status } }),
    related_id: null,
    published_at: null,
  } as Event;
}
it("sets one morning and two evening goals, counting bilingual stories only once", async () => {
  expect(
    (await reportDailyPlan(store, new Date("2026-11-04T14:59:00Z")))?.due,
  ).toBe(false);
  expect((await reportDailyPlan(store, morning))?.due).toBe(true);
  await published("one", "2026-11-04T15:01:00Z");
  expect(
    (await reportDailyPlan(store, new Date("2026-11-04T16:00:00Z")))?.due,
  ).toBe(false);
  expect((await reportDailyPlan(store, evening))?.due).toBe(true);
  await published("two", "2026-11-04T22:00:00Z", "leak");
  expect((await reportDailyPlan(store, evening))?.published).toBe(2);
  expect((await reportDailyPlan(store, evening))?.due).toBe(false);
  expect(await mayPublishReport(store, event("third"), evening)).toBe(false);
  expect(
    await mayPublishReport(store, event("ordinary", "confirmed"), evening),
  ).toBe(true);
});
it("uses the local date across UTC midnight, keeps resolved reports and permits material updates", async () => {
  await published("previous", "2026-11-04T04:59:00Z");
  await published("one", "2026-11-04T15:00:00Z", "confirmed", "rumor");
  await published("two", "2026-11-05T01:00:00Z", "leak");
  expect(
    (await reportDailyPlan(store, new Date("2026-11-05T02:00:00Z")))?.published,
  ).toBe(2);
  expect(
    (await reportDailyPlan(store, new Date("2026-11-05T05:00:00Z")))?.published,
  ).toBe(0);
  expect(
    await mayPublishReport(
      store,
      { ...event("update"), related_id: "one" },
      evening,
    ),
  ).toBe(true);
});
it("retains normal ordering when disabled and verified urgent news ahead of rumor hints", async () => {
  await store.db.prepare("UPDATE report_editorial_control SET enabled=0").run();
  expect(await reportDailyPlan(store, evening)).toBeNull();
  expect(reportOrder(false)).toBe("importance DESC");
  for (const [id, title, importance] of [
    ["urgent", "Official urgent development", 90],
    ["rumor", "Identifiable source rumor", 65],
    ["ordinary", "Ordinary report", 80],
  ] as const)
    await store.db
      .prepare(
        "INSERT INTO events(id,fingerprint,title,url,detected_at,selection_reason,importance,state) VALUES(?,?,?,?,?,'fixture',?,'detected')",
      )
      .bind(
        id,
        id,
        title,
        "https://example.org/" + id,
        evening.toISOString(),
        importance,
      )
      .run();
  const rows = await store.db
    .prepare("SELECT id FROM events ORDER BY " + reportOrder(true))
    .all<{ id: string }>();
  expect(rows.results.map((r) => r.id)).toEqual([
    "urgent",
    "rumor",
    "ordinary",
  ]);
});
it("respects reservations without exceeding two actual publications and performs no provider calls", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await published("one", "2026-11-04T15:00:00Z");
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,selection_reason,state,revision,approved_revision,verification) VALUES('held','held','A supported report','https://example.org/held',?,'fixture','approved',1,1,?)",
    )
    .bind(morning.toISOString(), event("held").verification)
    .run();
  await store.db
    .prepare(
      "INSERT INTO cycle_items(event_id,cycle_id,kind,state,reserved_at) VALUES('held','initial-once','new','reserved',?)",
    )
    .bind(morning.toISOString())
    .run();
  expect((await reportDailyPlan(store, evening))?.due).toBe(true);
  expect(await mayPublishReport(store, event("other"), evening)).toBe(false);
  expect(await mayPublishReport(store, event("held"), evening)).toBe(true);
  await published("two", "2026-11-04T22:00:00Z", "leak");
  expect(await mayPublishReport(store, event("held"), evening)).toBe(false);
  expect(fetcher).not.toHaveBeenCalled();
});
it("does not count a visible pair awaiting public confirmation twice", async () => {
  await store.db
    .prepare(
      "INSERT INTO events(id,fingerprint,title,url,detected_at,selection_reason,state,revision,approved_revision,verification) VALUES('visible','visible','Source report','https://example.org/visible',?,'fixture','live_pending',1,1,?)",
    )
    .bind(morning.toISOString(), event("visible").verification)
    .run();
  await store.db
    .prepare(
      "INSERT INTO cycle_items(event_id,cycle_id,kind,state,reserved_at) VALUES('visible','initial-once','new','reserved',?)",
    )
    .bind(morning.toISOString())
    .run();
  await published("visible", "2026-11-04T16:00:00Z");
  const plan = await reportDailyPlan(store, evening);
  expect(plan?.published).toBe(1);
  expect(plan?.reserved).toBe(0);
  expect(await mayPublishReport(store, event("second"), evening, plan)).toBe(
    true,
  );
});

it("keeps capped report queues from starving ordinary confirmed news", async () => {
  await published("one", "2026-11-04T15:00:00Z");
  await published("two", "2026-11-04T17:00:00Z");
  for (let i = 0; i < 9; i++)
    await store.db
      .prepare(
        "INSERT INTO events(id,fingerprint,title,url,detected_at,selection_reason,state,revision,approved_revision,importance,verification) VALUES(?,?,?,?,?,'fixture','approved',1,1,?,?)",
      )
      .bind(
        "queued-" + i,
        "q-" + i,
        "Source story",
        "https://example.org/q-" + i,
        morning.toISOString(),
        i === 8 ? 60 : 80,
        event("q", i === 8 ? "confirmed" : "rumor").verification,
      )
      .run();
  const plan = await reportDailyPlan(store, evening);
  const rows = await store.db
    .prepare(
      "SELECT id FROM events WHERE state='approved' " +
        reportQueueFilter(plan) +
        " ORDER BY importance DESC LIMIT 8",
    )
    .all<{ id: string }>();
  expect(rows.results.map((r) => r.id)).toEqual(["queued-8"]);
});
