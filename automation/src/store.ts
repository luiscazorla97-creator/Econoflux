import { dayKey, nextRegular, capacity, validateSettings } from "./policy";
import {
  SafeError,
  type Settings,
  type Event,
  type Source,
  type PreparedArticle,
} from "./types";
export class Store {
  // In-memory accounting for the current invocation, never a second allowance.
  aiCalls = 0;
  constructor(public db: D1Database) {}
  async settings() {
    const row = await this.db
      .prepare("SELECT value,version FROM settings WHERE id=1")
      .first<{ value: string; version: number }>();
    if (!row) throw new SafeError("database", "Base editorial sin inicializar");
    return { value: JSON.parse(row.value) as Settings, version: row.version };
  }
  async history(
    actor: string,
    action: string,
    detail: string,
    eventId: string | null = null,
  ) {
    await this.db
      .prepare(
        "INSERT INTO history(event_id,at,actor,action,detail) VALUES(?,?,?,?,?)",
      )
      .bind(
        eventId,
        new Date().toISOString(),
        actor,
        action,
        detail.slice(0, 2000),
      )
      .run();
  }
  async lock(name: string, owner: string, now = new Date(), minutes = 5) {
    const result = await this.db
      .prepare(
        "INSERT INTO locks(name,owner,expires_at) VALUES(?,?,?) ON CONFLICT(name) DO UPDATE SET owner=excluded.owner,expires_at=excluded.expires_at WHERE locks.expires_at<?",
      )
      .bind(
        name,
        owner,
        new Date(+now + minutes * 60000).toISOString(),
        now.toISOString(),
      )
      .run();
    return result.meta.changes === 1;
  }
  async unlock(name: string, owner: string) {
    await this.db
      .prepare("DELETE FROM locks WHERE name=? AND owner=?")
      .bind(name, owner)
      .run();
  }
  async counts(now = new Date()) {
    const day = dayKey(now);
    const rows = await this.db
      .prepare(
        "SELECT kind,state,count(*) AS n FROM reservations WHERE (day=? OR state='reserved') AND state IN ('reserved','published') GROUP BY kind,state",
      )
      .bind(day)
      .all<{ kind: string; state: string; n: number }>();
    const get = (kind: string, state: string) =>
      rows.results
        .filter((r) => r.kind === kind && r.state === state)
        .reduce((n, r) => n + r.n, 0);
    return {
      day,
      regular: get("regular", "published"),
      extra: get("extra", "published"),
      updates: get("update", "published"),
      reserved: get("regular", "reserved") + get("extra", "reserved"),
      reservedUpdates: get("update", "reserved"),
    };
  }
  async updateSettings(
    raw: unknown,
    version: number,
    actor: string,
    now = new Date(),
  ) {
    const current = await this.settings();
    if (version !== current.version)
      throw new SafeError(
        "conflict",
        "La configuración cambió; recarga antes de guardar",
      );
    const value = validateSettings(raw, current.value);
    const c = await this.counts(now);
    const regularAt = nextRegular(
      now,
      Math.max(0, value.dailyTarget - c.regular - c.reserved),
      value.minimumGapMinutes,
    );
    const result = await this.db
      .prepare(
        "UPDATE settings SET value=?,version=version+1,updated_at=? WHERE id=1 AND version=?",
      )
      .bind(JSON.stringify(value), now.toISOString(), version)
      .run();
    if (result.meta.changes !== 1)
      throw new SafeError("conflict", "La configuración cambió");
    await this.db
      .prepare(
        "UPDATE runtime SET next_check=?,next_regular=?,status=? WHERE id=1",
      )
      .bind(
        new Date(+now + value.intervalMinutes * 60000).toISOString(),
        regularAt,
        !value.enabled
          ? "disabled"
          : value.paused
            ? "paused"
            : value.mode === "test"
              ? "test"
              : "active",
      )
      .run();
    await this.history(actor, "settings", JSON.stringify(value));
    return { ...(await this.settings()), capacity: capacity(value) };
  }
  async charge(
    kind: "news_calls" | "ai_calls" | "builds",
    limit: number,
    now = new Date(),
    reserve = 0,
    budget = 0,
  ) {
    const day = dayKey(now);
    await this.db
      .prepare("INSERT INTO usage(day) VALUES(?) ON CONFLICT DO NOTHING")
      .bind(day)
      .run();
    const result = await this.db
      .prepare(
        `UPDATE usage SET ${kind}=${kind}+1,ai_reserved=ai_reserved+? WHERE day=? AND ${kind}<? AND (?=0 OR ai_actual+ai_reserved+?<=?)`,
      )
      .bind(reserve, day, limit, budget, reserve, budget)
      .run();
    if (result.meta.changes !== 1)
      throw new SafeError(
        "budget",
        "Límite de consumo o presupuesto alcanzado",
      );
    if (kind === "ai_calls") this.aiCalls++;
    return day;
  }
  async settle(day: string, reserved: number, actual: number) {
    await this.db
      .prepare(
        "UPDATE usage SET ai_reserved=max(0,ai_reserved-?),ai_actual=ai_actual+? WHERE day=?",
      )
      .bind(reserved, actual, day)
      .run();
  }
  async reserve(event: Event, now = new Date()) {
    // Single SQL statement reads LIVE settings and consumes capacity atomically.
    const day = dayKey(now),
      expires = new Date(+now + 3600000).toISOString();
    const held = await this.db
      .prepare(
        "SELECT event_id FROM reservations WHERE event_id=? AND state='reserved'",
      )
      .bind(event.id)
      .first();
    if (held) {
      if (!event.commit_sha) return false;
      const renewed = await this.db
        .prepare(
          "UPDATE reservations SET expires_at=? WHERE event_id=? AND state='reserved' AND EXISTS(SELECT 1 FROM settings WHERE id=1 AND json_extract(value,'$.enabled')=1 AND json_extract(value,'$.paused')=0 AND json_extract(value,'$.mode')='active') AND EXISTS(SELECT 1 FROM events WHERE id=? AND state='approved' AND revision=? AND approved_revision=revision)",
        )
        .bind(expires, event.id, event.id, event.revision)
        .run();
      return renewed.meta.changes === 1;
    }

    const result = await this.db
      .prepare(
        `INSERT INTO reservations(event_id,day,kind,state,expires_at)
 SELECT ?,?,CASE WHEN ? IS NOT NULL THEN 'update' WHEN (SELECT count(*) FROM reservations WHERE (day=? OR state='reserved') AND state IN ('reserved','published') AND kind='regular') < json_extract(value,'$.dailyTarget') THEN 'regular' ELSE 'extra' END,'reserved',?
 FROM settings WHERE id=1 AND json_extract(value,'$.enabled')=1 AND json_extract(value,'$.paused')=0 AND json_extract(value,'$.mode')='active'
 AND EXISTS (SELECT 1 FROM events WHERE id=? AND state='approved' AND approved_revision=revision AND revision=?)
 AND (?=0 OR json_extract(value,'$.breakingEnabled')=1)
 AND (? IS NOT NULL OR (SELECT count(*) FROM reservations WHERE (day=? OR state='reserved') AND state IN ('reserved','published') AND kind='regular')<json_extract(value,'$.dailyTarget')
 OR (?=1 AND (SELECT count(*) FROM reservations WHERE (day=? OR state='reserved') AND state IN ('reserved','published') AND kind='extra')<json_extract(value,'$.extraQuota')))
 ON CONFLICT(event_id) DO UPDATE SET day=excluded.day,kind=excluded.kind,state='reserved',expires_at=excluded.expires_at WHERE reservations.state='released'`,
      )
      .bind(
        event.id,
        day,
        event.related_id,
        day,
        expires,
        event.id,
        event.revision,
        event.urgent,
        event.related_id,
        day,
        event.urgent,
        day,
      )
      .run();
    return result.meta.changes === 1;
  }
  async release(id: string) {
    await this.db
      .prepare(
        "UPDATE reservations SET state='released' WHERE event_id=? AND state='reserved'",
      )
      .bind(id)
      .run();
  }
  async event(id: string) {
    return this.db
      .prepare("SELECT * FROM events WHERE id=?")
      .bind(id)
      .first<Event>();
  }
  async sources(id: string) {
    return (
      await this.db
        .prepare("SELECT * FROM sources WHERE event_id=?")
        .bind(id)
        .all<Source>()
    ).results;
  }
  async drafts(id: string) {
    return (
      await this.db
        .prepare("SELECT lang,value,valid FROM drafts WHERE event_id=?")
        .bind(id)
        .all<{ lang: string; value: string; valid: number }>()
    ).results.map((r) => ({
      lang: r.lang,
      value: JSON.parse(r.value) as PreparedArticle,
      valid: !!r.valid,
    }));
  }
  async state(id: string, state: string, error: string | null = null) {
    await this.db
      .prepare("UPDATE events SET state=?,last_error=? WHERE id=?")
      .bind(state, error, id)
      .run();
  }
  async status(now = new Date()) {
    const settings = await this.settings();
    return {
      settings,
      capacity: capacity(settings.value),
      counts: await this.counts(now),
      runtime: await this.db
        .prepare("SELECT * FROM runtime WHERE id=1")
        .first(),
      usage: await this.db
        .prepare("SELECT * FROM usage WHERE day=?")
        .bind(dayKey(now))
        .first(),
      pending: await this.db
        .prepare(
          "SELECT count(*) AS n FROM events WHERE state NOT IN ('published','rejected')",
        )
        .first(),
      events: (
        await this.db
          .prepare("SELECT * FROM events ORDER BY detected_at DESC LIMIT 100")
          .all()
      ).results,
      history: (
        await this.db
          .prepare("SELECT * FROM history ORDER BY id DESC LIMIT 80")
          .all()
      ).results,
    };
  }
}
