import { Store } from "./store";
import { consultSource } from "./providers";
import { hash } from "./policy";
import type { Env, Settings, Source } from "./types";
export const sourceDigest = (
  sources: { url: string; excerpt: string | null }[],
) =>
  hash(
    JSON.stringify(
      sources
        .map((s) => [s.url, s.excerpt])
        .sort((a, b) => (a[0] || "").localeCompare(b[0] || "")),
    ),
  );
/** Original-report edits are checked without an extra Crypto News API call. */
export async function checkReportFollowup(
  env: Env,
  store: Store,
  s: Settings,
  now: Date,
) {
  if (s.reportingPolicy !== 2) return false;
  const item = await store.db
    .prepare(
      "SELECT * FROM report_followups WHERE next_check<=? ORDER BY next_check LIMIT 1",
    )
    .bind(now.toISOString())
    .first<any>();
  if (!item) return false;
  if (item.pending_event_id) {
    const pending = await store.event(item.pending_event_id);
    if (
      pending &&
      ![
        "published",
        "no_change",
        "needs_verification",
        "needs_sources",
        "error",
        "rejected",
      ].includes(pending.state)
    )
      return false;
    await store.db
      .prepare(
        "UPDATE report_followups SET pending_event_id=NULL,next_check=? WHERE translation_id=?",
      )
      .bind(new Date(+now + 6 * 3600000).toISOString(), item.translation_id)
      .run();
    return true;
  }
  const parent = await store.event(item.translation_id);
  if (!parent?.published_at) return false;
  const old = (await store.sources(item.source_event_id || parent.id))
      .filter((x) => x.accessible)
      .slice(0, 3),
    fresh: Source[] = [];
  for (const source of old) {
    const result = await consultSource(source.url, s);
    if (!result.accessible) {
      await store.db
        .prepare(
          "UPDATE report_followups SET last_checked_at=?,next_check=?,last_error=? WHERE translation_id=?",
        )
        .bind(
          now.toISOString(),
          new Date(+now + 6 * 3600000).toISOString(),
          "Reporte temporalmente inaccesible; conservar estado y fechas",
          parent.id,
        )
        .run();
      return true;
    }
    fresh.push({
      ...source,
      ...result,
      origin_links: JSON.stringify(result.reportingLinks || []),
      fetched_at: now.toISOString(),
    });
  }
  if (!fresh.length) return false;
  const signature = await sourceDigest(fresh);
  if (signature === item.signature) {
    await store.db
      .prepare(
        "UPDATE report_followups SET last_checked_at=?,next_check=?,last_error=NULL WHERE translation_id=?",
      )
      .bind(
        now.toISOString(),
        new Date(+now + 6 * 3600000).toISOString(),
        parent.id,
      )
      .run();
    return true;
  }
  const id = (await hash(parent.id + signature)).slice(0, 24);
  const current = await store.db
    .prepare(
      "SELECT max(revision) revision FROM public_articles WHERE translation_id=?",
    )
    .bind(parent.id)
    .first<{ revision: number }>();
  // The fragment is an internal job identity. Public citations use the unchanged
  // real report URLs, and publication keeps the parent's article URLs.
  const url =
    parent.url.split("#")[0] + "#econoflux-followup-" + signature.slice(0, 16);
  await store.db.batch([
    store.db
      .prepare(
        "INSERT INTO events(id,provider_id,fingerprint,title,url,detected_at,event_at,state,selection_reason,related_id,revision,published_at) VALUES(?,?,?,?,?,?,?,'detected','Revisar cambio del reporte original; publicar solo si es sustancial',?,?,?) ON CONFLICT DO NOTHING",
      )
      .bind(
        id,
        "followup-" + id,
        await hash("followup-" + id),
        parent.title,
        url,
        now.toISOString(),
        parent.event_at || parent.detected_at,
        parent.id,
        (current?.revision || parent.revision) + 1,
        parent.published_at,
      ),
    ...fresh.map((source) =>
      store.db
        .prepare(
          "INSERT INTO sources(id,event_id,url,publisher,published_at,fetched_at,accessible,primary_source,independence_group,excerpt,origin_links) VALUES(?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(
          source.id + "-" + id,
          id,
          source.url,
          source.publisher,
          source.published_at,
          now.toISOString(),
          source.primary_source,
          source.independence_group,
          source.excerpt,
          source.origin_links,
        ),
    ),
    store.db
      .prepare(
        "UPDATE report_followups SET signature=?,last_checked_at=?,next_check=?,pending_event_id=?,last_error=NULL WHERE translation_id=?",
      )
      .bind(
        signature,
        now.toISOString(),
        new Date(+now + 6 * 3600000).toISOString(),
        id,
        parent.id,
      ),
  ]);
  return true;
}
