/** Server-side integration boundary. Not imported by the reader-facing website. */
import { createHash } from "node:crypto";
export interface SourceItem {
  url: string;
  title: string;
  text: string;
  fetchedAt: string;
}
export interface Draft {
  translationId: string;
  language: "en" | "es";
  title: string;
  summary: string;
  body: string;
  sourceUrls: string[];
  demo: boolean;
  status: "draft" | "published";
}
export interface PublicationStore {
  /** Atomic claim, backed by a UNIQUE key in D1. Return false if claimed or published.
   * Production implementations need expiring leases for crashed workers. */
  claim(key: string): Promise<boolean>;
  /** Commit both translations and their source provenance in one transaction. */
  commit(key: string, drafts: Draft[], sources: SourceItem[]): Promise<void>;
  release(key: string): Promise<void>;
}
export interface Adapters {
  fetchNews(): Promise<SourceItem[]>;
  selectTopics(items: SourceItem[]): Promise<SourceItem[][]>;
  draftBothLanguages(sources: SourceItem[], key: string): Promise<Draft[]>;
  qualityGate(drafts: Draft[], sources: SourceItem[]): Promise<boolean>;
  store: PublicationStore;
}
export function canonicalSource(raw: string): string {
  const u = new URL(raw);
  if (u.protocol !== "https:") throw new Error("Sources must use HTTPS");
  u.hash = "";
  for (const key of [...u.searchParams.keys()])
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
      u.searchParams.delete(key);
  u.searchParams.sort();
  u.pathname = u.pathname.replace(/\/$/, "") || "/";
  return u.href;
}
export function topicKey(sources: SourceItem[]): string {
  return createHash("sha256")
    .update(
      [...new Set(sources.map((s) => canonicalSource(s.url)))]
        .sort()
        .join("\n"),
    )
    .digest("hex");
}
export function validateDrafts(
  drafts: Draft[],
  sources: SourceItem[],
  key: string,
): void {
  if (
    drafts.length !== 2 ||
    new Set(drafts.map((d) => d.language)).size !== 2 ||
    !drafts.some((d) => d.language === "en") ||
    !drafts.some((d) => d.language === "es")
  )
    throw new Error("Both translations are required");
  const allowed = new Set(sources.map((s) => canonicalSource(s.url)));
  for (const d of drafts) {
    if (
      d.demo ||
      d.status !== "draft" ||
      d.translationId !== key ||
      !d.title.trim() ||
      !d.summary.trim() ||
      !d.body.trim()
    )
      throw new Error("Invalid editorial draft");
    if (
      !d.sourceUrls.length ||
      d.sourceUrls.some((u) => !allowed.has(canonicalSource(u)))
    )
      throw new Error("Missing or untraceable sources");
  }
}
export async function runPipeline(adapters: Adapters) {
  const sourceItems = await adapters.fetchNews();
  const unique = [
    ...new Map(sourceItems.map((s) => [canonicalSource(s.url), s])).values(),
  ];
  const topics = await adapters.selectTopics(unique);
  let published = 0;
  let skipped = 0;
  for (const sources of topics) {
    if (!sources.length) continue;
    const key = topicKey(sources);
    if (!(await adapters.store.claim(key))) {
      skipped++;
      continue;
    }
    try {
      const drafts = await adapters.draftBothLanguages(sources, key);
      validateDrafts(drafts, sources, key);
      if (!(await adapters.qualityGate(drafts, sources)))
        throw new Error("Editorial quality gate rejected publication");
      await adapters.store.commit(
        key,
        drafts.map((d) => ({ ...d, status: "published" })),
        sources,
      );
      published++;
    } catch (error) {
      await adapters.store.release(key);
      throw error;
    }
  }
  return { published, skipped };
}
