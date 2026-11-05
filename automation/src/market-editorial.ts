import { marketContextTick, enrichMarketPair } from "./market-context";
import { Store } from "./store";
import { dayKey, dayEnd, TIME_ZONE, hash, validatePair } from "./policy";
import type { Env, PreparedArticle } from "./types";
import type { Quote } from "./market";
import { marketArtwork } from "./market-art";
import { validatePublished } from "../../src/lib/published";
import { editorialByline } from "../../src/lib/i18n";

export const MARKET_HOURS = [9, 15, 21];
export function marketInstant(day: string, hour: number) {
  const base = Date.parse(day + "T00:00:00Z");
  for (let i = 0; i < 32; i++) {
    const d = new Date(base + i * 3600000);
    if (
      dayKey(d) === day &&
      Number(
        new Intl.DateTimeFormat("en-US", {
          timeZone: TIME_ZONE,
          hour: "numeric",
          hourCycle: "h23",
        }).format(d),
      ) === hour
    )
      return d.toISOString();
  }
  throw new Error("Market schedule cannot be resolved");
}
export function marketSlots(now: Date, activation: string) {
  const day = dayKey(now);
  if (day === dayKey(new Date(activation))) {
    const start = Date.parse(activation),
      gap = Math.min(
        120 * 60000,
        Math.floor((+dayEnd(now) - start - 5 * 60000) / 2),
      );
    return [0, 1, 2].map((i) =>
      new Date(start + i * Math.max(0, gap)).toISOString(),
    );
  }
  return MARKET_HOURS.map((hour) => marketInstant(day, hour));
}
export function validMarketQuotes(value: unknown, now: Date): Quote[] {
  if (!Array.isArray(value) || value.length !== 3)
    throw new Error("Incomplete price snapshot");
  return ["BTC", "ETH", "SOL"].map((symbol) => {
    const q = value.find((q) => q?.symbol === symbol);
    if (
      !q ||
      !Number.isFinite(q.price) ||
      q.price <= 0 ||
      !Number.isFinite(q.change24h) ||
      !Number.isFinite(Date.parse(q.updatedAt)) ||
      +now - Date.parse(q.updatedAt) > 15 * 60000 ||
      Date.parse(q.updatedAt) > +now + 120000
    )
      throw new Error("Fresh complete prices required");
    return {
      symbol,
      price: q.price,
      change24h: q.change24h,
      updatedAt: q.updatedAt,
    };
  });
}
const num = (n: number) => n.toFixed(2),
  pct = (n: number) => (n > 0 ? "+" : "") + num(n) + "%";
const names: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
};
export function marketPair(
  id: string,
  day: string,
  edition: number,
  quotes: Quote[],
  now: Date,
  previous: Quote[] | null,
  related: { lang: string; slug: string; title: string }[],
): PreparedArticle[] {
  const ranking = [...quotes].sort((a, b) => b.change24h! - a.change24h!);
  const best = ranking[0],
    worst = ranking[2];
  const at = quotes.map((q) => q.updatedAt).sort()[0],
    stamp = at.replace("T", " ").slice(0, 16) + " UTC";
  const spread = num(best.change24h! - worst.change24h!),
    up = quotes.filter((q) => q.change24h! > 0).length,
    down = quotes.filter((q) => q.change24h! < 0).length;
  const source = "https://econoflux.com/market-data/" + id + ".json";
  return (["en", "es"] as const).map((lang) => {
    const en = lang === "en",
      title = en
        ? `BTC, ETH and SOL market report: ${day}, edition ${edition}`
        : `Informe de mercado de BTC, ETH y SOL: ${day}, edición ${edition}`;
    const summary = en
      ? `${best.symbol} records the strongest daily percentage performance among the three tracked assets in this edition. Prices, rolling daily changes and the comparison with ${worst.symbol} use the provider snapshot at ${stamp}. This is a time-stamped report, not a live trading quote.`
      : `${best.symbol} registra el mejor comportamiento porcentual diario de los tres activos seguidos en esta edición. Los precios, las variaciones diarias móviles y la comparación con ${worst.symbol} proceden de la captura del proveedor de las ${stamp}. Es un informe fechado, no una cotización de negociación en vivo.`;
    const sections: PreparedArticle["sections"] = [
      {
        id: "overview",
        title: en ? "The market snapshot" : "La captura del mercado",
        text: [
          en
            ? `Of the three assets covered here, ${up} show a positive daily change and ${down} show a negative change; any remaining asset is unchanged. The scope is limited to Bitcoin, Ethereum and Solana. This sample does not establish the direction of all crypto assets, and the results should not be treated as a market-wide index.`
            : `De los tres activos incluidos, ${up} presentan una variación diaria positiva y ${down} una negativa; cualquier activo restante no registra cambios. La cobertura se limita a Bitcoin, Ethereum y Solana. Esta muestra no establece la dirección de todos los criptoactivos y no debe interpretarse como un índice de todo el mercado.`,
        ],
        table: {
          headings: en
            ? [
                "Asset",
                "Price (USD)",
                "Rolling daily change",
                "Provider timestamp (UTC)",
              ]
            : [
                "Activo",
                "Precio (USD)",
                "Variación diaria móvil",
                "Hora del proveedor (UTC)",
              ],
          rows: quotes.map((q) => [
            q.symbol,
            num(q.price),
            pct(q.change24h!),
            q.updatedAt,
          ]),
        },
      },
    ];
    for (const q of quotes) {
      const prior = previous?.find((p) => p.symbol === q.symbol);
      const direction = en
        ? q.change24h! > 0
          ? "a gain"
          : q.change24h! < 0
            ? "a decline"
            : "no change"
        : q.change24h! > 0
          ? "una subida"
          : q.change24h! < 0
            ? "una bajada"
            : "sin cambios";
      const text = [
        en
          ? `${names[q.symbol]} (${q.symbol}) is quoted at USD ${num(q.price)}, with a daily change of ${pct(q.change24h!)} over the provider’s comparison window (${direction}). The daily percentage describes movement relative to that window’s reference price; it is not a forecast, a guarantee of an executable price, or a return an individual reader has earned.`
          : `${names[q.symbol]} (${q.symbol}) cotiza a USD ${num(q.price)}, con una variación diaria de ${pct(q.change24h!)} en la ventana de comparación del proveedor (${direction}). El porcentaje describe el movimiento respecto al precio de referencia de esa ventana; no es una previsión, una garantía de precio ejecutable ni la rentabilidad obtenida por un lector.`,
      ];
      if (prior) {
        const delta = (q.price / prior.price - 1) * 100;
        text.push(
          en
            ? `Compared with EconoFlux’s preceding market edition, which recorded USD ${num(prior.price)}, the price in this snapshot changes by ${pct(delta)}. This separate calculation compares the two archived snapshots; it is not the provider’s daily percentage.`
            : `Frente a la edición de mercado anterior de EconoFlux, que recogía USD ${num(prior.price)}, el precio de esta captura varía un ${pct(delta)}. Este cálculo separado compara las dos capturas archivadas; no equivale al porcentaje diario del proveedor.`,
        );
      }
      sections.push({
        id: q.symbol.toLowerCase(),
        title: names[q.symbol] + " (" + q.symbol + ")",
        text,
      });
    }
    sections.push({
      id: "relative-performance",
      title: en
        ? "Relative performance within the sample"
        : "Comportamiento relativo dentro de la muestra",
      text: [
        en
          ? `${best.symbol} has the highest daily percentage reading and ${worst.symbol} the lowest. The gap between those readings is ${spread} percentage points. This ranking compares percentages, not asset price levels, trading volume, market capitalization or investment quality. A higher quoted unit price does not by itself imply a larger network or better performance.`
          : `${best.symbol} presenta la mayor variación porcentual diaria y ${worst.symbol} la menor. La distancia entre ambas lecturas es de ${spread} puntos porcentuales. Esta clasificación compara porcentajes, no precios unitarios, volumen negociado, capitalización ni calidad de una inversión. Una unidad más cara no implica por sí sola una red mayor o un mejor comportamiento.`,
      ],
    });
    if (related.length)
      sections.push({
        id: "coverage",
        title: en
          ? "Related reporting to follow"
          : "Información relacionada para seguir",
        text: [
          en
            ? "The source links below include relevant reporting already published by EconoFlux. They provide separate context; their proximity to this snapshot does not demonstrate that those events caused the observed price moves."
            : "Los enlaces de fuentes incluyen información pertinente ya publicada por EconoFlux. Aportan contexto independiente: su proximidad a esta captura no demuestra que esos acontecimientos hayan causado los movimientos de precio observados.",
        ],
      });
    sections.push({
      id: "methodology",
      title: en ? "Source, timing and limits" : "Fuente, horario y límites",
      text: [
        en
          ? `This edition preserves the CryptoNews API price snapshot at ${stamp}. The image is an original visualization of these daily percentage changes, not a historical price chart or a photograph. Quotes may have up to 15 minutes of provider delay and can change after publication. Later editions use new snapshots; this report keeps its original figures and timestamp.`
          : `Esta edición conserva la captura de cotizaciones de CryptoNews API de las ${stamp}. La imagen es una visualización original de estas variaciones diarias, no un gráfico histórico de precios ni una fotografía. Las cotizaciones pueden tener hasta 15 minutos de retraso del proveedor y cambiar después de publicar. Las siguientes ediciones emplean capturas nuevas; este informe mantiene sus cifras y horario originales.`,
        en
          ? "Price data alone do not establish a cause for a move. This edition does not infer ETF flows, liquidations, trading volume, institutional activity or macroeconomic causes from the quotes. Such claims require separate identifiable evidence. This is general market information and does not offer personalized investment advice."
          : "Los precios por sí solos no establecen la causa de un movimiento. Esta edición no deduce flujos de ETF, liquidaciones, volumen, actividad institucional ni causas macroeconómicas a partir de las cotizaciones. Esas afirmaciones requieren pruebas identificables independientes. Es información general de mercado y no ofrece asesoramiento de inversión personalizado.",
      ],
    });
    const sources = [
      {
        label: en
          ? "CryptoNews API — archived price snapshot"
          : "CryptoNews API — captura de cotizaciones archivada",
        url: source,
      },
      { label: "CryptoNews API", url: "https://cryptonews-api.com/" },
      ...related
        .filter((r) => r.lang === lang)
        .map((r) => ({
          label: r.title,
          url: `https://econoflux.com/${lang}/articles/${r.slug}/`,
        })),
    ];
    // Keep sources identical in both languages; the other-language article is
    // labelled explicitly and remains a verified existing URL.
    for (const r of related.filter((r) => r.lang !== lang))
      sources.push({
        label:
          (en
            ? "Related report (Spanish): "
            : "Reporte relacionado (inglés): ") + r.title,
        url: `https://econoflux.com/${r.lang}/articles/${r.slug}/`,
      });
    return {
      id: id + "-" + lang,
      translationId: id,
      lang,
      slug:
        (en ? "crypto-market-report-" : "informe-mercado-cripto-") +
        day +
        "-" +
        edition,
      title,
      summary,
      seoTitle: en
        ? `Crypto market report: BTC, ETH, SOL | ${day} #${edition}`
        : `Mercado cripto: BTC, ETH y SOL | ${day} #${edition}`,
      seoDescription: en
        ? `Bitcoin, Ethereum and Solana prices, daily percentage changes and relative performance. Market edition ${edition} for ${day}, with archived source data.`
        : `Precios de Bitcoin, Ethereum y Solana, variación diaria y comparación relativa. Edición ${edition} del ${day}, con datos de origen archivados.`,
      category: "markets",
      tags: ["markets", "bitcoin", "ethereum", "solana"],
      format: "news",
      image: {
        src: `/images/markets/${id}.png`,
        socialSrc: `/images/markets/${id}.png`,
        width: 1200,
        height: 630,
        socialWidth: 1200,
        socialHeight: 630,
        alt: en
          ? `Daily percentage changes for BTC, ETH and SOL at ${stamp}`
          : `Variaciones diarias de BTC, ETH y SOL a las ${stamp}`,
        credit: en
          ? "EconoFlux · Original chart from CryptoNews API data"
          : "EconoFlux · Gráfico original con datos de CryptoNews API",
        creator: "EconoFlux",
        license: "Original EconoFlux data visualization",
      },
      sources,
      publishedAt: now.toISOString(),
      status: "published",
      demo: false,
      editorialRevision: 1,
      author: editorialByline(lang),
      confirmation: {
        status: "confirmed",
        resolution: "confirmed",
        checkedAt: now.toISOString(),
        explanation: en
          ? "Reported provider prices and calculations checked against the archived snapshot. This is not independent corroboration of the provider."
          : "Cotizaciones del proveedor y cálculos contrastados con la captura archivada. No constituye corroboración independiente del proveedor.",
        confirmedFacts: quotes.map(
          (q) => q.symbol + ": USD " + num(q.price) + "; " + pct(q.change24h!),
        ),
        unconfirmedClaims: [],
        originalReport: { label: "CryptoNews API — snapshot", url: source },
      },
      sections,
    };
  });
}
export async function marketEditorialTick(env: Env, now = new Date()) {
  const store = new Store(env.DB),
    owner = crypto.randomUUID();
  if (!(await store.lock("market-editorial", owner, now, 5)))
    return { status: "busy" };
  try {
    const control = await env.DB.prepare(
      "SELECT * FROM market_editorial_control WHERE id=1",
    ).first<any>();
    if (!control?.enabled || control.paused || !control.activation_at)
      return { status: "disabled" };
    const global = await env.DB.prepare(
      "SELECT enabled,paused FROM automation_control WHERE id=1",
    ).first<any>();
    if (!global?.enabled || global.paused) return { status: "paused" };
    await env.DB.prepare(
      "UPDATE market_editorial_control SET last_tick=? WHERE id=1",
    )
      .bind(now.toISOString())
      .run();
    const day = dayKey(now),
      slots = marketSlots(now, control.activation_at);
    await env.DB.prepare(
      "UPDATE market_editions SET state='expired',reason='Past local publication day; no catch-up burst' WHERE state='pending' AND day<?",
    )
      .bind(day)
      .run();
    const count = await env.DB.prepare(
      "SELECT count(*) n FROM market_editions WHERE day=?",
    )
      .bind(day)
      .first<{ n: number }>();
    if ((count?.n || 0) < 3)
      for (const [i, due] of slots.entries())
        await env.DB.prepare(
          "INSERT INTO market_editions(id,day,edition,due_at) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
        )
          .bind("market-" + day + "-" + (i + 1), day, i + 1, due)
          .run();
    const job = control.analysis_required
      ? await env.DB.prepare(
          "SELECT e.* FROM market_editions e LEFT JOIN market_context_jobs c ON c.id=e.id WHERE e.day=? AND e.state='pending' AND e.due_at<=? AND coalesce(c.phase,'')<>'held' AND coalesce(c.next_attempt,'')<=? ORDER BY e.edition LIMIT 1",
        )
          .bind(
            day,
            new Date(+now + 15 * 60000).toISOString(),
            now.toISOString(),
          )
          .first<any>()
      : await env.DB.prepare(
          "SELECT * FROM market_editions WHERE day=? AND state='pending' AND due_at<=? ORDER BY edition LIMIT 1",
        )
          .bind(day, now.toISOString())
          .first<any>();
    const revision =
      control.analysis_required && control.upgrade_existing
        ? await env.DB.prepare(
            "SELECT e.* FROM market_editions e JOIN public_articles p ON p.translation_id=e.id AND p.lang='en' LEFT JOIN market_context_jobs c ON c.id=e.id WHERE e.published_at>=? AND e.state='published' AND json_extract(p.value,'$.marketAnalysis.contextHash') IS NULL AND coalesce(c.phase,'')<>'held' AND coalesce(c.next_attempt,'')<=? ORDER BY e.published_at DESC LIMIT 1",
          )
            .bind(
              new Date(+now - 48 * 3600000).toISOString(),
              now.toISOString(),
            )
            .first<any>()
        : null;
    if (!job && !revision) return { status: "waiting" };
    const previous = await env.DB.prepare(
      "SELECT * FROM market_editions WHERE state='published' ORDER BY published_at DESC LIMIT 1",
    ).first<any>();
    if (
      !revision &&
      previous &&
      +now - Date.parse(previous.published_at) < 90 * 60000
    )
      return { status: "spacing" };
    const cached = await env.DB.prepare(
      "SELECT value,updated_at,last_error FROM market_cache WHERE id=1",
    ).first<any>();
    if (cached?.last_error || !cached?.value)
      throw new Error("Fresh complete prices required");
    const quotes = validMarketQuotes(JSON.parse(cached.value), now),
      signature = await hash(
        JSON.stringify(
          quotes.map(({ symbol, price, change24h }) => ({
            symbol,
            price: price.toFixed(2),
            change24h: change24h?.toFixed(2),
          })),
        ),
      );
    const target = revision || job;
    const contextQuotes = revision
      ? JSON.parse(revision.snapshot).quotes
      : quotes;
    const context = control.analysis_required
      ? await marketContextTick(
          env,
          store,
          target.id,
          contextQuotes,
          now,
          revision?.published_at || now.toISOString(),
        )
      : null;
    if (control.analysis_required && !context)
      return { status: "analysis_pending" };
    if (revision && context) {
      const existing = (
        await env.DB.prepare(
          "SELECT value FROM public_articles WHERE translation_id=? ORDER BY lang",
        )
          .bind(revision.id)
          .all<{ value: string }>()
      ).results.map((r) => JSON.parse(r.value) as PreparedArticle);
      const enhanced = enrichMarketPair(existing, context, now.toISOString());
      const [en, es] = enhanced;
      const changed = await env.DB.prepare(
        "WITH pair_ready AS MATERIALIZED (SELECT count(*) n FROM public_articles WHERE translation_id=? AND revision=? AND lang IN ('en','es')) UPDATE public_articles SET value=CASE lang WHEN 'en' THEN ? ELSE ? END,revision=?,updated_at=? WHERE translation_id=? AND lang IN ('en','es') AND (SELECT n FROM pair_ready)=2 AND EXISTS(SELECT 1 FROM automation_control WHERE enabled=1 AND paused=0) AND EXISTS(SELECT 1 FROM market_editorial_control WHERE enabled=1 AND paused=0 AND analysis_required=1)",
      )
        .bind(
          revision.id,
          en.editorialRevision - 1,
          JSON.stringify(en),
          JSON.stringify(es),
          en.editorialRevision,
          now.toISOString(),
          revision.id,
        )
        .run();
      if (changed.meta.changes !== 2) return { status: "analysis_deferred" };
      await store.history(
        "market-worker",
        "analysis_updated",
        JSON.stringify({ id: revision.id, context: context.hash }),
      );
      return { status: "analysis_updated", id: revision.id };
    }
    if (job.due_at > now.toISOString()) return { status: "waiting" };
    if (previous?.snapshot_hash === signature) return { status: "unchanged" };
    const relatedRows = await env.DB.prepare(
      "SELECT value FROM public_articles WHERE visible=1 AND lang='en' AND published_at>? AND json_extract(value,'$.category')<>'markets' AND coalesce(json_extract(value,'$.confirmation.status'),'confirmed')='confirmed' AND (lower(json_extract(value,'$.title')) LIKE '%market%' OR lower(json_extract(value,'$.title')) LIKE '%etf%' OR lower(json_extract(value,'$.title')) LIKE '%price%' OR lower(json_extract(value,'$.title')) LIKE '%rate%') ORDER BY published_at DESC LIMIT 2",
    )
      .bind(new Date(+now - 86400000).toISOString())
      .all<{ value: string }>();
    const related: { lang: string; slug: string; title: string }[] = [];
    for (const row of relatedRows.results) {
      const a = JSON.parse(row.value);
      const pair = await env.DB.prepare(
        "SELECT lang,slug,json_extract(value,'$.title') title FROM public_articles WHERE translation_id=? AND visible=1",
      )
        .bind(a.translationId)
        .all<any>();
      related.push(...pair.results);
    }
    let pair = marketPair(
      job.id,
      day,
      job.edition,
      quotes,
      now,
      previous ? JSON.parse(previous.snapshot).quotes : null,
      related,
    );
    if (context) pair = enrichMarketPair(pair, context);
    validatePair(pair[0], pair[1], { numericReviewed: !!context });
    validatePublished(pair);
    const artwork = await marketArtwork(
      quotes,
      quotes.map((q) => q.updatedAt).sort()[0],
    );
    const snapshot = JSON.stringify({
      provider: "CryptoNews API",
      capturedAt: now.toISOString(),
      providerCacheUpdatedAt: cached.updated_at,
      quotes,
      previousEdition: previous?.id || null,
      methodology:
        "Daily percentages reported by provider. Inter-edition changes computed from archived prices. No causal claims.",
    });
    const guard =
      "EXISTS(SELECT 1 FROM market_editorial_control WHERE enabled=1 AND paused=0) AND EXISTS(SELECT 1 FROM automation_control WHERE enabled=1 AND paused=0) AND EXISTS(SELECT 1 FROM market_editions WHERE id=? AND state='pending') AND (SELECT count(*) FROM market_editions WHERE day=? AND state='published')<3";
    const writes = pair.map((a) =>
      env.DB.prepare(
        `INSERT INTO public_articles(translation_id,lang,slug,revision,value,visible,published_at) SELECT ?,?,?,1,?,1,? WHERE ${guard} ON CONFLICT DO NOTHING`,
      ).bind(
        job.id,
        a.lang,
        a.slug,
        JSON.stringify(a),
        now.toISOString(),
        job.id,
        day,
      ),
    );
    await env.DB.batch([
      ...writes,
      env.DB.prepare(
        "INSERT INTO market_edition_assets(id,svg,png,created_at) SELECT ?,?,?,? WHERE (SELECT count(*) FROM public_articles WHERE translation_id=? AND visible=1)=2 ON CONFLICT DO NOTHING",
      ).bind(job.id, artwork.svg, artwork.png, now.toISOString(), job.id),
      env.DB.prepare(
        "INSERT INTO editorial_assets(id,event_id,kind,public_path,license,creator,credit_en,credit_es,alt_en,alt_es,width,height,mime,ready,created_at,social_path) SELECT ?,?,'data-chart',?,'Original EconoFlux data visualization','EconoFlux',?,?,?,?,1200,630,'image/png',1,?,? WHERE (SELECT count(*) FROM public_articles WHERE translation_id=? AND visible=1)=2 ON CONFLICT DO NOTHING",
      ).bind(
        job.id,
        job.id,
        pair[0].image.src,
        pair[0].image.credit,
        pair[1].image.credit,
        pair[0].image.alt,
        pair[1].image.alt,
        now.toISOString(),
        pair[0].image.src,
        job.id,
      ),
      env.DB.prepare(
        "UPDATE market_editions SET state='published',snapshot=?,snapshot_hash=?,published_at=? WHERE id=? AND (SELECT count(*) FROM public_articles WHERE translation_id=? AND visible=1)=2",
      ).bind(snapshot, signature, now.toISOString(), job.id, job.id),
    ]);
    const done = await env.DB.prepare(
      "SELECT state FROM market_editions WHERE id=?",
    )
      .bind(job.id)
      .first<{ state: string }>();
    if (done?.state !== "published") return { status: "paused" };
    await env.DB.prepare(
      "UPDATE market_editorial_control SET last_tick=?,last_error=NULL WHERE id=1",
    )
      .bind(now.toISOString())
      .run();
    await store.history(
      "market-worker",
      "published",
      JSON.stringify({
        id: job.id,
        day,
        edition: job.edition,
        sourceTime: quotes[0].updatedAt,
        aiCalls: 0,
        additionalProviderCalls: 0,
      }),
    );
    return { status: "published", id: job.id };
  } catch (error) {
    const reason =
      error instanceof Error &&
      /^(Fresh complete|Incomplete price)/.test(error.message)
        ? error.message
        : "Market edition deferred; inspect verified snapshot and retry later";
    await env.DB.prepare(
      "UPDATE market_editorial_control SET last_tick=?,last_error=? WHERE id=1",
    )
      .bind(now.toISOString(), reason)
      .run();
    return { status: "deferred", reason };
  } finally {
    await store.unlock("market-editorial", owner);
  }
}
