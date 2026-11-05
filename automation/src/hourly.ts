import {
  reportDailyPlan,
  reportOrder,
  mayPublishReport,
  reportQueueFilter,
  REPORT_CANDIDATE_SQL,
} from "./report-daily";
import { nextNewsPoll, newsPollSlot } from "./reporting";
import { dailyNewsPlan, mayPublishDailyNews } from "./daily-mix";
import { checkReportFollowup } from "./report-followups";
import { Store } from "./store";
import { collect, prepare } from "./engine";
import { stagePair, confirmPair } from "./live-publish";
import { modelJSON } from "./providers";
import { maintainPublished } from "./maintenance";
import { SafeError, type Env, type Event } from "./types";
interface Control {
  enabled: number;
  paused: number;
  initial_target: number;
  interval_minutes: number;
  max_per_cycle: number;
  next_review: string | null;
  initial_completed_at: string | null;
  last_error: string | null;
  preflight_requested: number;
}
export async function hourlyTick(env: Env, now = new Date()) {
  const store = new Store(env.DB),
    owner = crypto.randomUUID();
  if (!(await store.lock("scheduler", owner, now, 20)))
    return { status: "busy" };
  let runId: string | undefined;
  try {
    const control = await store.db
      .prepare("SELECT * FROM automation_control WHERE id=1")
      .first<Control>();
    if (control?.preflight_requested) {
      await store.db
        .prepare(
          "UPDATE automation_control SET preflight_requested=0,preflight_error=NULL WHERE id=1",
        )
        .run();
      try {
        if (!env.CRYPTONEWS_API_KEY || !env.ECONOFLUX_OPENAI_API_KEY)
          throw new SafeError(
            "runtime_secrets",
            "Faltan CRYPTONEWS_API_KEY o ECONOFLUX_OPENAI_API_KEY en el Worker",
          );
        const settings = (await store.settings()).value;
        const cached = await store.db
          .prepare(
            "SELECT count(*) AS n FROM events WHERE provider_id IS NOT NULL AND detected_at>?",
          )
          .bind(new Date(+now - 3600000).toISOString())
          .first<{ n: number }>();
        if (!cached?.n) await collect(env, store, settings);
        const proof = await modelJSON(
          env,
          store,
          settings,
          'Return JSON {"ok":true}. This is a connectivity test, no news drafting.',
          { purpose: "authorized connectivity test" },
          1000,
        );
        if (proof.ok !== true)
          throw new SafeError(
            "preflight_ai",
            "No se confirmó la respuesta de IA",
          );
        const page = await fetch(new URL("/en/", env.SITE_URL), {
          redirect: "manual",
          signal: AbortSignal.timeout(20000),
        });
        if (!page.ok || !(await page.text()).includes('<html lang="en"'))
          throw new SafeError(
            "preflight_site",
            "La web pública no responde como se esperaba",
          );
        await store.db
          .prepare(
            "UPDATE automation_control SET preflight_passed_at=?,preflight_error=NULL,last_review=?,next_review=? WHERE id=1",
          )
          .bind(
            now.toISOString(),
            now.toISOString(),
            new Date(+now + 3600000).toISOString(),
          )
          .run();
        await store.history(
          "hourly-worker",
          "preflight_ok",
          "Noticias, IA y web pública comprobadas en el Worker real; no se publicó contenido",
        );
        return { status: "preflight_ok" };
      } catch (error) {
        const message =
          error instanceof SafeError
            ? error.message
            : "Falló comprobación real";
        await store.db
          .prepare("UPDATE automation_control SET preflight_error=? WHERE id=1")
          .bind(message)
          .run();
        return { status: "preflight_failed", error: message };
      }
    }
    if (!control?.enabled || control.paused) return { status: "disabled" };
    if (!env.CRYPTONEWS_API_KEY || !env.ECONOFLUX_OPENAI_API_KEY)
      throw new SafeError(
        "runtime_secrets",
        "Faltan CRYPTONEWS_API_KEY o ECONOFLUX_OPENAI_API_KEY en el Worker",
      );
    runId = crypto.randomUUID();
    await store.db
      .prepare("INSERT INTO runs(id,started_at,mode) VALUES(?,?,'hourly-live')")
      .bind(runId, now.toISOString())
      .run();
    const settings = (await store.settings()).value;
    const reporting = settings.reportingPolicy === 2;
    // Interrupted work keeps valid translations and its original cycle reservation.
    await store.db
      .prepare(
        "UPDATE events SET state='retry',retry_at=?,last_error='Trabajo interrumpido; conservar versiones válidas' WHERE state='preparing' AND lease_until<?",
      )
      .bind(now.toISOString(), now.toISOString())
      .run();
    for (const pending of (
      await store.db
        .prepare(
          "SELECT * FROM events WHERE state='live_pending' ORDER BY detected_at LIMIT 5",
        )
        .all<Event>()
    ).results) {
      try {
        await confirmPair(env, store, pending);
      } catch (error) {
        await store.state(
          pending.id,
          "live_pending",
          error instanceof SafeError
            ? error.message
            : "Comprobación pública pendiente",
        );
      }
    }
    const initial =
      (
        await store.db
          .prepare(
            "SELECT count(*) AS n FROM cycle_items WHERE cycle_id='initial-once' AND kind='new' AND state='published'",
          )
          .first<{ n: number }>()
      )?.n || 0;
    const pendingInitialRevision =
      (
        await store.db
          .prepare(
            "SELECT count(*) AS n FROM cycle_items c JOIN events e ON e.id=c.event_id WHERE c.cycle_id='initial-once' AND e.state<>'published'",
          )
          .first<{ n: number }>()
      )?.n || 0;
    if (
      initial >= control.initial_target &&
      !pendingInitialRevision &&
      !control.initial_completed_at
    ) {
      await store.db
        .prepare(
          "UPDATE automation_control SET initial_completed_at=?,next_review=? WHERE id=1",
        )
        .bind(
          now.toISOString(),
          reporting
            ? nextNewsPoll(now)
            : new Date(+now + 60 * 60000).toISOString(),
        )
        .run();
      await store.db
        .prepare(
          "UPDATE hourly_cycles SET state='complete',completed_at=? WHERE id='initial-once'",
        )
        .bind(now.toISOString())
        .run();
      await store.history(
        "hourly-worker",
        "initial_complete",
        "Primera tanda completada una sola vez; próxima revisión en 60 minutos",
      );
      return { status: "initial_complete" };
    }
    const isInitial =
      initial < control.initial_target ||
      (!control.initial_completed_at && pendingInitialRevision > 0);
    const cycleLimit =
      Number.isInteger(control.max_per_cycle) && control.max_per_cycle >= 1
        ? Math.min(5, control.max_per_cycle)
        : 3;
    const due =
      !control.next_review || control.next_review <= now.toISOString();
    let cycleId = isInitial ? "initial-once" : null;
    if (reporting && !isInitial) {
      cycleId = "hour-" + now.toISOString().slice(0, 13);
      await store.db.batch([
        store.db
          .prepare(
            "INSERT INTO hourly_cycles(id,kind,started_at,limit_count) VALUES(?,'hourly',?,?) ON CONFLICT DO NOTHING",
          )
          .bind(cycleId, now.toISOString(), cycleLimit),
        store.db
          .prepare(
            "UPDATE hourly_cycles SET state='closed',reason='Ventana horaria terminada; consultas de diez minutos no crean cupos' WHERE kind='hourly' AND id<>? AND state='open'",
          )
          .bind(cycleId),
      ]);
    }
    if (due) {
      const next = reporting
        ? nextNewsPoll(now)
        : new Date(+now + 60 * 60000).toISOString();
      await store.db
        .prepare(
          "UPDATE automation_control SET last_review=?,next_review=?,last_error=NULL WHERE id=1",
        )
        .bind(now.toISOString(), next)
        .run();
      if (!isInitial && !reporting) {
        cycleId = "hour-" + now.toISOString().slice(0, 13);
        await store.db
          .prepare(
            "INSERT INTO hourly_cycles(id,kind,started_at,limit_count) VALUES(?,'hourly',?,?) ON CONFLICT DO NOTHING",
          )
          .bind(cycleId, now.toISOString(), cycleLimit)
          .run();
        await store.db
          .prepare(
            "UPDATE hourly_cycles SET state='closed',reason='Ventana terminada; no acumular objetivos' WHERE kind='hourly' AND id<>? AND state='open'",
          )
          .bind(cycleId)
          .run();
      }
      const slot = newsPollSlot(now);
      if (reporting) {
        const claim = await store.db
          .prepare(
            "INSERT INTO news_polls(slot,started_at) VALUES(?,?) ON CONFLICT DO NOTHING",
          )
          .bind(slot, now.toISOString())
          .run();
        if (!claim.meta.changes) return { status: "waiting", nextReview: next };
      }
      try {
        const added = await collect(env, store, settings);
        if (reporting)
          await store.db
            .prepare(
              "UPDATE news_polls SET completed_at=?,result='ok',candidates=? WHERE slot=?",
            )
            .bind(new Date().toISOString(), added, slot)
            .run();
      } catch (error) {
        if (reporting)
          await store.db
            .prepare(
              "UPDATE news_polls SET completed_at=?,result='error',error=? WHERE slot=?",
            )
            .bind(
              new Date().toISOString(),
              error instanceof SafeError
                ? error.message
                : "Fallo del proveedor; sin detalles de credenciales",
              slot,
            )
            .run();
        if (error instanceof SafeError && error.retryAfterSeconds)
          await store.db
            .prepare("UPDATE automation_control SET next_review=? WHERE id=1")
            .bind(new Date(+now + error.retryAfterSeconds * 1000).toISOString())
            .run();
        throw error;
      }
      return { status: "collected", nextReview: next };
    }
    if (await maintainPublished(env, store, settings, now))
      return { status: "editorial_update" };
    // Reserve a bounded follow-up slot after each poll so a busy candidate
    // queue cannot starve confirmations or denials of published reports.
    if (
      reporting &&
      now.getUTCMinutes() % 10 === 1 &&
      (await checkReportFollowup(env, store, settings, now))
    )
      return { status: "report_followup", didWork: true };
    if (!cycleId) {
      const open = await store.db
        .prepare(
          "SELECT id FROM hourly_cycles WHERE kind='hourly' AND state='open' ORDER BY started_at DESC LIMIT 1",
        )
        .first<{ id: string }>();
      cycleId = open?.id || null;
    }
    if (!cycleId) return { status: "waiting", nextReview: control.next_review };
    const cycle = await store.db
      .prepare("SELECT state,limit_count FROM hourly_cycles WHERE id=?")
      .bind(cycleId)
      .first<{ state: string; limit_count: number }>();
    if (cycle?.state !== "open") return { status: "waiting" };
    const completed = await store.db
      .prepare(
        "SELECT count(*) AS n FROM cycle_items WHERE cycle_id=? AND kind='new' AND state IN ('reserved','published')",
      )
      .bind(cycleId)
      .first<{ n: number }>();
    const cycleFull = (completed?.n || 0) >= cycle.limit_count;
    const reportPlan = await reportDailyPlan(store, now);
    const dailyPlan = settings.editorialDailyPlan
      ? await dailyNewsPlan(store, now)
      : null;
    const dailyFilter =
      dailyPlan && !dailyPlan.available
        ? `AND (related_id IS NOT NULL OR published_at IS NOT NULL OR id IN (SELECT event_id FROM cycle_items WHERE state='reserved') ${reportPlan && reportPlan.published + reportPlan.reserved < reportPlan.target ? "OR " + REPORT_CANDIDATE_SQL : ""})`
        : "";
    const candidateOrder = reportOrder(
      !!reportPlan?.due && !reportPlan?.reserved,
    );
    const reportFilter = reportQueueFilter(reportPlan);
    const approvedOrder = reportOrder(!!reportPlan?.due, true);
    // One bounded job per invocation fits the free-tier subrequest budget; persistent queue resumes, no refetch per minute.
    const jobs = (
      await store.db
        .prepare(
          `SELECT * FROM events WHERE provider_id IS NOT NULL AND state IN ('detected','retry','qualified') AND (retry_at IS NULL OR retry_at<=?) AND (?=0 OR related_id IS NOT NULL OR id IN (SELECT event_id FROM cycle_items WHERE cycle_id=?)) ${reportFilter} ${dailyFilter} ORDER BY ${candidateOrder},(SELECT count(*) FROM sources WHERE event_id=events.id AND accessible=1) DESC,event_at DESC LIMIT 1`,
        )
        .bind(now.toISOString(), cycleFull ? 1 : 0, cycleId)
        .all<Event>()
    ).results;
    for (const event of jobs) {
      const fresh = await store.db
        .prepare("SELECT enabled,paused FROM automation_control WHERE id=1")
        .first<Control>();
      if (!fresh?.enabled || fresh.paused) break;
      try {
        await store.db
          .prepare(
            "UPDATE events SET state='preparing',lease_until=? WHERE id=?",
          )
          .bind(new Date(+now + 20 * 60000).toISOString(), event.id)
          .run();
        await prepare(
          env,
          store,
          { ...settings, autoApprove: true, executionMode: "hourly" },
          event,
        );
      } catch (error) {
        if (error instanceof SafeError && error.code === "resume_pending") {
          await store.db
            .prepare(
              "UPDATE events SET state='retry',retry_at=?,last_error=NULL WHERE id=?",
            )
            .bind(new Date(+now + 45000).toISOString(), event.id)
            .run();
          continue;
        }
        const attempts = event.attempts + 1;
        await store.db
          .prepare(
            "UPDATE events SET state=?,attempts=?,retry_at=?,last_error=? WHERE id=?",
          )
          .bind(
            attempts >= 3 ? "error" : "retry",
            attempts,
            new Date(+now + 60 * 60000).toISOString(),
            error instanceof SafeError ? error.message : "Preparación fallida",
            event.id,
          )
          .run();
      }
    }
    const approved = (
      await store.db
        .prepare(
          `SELECT * FROM events WHERE provider_id IS NOT NULL AND state='approved' AND approved_revision=revision ${reportFilter} ${dailyFilter} ORDER BY ${approvedOrder},event_at DESC LIMIT 8`,
        )
        .all<Event>()
    ).results;
    let published = 0;
    let count = completed?.n || 0;
    for (const event of approved) {
      if (
        settings.editorialDailyPlan &&
        !(await mayPublishDailyNews(store, event, now))
      )
        continue;
      if (!(await mayPublishReport(store, event, now, reportPlan))) continue;
      const reserved = await store.db
        .prepare("SELECT event_id,cycle_id FROM cycle_items WHERE event_id=?")
        .bind(event.id)
        .first<{ event_id: string; cycle_id: string }>();
      const reservedHere = reserved?.cycle_id === cycleId;
      if (count >= cycle.limit_count && !event.related_id && !reservedHere)
        continue;
      if (
        !event.related_id &&
        !isInitial &&
        count >= 1 &&
        !reservedHere &&
        ((event as any).importance || 0) < 85 &&
        !event.urgent
      )
        continue;
      const fresh = await store.db
        .prepare("SELECT enabled,paused FROM automation_control WHERE id=1")
        .first<Control>();
      if (!fresh?.enabled || fresh.paused) break;
      try {
        await stagePair(env, store, event, cycleId);
        count += event.related_id || reservedHere ? 0 : 1;
        await confirmPair(env, store, (await store.event(event.id))!);
        published++;
      } catch (error) {
        if (
          error instanceof SafeError &&
          error.code === "image_pending" &&
          !event.related_id &&
          !reservedHere
        )
          count++;
        const latest = await store.event(event.id);
        await store.state(
          event.id,
          latest?.state === "live_pending" ? "live_pending" : "approved",
          error instanceof SafeError ? error.message : "Publicación pendiente",
        );
      }
    }
    if (
      reporting &&
      !jobs.length &&
      !approved.length &&
      (await checkReportFollowup(env, store, settings, now))
    )
      return { status: "report_followup", didWork: true };
    if (!published)
      await store.history(
        "hourly-worker",
        "no_publication",
        jobs.length
          ? "Sin artículo verificado y completo; no publicar relleno"
          : "Sin novedad útil o trabajo pendiente de fuentes",
      );
    return {
      status: "ok",
      published,
      didWork:
        store.aiCalls > 0 ||
        (settings.editorialDailyPlan ? published > 0 : approved.length > 0),
    };
  } catch (error) {
    const safe =
      error instanceof SafeError ? error.message : "Fallo de ejecución horario";
    await store.db
      .prepare("UPDATE automation_control SET last_error=? WHERE id=1")
      .bind(safe)
      .run();
    await store.history("hourly-worker", "error", safe);
    return { status: "error", error: safe };
  } finally {
    if (runId)
      await store.db
        .prepare("UPDATE runs SET ended_at=?,result=? WHERE id=?")
        .bind(new Date().toISOString(), "hourly-cycle", runId)
        .run();
    await store.unlock("scheduler", owner);
  }
}
