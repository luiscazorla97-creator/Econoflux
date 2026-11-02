import { Store } from "./store";
import { prepare } from "./engine";
import { stagePair, confirmPair } from "./live-publish";
import { SafeError, type Env, type Event, type Settings } from "./types";

// Authenticated D1 requests only. No administrative or maintenance HTTP route.
export async function maintainPublished(
  env: Env,
  store: Store,
  settings: Settings,
  now: Date,
) {
  const job = await store.db
    .prepare(
      "SELECT u.event_id,u.state FROM editorial_updates u JOIN events e ON e.id=u.event_id WHERE u.state IN ('pending','working') AND (e.retry_at IS NULL OR e.retry_at<=?) ORDER BY u.requested_at LIMIT 1",
    )
    .bind(now.toISOString())
    .first<{ event_id: string; state: string }>();
  if (!job) return false;
  let event = (await store.event(job.event_id))!;
  try {
    if (job.state === "pending") {
      if (!event.published_at)
        throw new SafeError(
          "maintenance",
          "Solo actualizar artículos ya publicados",
        );
      await store.db.batch([
        store.db
          .prepare(
            "UPDATE events SET revision=revision+1,state='retry',verification=NULL,verified_at=NULL,approved_revision=NULL,last_error=NULL,attempts=0,retry_at=NULL WHERE id=?",
          )
          .bind(event.id),
        store.db
          .prepare("UPDATE drafts SET valid=0 WHERE event_id=?")
          .bind(event.id),
        store.db
          .prepare(
            "UPDATE editorial_updates SET state='working',last_error=NULL WHERE event_id=?",
          )
          .bind(event.id),
      ]);
      event = (await store.event(event.id))!;
    }
    if (event.state === "live_pending") {
      await confirmPair(env, store, event);
    } else {
      await prepare(
        env,
        store,
        { ...settings, executionMode: "hourly", autoApprove: true },
        event,
      );
      event = (await store.event(event.id))!;
      if (event.state !== "approved")
        throw new SafeError(
          "maintenance_evidence",
          "Actualización pendiente de evidencia suficiente",
        );
      await stagePair(env, store, event, "initial-once");
      await confirmPair(env, store, (await store.event(event.id))!);
    }
    await store.db
      .prepare(
        "UPDATE editorial_updates SET state='complete',completed_at=?,last_error=NULL WHERE event_id=?",
      )
      .bind(new Date().toISOString(), event.id)
      .run();
    await store.history(
      "editorial-worker",
      "existing_article_updated",
      "Mismo artículo y URLs; ambos idiomas revisados y comprobados públicamente",
      event.id,
    );
  } catch (error) {
    if (error instanceof SafeError && error.code === "resume_pending") {
      await store.db
        .prepare(
          "UPDATE events SET state='retry',retry_at=?,last_error=NULL WHERE id=?",
        )
        .bind(new Date(+now + 60000).toISOString(), event.id)
        .run();
    } else {
      const latest = (await store.event(event.id))!;
      const message =
        error instanceof SafeError
          ? error.message
          : "Actualización editorial fallida";
      const attempts = latest.attempts + 1;
      await store.db
        .prepare(
          "UPDATE events SET state=?,attempts=?,retry_at=?,last_error=? WHERE id=?",
        )
        .bind(
          latest.state === "live_pending" ? "live_pending" : "retry",
          attempts,
          new Date(+now + 3600000).toISOString(),
          message,
          event.id,
        )
        .run();
      await store.db
        .prepare(
          "UPDATE editorial_updates SET state=?,last_error=? WHERE event_id=?",
        )
        .bind(attempts >= 3 ? "failed" : "working", message, event.id)
        .run();
    }
  }
  return true;
}
