import { dayKey, dayEnd, TIME_ZONE } from "./policy";
import type { Store } from "./store";
import type { Event } from "./types";

export async function dailyNewsPlan(store: Store, now: Date) {
  let left = +now - 27 * 3600000,
    right = +now;
  while (right - left > 1) {
    const mid = Math.floor((left + right) / 2);
    if (dayKey(new Date(mid)) === dayKey(now)) right = mid;
    else left = mid;
  }
  const since = new Date(right).toISOString(),
    until = dayEnd(now).toISOString();
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );
  const expected = [7, 11, 15, 19].filter((h) => hour >= h).length;
  const row = (await store.db
    .prepare(
      `SELECT
    (SELECT count(*) FROM public_articles WHERE lang='en' AND visible=1 AND published_at>=? AND published_at<? AND json_extract(value,'$.category')<>'markets' AND coalesce(json_extract(value,'$.confirmation.originStatus'),json_extract(value,'$.confirmation.status'),'confirmed') NOT IN ('rumor','leak')) published,
    (SELECT count(*) FROM cycle_items c JOIN events e ON e.id=c.event_id WHERE c.state='reserved' AND e.related_id IS NULL AND e.published_at IS NULL AND e.state IN ('approved','preparing','qualified','retry','live_pending') AND coalesce(json_extract(e.verification,'$.confirmation.status'),'confirmed') NOT IN ('rumor','leak') AND NOT EXISTS(SELECT 1 FROM public_articles p WHERE p.translation_id=e.id AND p.lang='en' AND p.visible=1)) reserved,
    (SELECT max(published_at) FROM public_articles WHERE lang='en' AND visible=1 AND published_at>=? AND published_at<? AND json_extract(value,'$.category')<>'markets' AND coalesce(json_extract(value,'$.confirmation.originStatus'),json_extract(value,'$.confirmation.status'),'confirmed') NOT IN ('rumor','leak')) last_at`,
    )
    .bind(since, until, since, until)
    .first<{ published: number; reserved: number; last_at: string | null }>())!;
  const used = row.published + row.reserved;
  return {
    ...row,
    used,
    expected,
    available:
      used < expected &&
      used < 4 &&
      (!row.last_at || +now - Date.parse(row.last_at) >= 3 * 3600000),
  };
}

export async function mayPublishDailyNews(
  store: Store,
  event: Event,
  now: Date,
) {
  if (event.related_id || event.published_at) return true;
  const v = event.verification ? JSON.parse(event.verification) : null;
  if (["rumor", "leak"].includes(v?.confirmation?.status)) return true;
  const held = !!(await store.db
    .prepare(
      "SELECT event_id FROM cycle_items WHERE event_id=? AND state='reserved'",
    )
    .bind(event.id)
    .first());
  const plan = await dailyNewsPlan(store, now);
  if (held)
    return (
      plan.published < Math.min(4, plan.expected) &&
      (!plan.last_at || +now - Date.parse(plan.last_at) >= 3 * 3600000) &&
      (plan.published < 3 || (event.importance || 0) >= 85)
    );
  return plan.available && (plan.used < 3 || (event.importance || 0) >= 85);
}
