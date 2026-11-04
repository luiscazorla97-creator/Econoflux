import { it, expect, beforeEach, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync, readdirSync } from "node:fs";
import {
  marketEditorialTick,
  marketSlots,
  marketInstant,
  validMarketQuotes,
  marketPair,
} from "../src/market-editorial";
import { dayKey, validatePair } from "../src/policy";
import type { Env } from "../src/types";
let mf: Miniflare, db: any, env: Env;
const now = new Date("2026-11-04T23:30:00Z");
const quotes = (time = now, move = 0) =>
  ["BTC", "ETH", "SOL"].map((symbol, i) => ({
    symbol,
    price: 80000 / (i + 1) + move,
    change24h: [3.25, -1.75, 0][i],
    updatedAt: time.toISOString(),
  }));
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("test")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "markets-test" },
  });
  db = await mf.getD1Database("DB");
  for (const file of readdirSync("automation/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    for (const sql of readFileSync("automation/migrations/" + file, "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
  env = { DB: db } as Env;
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function activate() {
  await db.prepare("UPDATE automation_control SET enabled=1,paused=0").run();
  await db
    .prepare("UPDATE market_editorial_control SET enabled=1,activation_at=?")
    .bind(now.toISOString())
    .run();
}
async function prices(time = now, move = 0) {
  await db
    .prepare("UPDATE market_cache SET value=?,updated_at=?,last_error=NULL")
    .bind(JSON.stringify(quotes(time, move)), time.toISOString())
    .run();
}
it("schedules three local editions across DST and starts three spaced editions on activation day", () => {
  expect(marketInstant("2026-07-01", 9)).toBe("2026-07-01T13:00:00.000Z");
  expect(marketInstant("2026-11-05", 9)).toBe("2026-11-05T14:00:00.000Z");
  const slots = marketSlots(now, now.toISOString());
  expect(slots).toHaveLength(3);
  expect(slots.map((t) => dayKey(new Date(t)))).toEqual([
    "2026-11-04",
    "2026-11-04",
    "2026-11-04",
  ]);
  expect(
    marketSlots(new Date("2026-11-05T18:00:00Z"), now.toISOString()),
  ).toEqual([
    "2026-11-05T14:00:00.000Z",
    "2026-11-05T20:00:00.000Z",
    "2026-11-06T02:00:00.000Z",
  ]);
});
it("rejects missing, non-finite, stale and future quotes without invented replacements", () => {
  expect(validMarketQuotes(quotes(), now)).toHaveLength(3);
  for (const sample of [
    quotes().slice(1),
    quotes(new Date(+now - 21 * 60000)),
    quotes(new Date(+now + 3 * 60000)),
    quotes().map((q) => ({ ...q, price: NaN })),
  ])
    expect(() => validMarketQuotes(sample, now)).toThrow();
});
it("publishes at most three atomic bilingual pairs, costs no API calls and leaves news, Academy and usage unchanged", async () => {
  await activate();
  await prices();
  await db
    .prepare(
      "INSERT INTO usage(day,ai_calls,ai_actual,ai_reserved) VALUES('2026-11-04',480,5990000,10000)",
    )
    .run();
  const before = await db.prepare("SELECT * FROM automation_control").first(),
    academy = await db.prepare("SELECT * FROM academy_control").first(),
    usage = await db.prepare("SELECT * FROM usage").all();
  const network = vi.fn(() => {
    throw Error("Market editions must use only cached data");
  });
  vi.stubGlobal("fetch", network);
  const results = await Promise.all([
    marketEditorialTick(env, now),
    marketEditorialTick(env, now),
  ]);
  expect(results.filter((r) => r.status === "published")).toHaveLength(1);
  expect(
    (await db.prepare("SELECT count(*) n FROM public_articles").first()).n,
  ).toBe(2);
  for (const [index, minutes] of [120, 240].entries()) {
    const next = new Date(+now + minutes * 60000);
    await prices(next, 100 * (index + 1));
    expect((await marketEditorialTick(env, next)).status).toBe("published");
  }
  const later = new Date(+now + 270 * 60000);
  await prices(later, 999);
  expect((await marketEditorialTick(env, later)).status).toBe("waiting");
  expect(
    (await db.prepare("SELECT count(*) n FROM public_articles").first()).n,
  ).toBe(6);
  expect(
    (await db.prepare("SELECT count(*) n FROM market_edition_assets").first())
      .n,
  ).toBe(3);
  expect(
    (
      await db
        .prepare(
          "SELECT count(*) n FROM editorial_assets WHERE kind='data-chart' AND ready=1",
        )
        .first()
    ).n,
  ).toBe(3);
  expect(await db.prepare("SELECT * FROM automation_control").first()).toEqual(
    before,
  );
  expect(await db.prepare("SELECT * FROM academy_control").first()).toEqual(
    academy,
  );
  expect((await db.prepare("SELECT * FROM usage").all()).results).toEqual(
    usage.results,
  );
  expect(network).not.toHaveBeenCalled();
  const pair = (
    await db
      .prepare(
        "SELECT value FROM public_articles WHERE translation_id=? ORDER BY lang",
      )
      .bind("market-2026-11-04-1")
      .all()
  ).results.map((r: any) => JSON.parse(r.value));
  expect(() => validatePair(pair[0], pair[1])).not.toThrow();
});
it("honors pause, defers stale data, and never publishes unchanged quotes twice", async () => {
  await activate();
  await prices();
  await db.prepare("UPDATE automation_control SET paused=1").run();
  expect((await marketEditorialTick(env, now)).status).toBe("paused");
  await db.prepare("UPDATE automation_control SET paused=0").run();
  await prices(new Date(+now - 21 * 60000));
  expect((await marketEditorialTick(env, now)).status).toBe("deferred");
  await prices();
  expect((await marketEditorialTick(env, now)).status).toBe("published");
  const next = new Date(+now + 120 * 60000);
  await prices(next);
  expect((await marketEditorialTick(env, next)).status).toBe("unchanged");
  expect(
    (await db.prepare("SELECT count(*) n FROM public_articles").first()).n,
  ).toBe(2);
});
