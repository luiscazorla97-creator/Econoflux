import { it, expect, afterEach, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { parseQuotes, refreshMarket } from "../src/market";
import { isIndexableSite } from "../../src/lib/site";
const sample = {
  data: ["BTC", "ETH", "SOL"].map((ticker, n) => ({
    ticker,
    price_usd: String(100 + n),
    price_change_percent_24h: String(n === 2 ? -0.616 : 1.105),
    last_updated: "2026-11-02 01:47:21",
  })),
};
it("parses actual provider fields and keeps percentage change separate from dollar change", () => {
  const quotes = parseQuotes(sample);
  expect(quotes.map((q) => q.symbol)).toEqual(["BTC", "ETH", "SOL"]);
  expect(quotes[0].change24h).toBe(1.105);
  expect(quotes[2].change24h).toBe(-0.616);
  expect(() => parseQuotes({ data: sample.data.slice(0, 2) })).toThrow(
    "incompleta",
  );
});
it("allows indexing only on the launched official host", () => {
  const locals = { runtime: { env: { PUBLIC_LAUNCH: "true" } } };
  expect(isIndexableSite(new URL("https://econoflux.com/en/"), locals)).toBe(
    true,
  );
  for (const host of [
    "econoflux.pages.dev",
    "preview.econoflux.pages.dev",
    "www.econoflux.com",
  ])
    expect(isIndexableSite(new URL("https://" + host + "/en/"), locals)).toBe(
      false,
    );
  expect(
    isIndexableSite(new URL("https://econoflux.com/en/"), {
      runtime: { env: { PUBLIC_LAUNCH: "false" } },
    }),
  ).toBe(false);
});
afterEach(() => vi.unstubAllGlobals());
it("shares one refresh across concurrent ticks and retains valid data on failure", async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("test")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "market-test" },
  });
  try {
    const db = await mf.getD1Database("DB");
    for (const sql of readFileSync(
      "automation/migrations/0004_market_images.sql",
      "utf8",
    ).split(";"))
      if (sql.trim()) await db.prepare(sql).run();
    const fetcher = vi.fn(async () => Response.json(sample));
    vi.stubGlobal("fetch", fetcher);
    const env = { DB: db, CRYPTONEWS_API_KEY: "fixture" } as any;
    const now = new Date("2026-11-02T01:48:00Z");
    await Promise.all([refreshMarket(env, now), refreshMarket(env, now)]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const before = await db.prepare("SELECT value FROM market_cache").first();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    await refreshMarket(env, new Date(+now + 16 * 60000));
    const after = await db
      .prepare("SELECT value,last_error FROM market_cache")
      .first();
    expect(after?.value).toBe(before?.value);
    expect(after?.last_error).toContain("HTTP 503");
  } finally {
    await mf.dispose();
  }
});
