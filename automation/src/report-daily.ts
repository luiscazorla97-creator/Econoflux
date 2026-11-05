import type { Store } from "./store";
import type { Event } from "./types";
import { dayKey, dayEnd, TIME_ZONE } from "./policy";
const reported =
  "coalesce(json_extract(value,'$.confirmation.originStatus'),json_extract(value,'$.confirmation.status')) IN ('rumor','leak')";
export const REPORT_CANDIDATE_SQL =
  "(json_extract(verification,'$.confirmation.status') IN ('rumor','leak') OR lower(title) LIKE '%rumor%' OR lower(title) LIKE '%leak%')";
export const REPORT_APPROVED_SQL =
  "json_extract(verification,'$.confirmation.status') IN ('rumor','leak')";
export async function reportDailyPlan(store: Store, now = new Date()) {
  let control: { enabled: number; paused: number; daily_target: number } | null;
  try {
    control = await store.db
      .prepare(
        "SELECT enabled,paused,daily_target FROM report_editorial_control WHERE id=1",
      )
      .first<typeof control>();
  } catch {
    return null;
  }
  if (!control?.enabled || control.paused) return null;
  // Find the exact local day boundary, including 23/25-hour DST days.
  let left = +now - 27 * 3600000,
    right = +now;
  const day = dayKey(now);
  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (dayKey(new Date(mid)) === day) right = mid;
    else left = mid;
  }
  const since = new Date(right).toISOString(),
    until = dayEnd(now).toISOString();
  const counts = await reportCounts(store, since, until);
  const { published, reserved } = counts;
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  const expected = Math.min(
    control.daily_target,
    hour >= 18 ? 2 : hour >= 10 ? 1 : 0,
  );
  await store.db
    .prepare(
      "UPDATE report_editorial_control SET last_check=?,published_today=?,reserved=? WHERE id=1",
    )
    .bind(now.toISOString(), published, reserved)
    .run();
  return {
    since,
    until,
    target: control.daily_target,
    published,
    reserved,
    due: published < expected,
  };
}
export function reportQueueFilter(
  plan: Awaited<ReturnType<typeof reportDailyPlan>>,
) {
  if (!plan || plan.published + plan.reserved < plan.target) return "";
  const held =
    plan.published < plan.target
      ? " OR id IN (SELECT event_id FROM cycle_items WHERE state='reserved')"
      : "";
  // Capped reports must not occupy all eight approved positions and starve
  // confirmed news. Existing corrections and image reservations keep moving.
  return `AND (related_id IS NOT NULL OR published_at IS NOT NULL OR coalesce(json_extract(verification,'$.confirmation.status'),'confirmed') NOT IN ('rumor','leak')${held})`;
}
export function reportOrder(due: boolean, approved = false) {
  if (!due) return "importance DESC";
  // Verified urgency/exceptional relevance keeps precedence. A title is only a
  // queue hint, never evidence or permission to label/publish an unverified claim.
  return `CASE WHEN importance>=85 OR urgent=1 THEN 2 WHEN ${approved ? REPORT_APPROVED_SQL : REPORT_CANDIDATE_SQL} THEN 1 ELSE 0 END DESC,importance DESC`;
}
const pendingReports =
  "SELECT count(*) FROM cycle_items c JOIN events e ON e.id=c.event_id WHERE c.state='reserved' AND e.related_id IS NULL AND e.published_at IS NULL AND e.state IN ('approved','preparing','retry','qualified','live_pending') AND e.approved_revision=e.revision AND NOT EXISTS(SELECT 1 FROM public_articles p WHERE p.translation_id=e.id AND p.lang='en' AND p.visible=1) AND json_extract(e.verification,'$.confirmation.status') IN ('rumor','leak')";
async function reportCounts(
  store: Store,
  since: string,
  until: string,
  eventId = "",
) {
  return (await store.db
    .prepare(
      `SELECT (SELECT count(*) FROM public_articles WHERE lang='en' AND visible=1 AND published_at>=? AND published_at<? AND ${reported}) AS published, (${pendingReports}) AS reserved, EXISTS(SELECT 1 FROM cycle_items WHERE event_id=? AND state='reserved') AS held`,
    )
    .bind(since, until, eventId)
    .first<{ published: number; reserved: number; held: number }>())!;
}
export async function mayPublishReport(
  store: Store,
  event: Event,
  now = new Date(),
  knownPlan?: Awaited<ReturnType<typeof reportDailyPlan>>,
) {
  if (event.related_id || event.published_at) return true;
  const v = event.verification ? JSON.parse(event.verification) : null;
  if (!["rumor", "leak"].includes(v?.confirmation?.status)) return true;
  const plan =
    knownPlan === undefined ? await reportDailyPlan(store, now) : knownPlan;
  if (!plan) return true;
  // Re-read actual counts after each publication, without repeating configuration
  // and metrics queries inside the bounded Worker invocation.
  const counts = await reportCounts(store, plan.since, plan.until, event.id);
  if (counts.published >= plan.target) return false;
  return !!counts.held || counts.published + counts.reserved < plan.target;
}
