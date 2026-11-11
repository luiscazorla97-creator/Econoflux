import { modelJSON, consultSource } from "./providers";
import { hash, validatePair, dayKey, TIME_ZONE } from "./policy";
import { validatePublished } from "../../src/lib/published";
import type { Store } from "./store";
import type { Env, PreparedArticle } from "./types";
import type { Quote } from "./market";
type Evidence = {
  id: string;
  url: string;
  label: string;
  text: string;
  checkedAt: string;
};
type Section = { id: string; title: string; text: string[] };
export type MarketContext = {
  id: string;
  checkedAt: string;
  hash: string;
  sources: Evidence[];
  en: { lead: string; sections: Section[] };
  es: { lead: string; sections: Section[] };
};
const strings = { type: "array", items: { type: "string" } };
const obj = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const language = obj({
  lead: { type: "string" },
  sections: {
    type: "array",
    minItems: 3,
    maxItems: 6,
    items: obj({
      id: { type: "string" },
      title: { type: "string" },
      text: strings,
    }),
  },
});
const draftSchema = obj({
  en: language,
  es: language,
  evidence: {
    type: "array",
    minItems: 1,
    items: obj({ sourceId: { type: "string" }, quote: { type: "string" } }),
  },
});
const reviewSchema = obj({ approved: { type: "boolean" }, issues: strings });
const orientation = (quotes: Quote[]) =>
  quotes.map((q) => [q.symbol, Math.sign(q.change24h!)]);
export function marketDescription(
  a: Pick<PreparedArticle, "lang" | "slug" | "publishedAt">,
) {
  const day =
    a.slug.match(/\d{4}-\d{2}-\d{2}/)?.[0] || a.publishedAt.slice(0, 10);
  const edition = a.slug.match(/-(\d+)$/)?.[1] || "1";
  return a.lang === "en"
    ? `BTC, ETH and SOL on ${day}, edition ${edition}: archived USD prices, daily changes and source-based market context. Dated data, not live quotes.`
    : `BTC, ETH y SOL del ${day}, edición ${edition}: precios en USD archivados, variaciones diarias y contexto con fuentes. No son cotizaciones en vivo.`;
}
export function checkContextDraft(draft: any, sources: Evidence[]) {
  for (const lang of ["en", "es"])
    if (
      typeof draft?.[lang]?.lead !== "string" ||
      !draft[lang].lead.trim() ||
      !draft?.[lang]?.sections ||
      draft[lang].sections.length < 3 ||
      draft[lang].sections.some(
        (s: any) =>
          !s.title ||
          !Array.isArray(s.text) ||
          !s.text.length ||
          s.text.some((p: any) => typeof p !== "string" || !p.trim()),
      )
    )
      throw Error("Incomplete bilingual market explanation");
  if (
    !Array.isArray(draft.evidence) ||
    !draft.evidence.length ||
    draft.evidence.some(
      (e: any) =>
        typeof e.quote !== "string" ||
        e.quote.length < 20 ||
        !sources.find((s) => s.id === e.sourceId)?.text.includes(e.quote),
    )
  )
    throw Error("Market explanation has unsupported source evidence");
  if (
    JSON.stringify(draft.en.sections.map((s: any) => s.id)) !==
    JSON.stringify(draft.es.sections.map((s: any) => s.id))
  )
    throw Error("Market explanation sections differ between languages");
}
export function enrichMarketPair(
  pair: PreparedArticle[],
  context: MarketContext,
  updatedAt?: string,
) {
  const result = pair.map((a) => ({
    ...a,
    summary: context[a.lang].lead,
    format: "analysis" as const,
    seoTitle:
      a.lang === "en"
        ? `Crypto market drivers | ${a.slug.match(/\d{4}-\d{2}-\d{2}/)?.[0]} #${a.slug.slice(-1)}`
        : `Claves de BTC, ETH y SOL | ${a.slug.match(/\d{4}-\d{2}-\d{2}/)?.[0]} #${a.slug.slice(-1)}`,
    seoDescription: marketDescription(a),
    ...(updatedAt
      ? { updatedAt, editorialRevision: a.editorialRevision + 1 }
      : {}),
    marketAnalysis: { checkedAt: context.checkedAt, contextHash: context.hash },
    sections: [
      a.sections[0],
      ...context[a.lang].sections.map((s) => ({ ...s, id: "why-" + s.id })),
      ...a.sections.slice(1).filter((s) => !s.id.startsWith("why-")),
    ],
    sources: [
      ...a.sources,
      ...context.sources
        .filter((s) => !a.sources.some((old) => old.url === s.url))
        .map((s) => ({ label: s.label, url: s.url })),
    ],
    confirmation: a.confirmation
      ? {
          ...a.confirmation,
          checkedAt: context.checkedAt,
          explanation:
            a.lang === "en"
              ? "Provider price data checked against the archived snapshot. Context and possible drivers are attributed to the linked reporting; timing or correlation alone does not prove causation."
              : "Cotizaciones contrastadas con la captura archivada. El contexto y los posibles catalizadores se atribuyen a los reportes enlazados; la coincidencia temporal no demuestra causalidad.",
        }
      : a.confirmation,
  }));
  // Numerical equivalence and every causal statement receive an independent AI
  // audit before this function is used. Prices themselves remain code-generated.
  validatePair(result[0], result[1], { numericReviewed: true });
  validatePublished(result);
  return result;
}
export async function marketContextTick(
  env: Env,
  store: Store,
  id: string,
  quotes: Quote[],
  now: Date,
  reportTime = now.toISOString(),
): Promise<MarketContext | null> {
  await store.db
    .prepare(
      "INSERT INTO market_context_jobs(id,updated_at) VALUES(?,?) ON CONFLICT DO NOTHING",
    )
    .bind(id, now.toISOString())
    .run();
  const job = await store.db
    .prepare("SELECT * FROM market_context_jobs WHERE id=?")
    .bind(id)
    .first<any>();
  if (job.next_attempt > now.toISOString()) return null;
  let payload = JSON.parse(job.payload),
    phase = job.phase;
  payload.reportTime ||= reportTime;
  const settings = (await store.settings()).value;
  const save = async (next: string) => {
    await store.db
      .prepare(
        "UPDATE market_context_jobs SET phase=?,payload=?,updated_at=?,last_error=NULL WHERE id=?",
      )
      .bind(next, JSON.stringify(payload), now.toISOString(), id)
      .run();
  };
  try {
    if (phase === "ready") {
      if (
        payload.auditPassed !== true ||
        payload.hash !==
          (await hash(JSON.stringify([payload.sources, payload.draft])))
      ) {
        await save("audit");
        return null;
      }
      if (
        +now - Date.parse(payload.checkedAt) > 2 * 3600000 ||
        JSON.stringify(payload.orientation) !==
          JSON.stringify(orientation(quotes))
      ) {
        payload = {};
        await save("sources");
        return null;
      }
      return {
        id,
        checkedAt: payload.checkedAt,
        hash: payload.hash,
        sources: payload.sources,
        en: payload.draft.en,
        es: payload.draft.es,
      };
    }
    if (
      ["draft", "audit"].includes(phase) &&
      (!payload.checkedAt || +now - Date.parse(payload.checkedAt) > 2 * 3600000)
    ) {
      payload = {};
      await save("sources");
      return null;
    }
    if (phase === "sources") {
      if (!payload.candidates) {
        const rows = await store.db
          .prepare(
            "SELECT s.url,s.publisher,s.excerpt,e.title,e.event_at FROM sources s JOIN events e ON e.id=s.event_id WHERE s.url=e.url AND s.accessible=1 AND length(s.excerpt)>1000 AND e.event_at>? AND e.event_at<=? AND lower(e.title) NOT LIKE '%explained%' AND lower(e.title) NOT LIKE '%guide%' AND lower(e.title) NOT LIKE '%arbitrage%' AND lower(e.title) NOT LIKE '%how to%' AND lower(e.title) NOT LIKE '%marketing%' AND (lower(e.title) LIKE '%rally%' OR lower(e.title) LIKE '%surge%' OR lower(e.title) LIKE '%etf%' OR lower(e.title) LIKE '%inflation%' OR lower(e.title) LIKE '%federal reserve%' OR lower(e.title) LIKE '%selloff%' OR lower(e.title) LIKE '%sell-off%' OR lower(e.title) LIKE '%market crash%' OR lower(e.title) LIKE '%outflow%' OR lower(e.title) LIKE '%payroll%') ORDER BY e.event_at DESC LIMIT 18",
          )
          .bind(
            new Date(
              Date.parse(payload.reportTime) - 36 * 3600000,
            ).toISOString(),
            payload.reportTime,
          )
          .all<any>();
        const groups = new Set<string>();
        payload.candidates = rows.results
          .filter((r) => {
            const host = new URL(r.url).hostname.replace(/^www\./, "");
            if (groups.has(host)) return false;
            groups.add(host);
            return true;
          })
          .slice(0, 5)
          .map((r) => ({
            url: r.url,
            label: r.publisher || new URL(r.url).hostname,
            eventAt: r.event_at,
          }));
        payload.sources = [];
        payload.cursor = 0;
      }
      const candidate = payload.candidates[payload.cursor++];
      if (candidate) {
        const consulted = await consultSource(candidate.url, settings);
        if (
          consulted.accessible &&
          consulted.excerpt &&
          consulted.excerpt.length > 1000
        )
          payload.sources.push({
            id: "source-" + payload.cursor,
            url: candidate.url,
            label: candidate.label,
            text: consulted.excerpt.slice(0, 6500),
            checkedAt: now.toISOString(),
          });
      }
      if (
        payload.sources.length >= 3 ||
        payload.cursor >= payload.candidates.length
      ) {
        if (!payload.sources.length)
          throw Error("No accessible market-driver reporting");
        payload.checkedAt = now.toISOString();
        payload.orientation = orientation(quotes);
        await save("draft");
      } else await save("sources");
      return null;
    }
    if (phase === "draft") {
      const data = await modelJSON(
        env,
        store,
        settings,
        `Write a thorough, original market-context explanation in BOTH English and Spanish using ONLY the consulted reporting. Return the required JSON. Provide a concise 35–55 word lead and aim for 400–650 words in each language, in 3–6 useful sections. Explain the reported catalysts for the market move, the timeline, economic or policy mechanisms described by the sources, ETF/institutional evidence if actually supplied, and competing explanations. Distinguish FACT, ATTRIBUTED ANALYST INTERPRETATION and UNKNOWN. Attribute interpretations to the named analyst/outlet; correlation is not proof of causation and no source proves an exhaustive or unique cause. If evidence cannot explain a move or the difference between ETH/SOL/BTC, say so explicitly. NEVER invent rate changes, releases, ETF flows, liquidation/volume data, quotes, transactions, election results or causal links. Do not infer institutional buying from prices alone. Distinguish each source's actual publication/action date from today's report and from the rolling daily quote window. Earlier-session ETF flows are not today's final flows. Campaign spending is not spot crypto investment. An article with reported political results is reporting, not certified returns. Exclude unsupported harmful allegations. Current prices/ranks will be inserted by code: do not write current quote values or claim the live direction in these context paragraphs. Historical figures may be used only with explicit source/date attribution. Do not use navigation, ads or quote widgets as story evidence. Explain what data would be needed to substantiate missing causes. No filler, repeated boilerplate, trading recommendations or promised returns. Preserve the same facts, numeric magnitudes, certainty, source attributions, section IDs and chronology in both languages. Each evidence quote must be exact, contiguous, at least 20 characters from a supplied source and identify that sourceId. Evidence quotations are private audit material, not text to paste into articles.`,
        {
          edition: id,
          reportTime: payload.reportTime,
          publicationDay: dayKey(new Date(payload.reportTime)),
          publicationTimeZone: TIME_ZONE,
          direction: payload.orientation,
          sources: payload.sources,
          correction: payload.correction || null,
        },
        4500,
        draftSchema,
      );
      checkContextDraft(data, payload.sources);
      payload.draft = data;
      await save("audit");
      return null;
    }
    if (phase === "audit") {
      checkContextDraft(payload.draft, payload.sources);
      const review = await modelJSON(
        env,
        store,
        settings,
        `Independently audit the English and Spanish market explanation against ONLY these actually consulted sources. Return approved and specific material issues. Check all factual claims, numbers/magnitudes, dates, source attribution, language equivalence and causal confidence. A price rise does not establish why it happened. Claims of ETF inflows, rates, liquidations, volume, institutional buying or policy changes require actual supporting evidence; dated earlier ETF sessions cannot be relabelled as the current session. Campaign-finance spending is not asset purchasing. An analyst interpretation must stay attributed and qualified. Acknowledge genuine unknowns rather than invent causes. Current quote prices and comparisons are inserted separately by deterministic code, not missing claims in this draft. Do not demand an official primary source for a clearly attributed identifiable journalistic report; do not count an article repeating another origin as independent corroboration. No unsupported harmful allegations or investment promises. Ignore site navigation, ads and price widgets. Reject material chronology errors, false certainty or mismatched bilingual facts. Do not reject sound paraphrases, sourced background or clear statements of uncertainty merely for style.`,
        {
          sources: payload.sources,
          draft: payload.draft,
          edition: id,
          reportTime: payload.reportTime,
          publicationDay: dayKey(new Date(payload.reportTime)),
          publicationTimeZone: TIME_ZONE,
        },
        1800,
        reviewSchema,
      );
      if (review.approved !== true) {
        if (job.attempts >= 1) {
          await store.db
            .prepare(
              "UPDATE market_context_jobs SET phase='held',last_error='Market explanation did not pass independent review',updated_at=? WHERE id=?",
            )
            .bind(now.toISOString(), id)
            .run();
          return null;
        }
        payload.correction = review.issues;
        await store.db
          .prepare(
            "UPDATE market_context_jobs SET attempts=attempts+1 WHERE id=?",
          )
          .bind(id)
          .run();
        await save("draft");
        return null;
      }
      payload.auditPassed = true;
      payload.hash = await hash(
        JSON.stringify([payload.sources, payload.draft]),
      );
      await save("ready");
      return null;
    }
    return null;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String(error.code)
        : "context_quality";
    const reason =
      code === "budget"
        ? "Market explanation deferred by shared daily budget"
        : "Market explanation pending verified evidence or review";
    const fatal =
      code === "missing_ai_key" ||
      (code === "ai_http" &&
        error instanceof Error &&
        /401|403|insufficient_quota|invalid_api_key|model_not_found/.test(
          error.message,
        ));
    const failures = job.attempts + (code === "budget" ? 0 : 1);
    await store.db
      .prepare(
        "UPDATE market_context_jobs SET next_attempt=?,last_error=?,updated_at=?,attempts=?,phase=? WHERE id=?",
      )
      .bind(
        new Date(+now + (code === "budget" ? 30 : 60) * 60000).toISOString(),
        reason,
        now.toISOString(),
        failures,
        fatal || failures >= 3 ? "held" : job.phase,
        id,
      )
      .run();
    return null;
  }
}
