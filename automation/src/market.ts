import type { Env } from "./types";
import { bounded } from "./providers";
export const SYMBOLS = ["BTC", "ETH", "SOL"];
export interface Quote {
  symbol: string;
  price: number;
  change24h: number | null;
  updatedAt: string;
}
function numeric(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (
    typeof value === "string" &&
    value.trim() !== "" &&
    /^[+-]?[\d.,]+%?$/.test(value)
  )
    return Number(value.replace(/,/g, "").replace("%", ""));
  return null;
}
export function parseQuotes(payload: any, now = new Date()): Quote[] {
  const data = payload?.data ?? payload?.prices;
  const rows = Array.isArray(data)
    ? data
    : data && typeof data === "object"
      ? Object.entries(data).map(([symbol, value]) => ({
          symbol,
          ...(value as object),
        }))
      : [];
  const result: Quote[] = [];
  for (const row of rows) {
    const symbol = String(row.ticker || row.symbol || "").toUpperCase();
    if (!SYMBOLS.includes(symbol)) continue;
    const price = numeric(row.price_usd ?? row.price ?? row.usd);
    const change = numeric(
      row.price_change_percent_24h ??
        row.change_24h_pct ??
        row.price_change_percentage_24h ??
        row.percent_change_24h ??
        row.change_percent_24h ??
        row.change_24h_percent,
    );
    const time =
      row.last_updated ?? row.updated_at ?? row.timestamp ?? payload.updated_at;
    const millis =
      typeof time === "number"
        ? time < 1e12
          ? time * 1000
          : time
        : Date.parse(time);
    if (!price || price <= 0) continue;
    result.push({
      symbol,
      price,
      change24h: change,
      updatedAt:
        Number.isFinite(millis) && millis <= +now + 900000
          ? new Date(millis).toISOString()
          : now.toISOString(),
    });
  }
  if (SYMBOLS.some((symbol) => !result.some((q) => q.symbol === symbol)))
    throw new Error("Respuesta de cotizaciones incompleta");
  return SYMBOLS.map((symbol) => result.find((q) => q.symbol === symbol)!);
}
export async function refreshMarket(env: Env, now = new Date()) {
  const claim = await env.DB.prepare(
    "UPDATE market_cache SET next_attempt=? WHERE id=1 AND next_attempt<=?",
  )
    .bind(new Date(+now + 15 * 60000).toISOString(), now.toISOString())
    .run();
  if (!claim.meta.changes) return;
  try {
    if (!env.CRYPTONEWS_API_KEY)
      throw new Error("Falta el secreto de noticias en el Worker");
    const day = now.toISOString().slice(0, 10);
    await env.DB.prepare(
      "INSERT INTO market_usage(day) VALUES(?) ON CONFLICT DO NOTHING",
    )
      .bind(day)
      .run();
    const charged = await env.DB.prepare(
      "UPDATE market_usage SET calls=calls+1 WHERE day=? AND calls<100",
    )
      .bind(day)
      .run();
    if (!charged.meta.changes)
      throw new Error("Tope diario de consultas de cotizaciones alcanzado");
    const url = new URL("https://cryptonews-api.com/api/v1/ticker-price");
    url.search = new URLSearchParams({
      tickers: SYMBOLS.join(","),
      token: env.CRYPTONEWS_API_KEY,
    }).toString();
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(15000),
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error(`Crypto Prices HTTP ${response.status}`);
    const payload = JSON.parse(await bounded(response, 200000));
    const data = payload.data ?? payload.prices;
    const rows = Array.isArray(data) ? data : Object.values(data || {});
    const diagnostic = {
      keys: Object.keys(payload),
      dataKeys: Object.keys(data || {}).slice(0, 4),
      fields: rows.slice(0, 3).map((row: any) => Object.keys(row)),
      sample: rows
        .slice(0, 3)
        .map((row: any) =>
          Object.fromEntries(
            Object.entries(row).filter(
              ([key, value]) =>
                typeof value === "number" ||
                (typeof value === "string" && /^[+-]?[\d.,]+%?$/.test(value)) ||
                (/ticker|symbol|date|time|updated/i.test(key) &&
                  typeof value === "string"),
            ),
          ),
        ),
    };
    await env.DB.prepare("UPDATE market_cache SET diagnostic=? WHERE id=1")
      .bind(JSON.stringify(diagnostic))
      .run();
    const quotes = parseQuotes(payload, now);
    await env.DB.prepare(
      "UPDATE market_cache SET value=?,updated_at=?,last_error=NULL WHERE id=1",
    )
      .bind(JSON.stringify(quotes), now.toISOString())
      .run();
  } catch (error) {
    const message =
      error instanceof Error &&
      /^(Crypto Prices HTTP|Falta el secreto|Tope diario|Respuesta de cotizaciones)/.test(
        error.message,
      )
        ? error.message
        : "No se pudo actualizar Crypto Prices; se conserva el último dato válido";
    await env.DB.prepare("UPDATE market_cache SET last_error=? WHERE id=1")
      .bind(message)
      .run();
  }
}
