import type { Source, Verification } from "./types";
export const nextNewsPoll = (now: Date) =>
  new Date((Math.floor(+now / 600000) + 1) * 600000).toISOString();
export const newsPollSlot = (now: Date) =>
  new Date(Math.floor(+now / 600000) * 600000).toISOString();
const host = (url: string) => {
  try {
    return new URL(url).hostname
      .replace(/^www\./, "")
      .replace(/^(?:news|finance|markets|blog)\./, "");
  } catch {
    return "";
  }
};
export function evidenceText(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
export function reportingOrigins(sources: Source[]) {
  const groups = new Map<string, string>();
  for (const s of sources) {
    const text = (s.excerpt || "").toLowerCase();
    let group = s.independence_group || host(s.url);
    // A wire copy or an explicitly attributed original remains a single origin.
    for (const [name, domain] of [
      ["reuters", "reuters.com"],
      ["bloomberg", "bloomberg.com"],
      ["associated press", "apnews.com"],
      ["the associated press", "apnews.com"],
    ]) {
      if (
        new RegExp(
          `(?:according to|reported by|reports? from|report by|source:|originally published by|copyright|©|\(c\)|según|informa|reportado por)[^.!?]{0,70}${name}|^.{0,180}\\b${name}\\b`,
          "i",
        ).test(text)
      ) {
        group = domain;
        break;
      }
    }
    // Near-identical prose cannot establish independent corroboration.
    const tokens = evidenceText(s.excerpt || "").split(" "),
      grams = new Set<string>();
    for (let i = 0; i + 7 < tokens.length; i++)
      grams.add(tokens.slice(i, i + 8).join(" "));
    for (const prior of sources) {
      if (prior.id === s.id) break;
      const words = evidenceText(prior.excerpt || "").split(" ");
      let matches = 0,
        total = 0;
      for (let i = 0; i + 7 < words.length; i++) {
        total++;
        if (grams.has(words.slice(i, i + 8).join(" "))) matches++;
      }
      if (total > 40 && matches / total > 0.55) {
        group = groups.get(prior.id) || group;
        break;
      }
    }
    groups.set(s.id, group);
  }
  return groups;
}
/** Validate attribution and exact evidence, independently of the model's verdict. */
export function sufficientReporting(v: Verification, sources: Source[]) {
  const c = v.confirmation;
  if (!c) return false;
  const available = sources.filter(
    (s) => s.accessible && s.excerpt && s.excerpt.length >= 300,
  );
  const ids = new Set(available.map((s) => s.id));
  if (
    v.primaryUrls.some(
      (u) => !available.some((s) => s.primary_source && s.url === u),
    )
  )
    return false;
  if (
    !v.sufficient ||
    !v.essentialFacts.length ||
    !v.sourceIds.length ||
    v.sourceIds.some((id) => !ids.has(id)) ||
    !v.canonicalEvent ||
    !Number.isFinite(Date.parse(v.eventDate))
  )
    return false;
  if (
    !["confirmed", "rumor", "leak"].includes(c.status) ||
    !["pending", "confirmed", "denied"].includes(c.resolution)
  )
    return false;
  if (
    !available.some(
      (s) => s.url === c.originalReportUrl && v.sourceIds.includes(s.id),
    )
  )
    return false;
  const origins = reportingOrigins(available),
    verifiedGroups = new Set<string>();
  let primary = false,
    onRecord = false;
  if (!c.evidence.length) return false;
  for (const proof of c.evidence) {
    const source = available.find((s) => s.id === proof.sourceId);
    if (
      !source ||
      !v.sourceIds.includes(proof.sourceId) ||
      proof.quote.length < 20 ||
      !evidenceText(source.excerpt || "").includes(evidenceText(proof.quote))
    )
      return false;
    const allowed = new Set([
      source.url,
      ...JSON.parse(source.origin_links || "[]"),
    ]);
    if (!allowed.has(proof.originUrl)) return false;
    let group = origins.get(source.id) || host(source.url);
    if (proof.originUrl !== source.url) group = host(proof.originUrl); // all retellings share that origin
    verifiedGroups.add(group);
    if (source.primary_source && v.primaryUrls.includes(source.url))
      primary = true;
    if (
      proof.onRecord &&
      proof.originalReporting &&
      proof.originUrl === source.url
    )
      onRecord = true;
  }
  const sensitive =
    v.highRisk ||
    /\b(?:fraud|scam|insolven|hack|stolen|theft|criminal|manipulat|acusaci[oó]n|estafa|fraude|robo)\w*/i.test(
      v.essentialFacts
        .join(" ")
        .replace(
          /\b(?:anti[- ]?fraud|fraud[- ](?:prevention|detection|protection)|fraud exceptions)\b/gi,
          "legal safeguard",
        )
        .replace(
          /\binsolvency (?:scenarios|rules|laws|protections|treatment|frameworks)\b/gi,
          "legal framework",
        ),
    );
  if (c.status !== "confirmed") {
    if (
      c.resolution !== "pending" ||
      !c.unconfirmedClaims.length ||
      !c.explanation.trim()
    )
      return false;
    // An unconfirmed accusation that can damage a person/company is withheld.
    if (sensitive) return false;
    return c.basis === "attributed_reporting";
  }
  if (c.resolution === "pending") return false;
  if (sensitive) return primary && verifiedGroups.size >= 2;
  return (
    primary ||
    verifiedGroups.size >= 2 ||
    (c.basis === "on_record_reporting" && onRecord)
  );
}
