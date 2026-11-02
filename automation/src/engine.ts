import { Store } from "./store";
import {
  hash,
  normalizedTitle,
  similarity,
  sufficient,
  nextRegular,
  validatePair,
} from "./policy";
import {
  news,
  consultSource,
  verify,
  draftLanguage,
  reviewPair,
} from "./providers";
import { startPublication, reconcile } from "./publish";
import {
  SafeError,
  type Env,
  type Event,
  type Settings,
  type Verification,
} from "./types";
export function readiness(env: Env) {
  return {
    database: !!env.DB,
    news: !!env.CRYPTONEWS_API_KEY,
    ai: !!env.ECONOFLUX_OPENAI_API_KEY,
    github: !!env.GITHUB_TOKEN,
    cloudflare: !!env.CLOUDFLARE_API_TOKEN && !!env.CLOUDFLARE_ACCOUNT_ID,
    access:
      !!env.CF_ACCESS_TEAM_DOMAIN && !!env.CF_ACCESS_AUD && !!env.ADMIN_EMAILS,
  };
}
async function collect(env: Env, store: Store, s: Settings) {
  const items = await news(env, store, s);
  const prior = (
    await store.db
      .prepare(
        "SELECT id,title,state FROM events ORDER BY detected_at DESC LIMIT 500",
      )
      .all<{ id: string; title: string; state: string }>()
  ).results;
  const sourceCounts = (
    await store.db
      .prepare(
        "SELECT event_id,count(*) AS n FROM sources WHERE event_id IN (SELECT id FROM events ORDER BY detected_at DESC LIMIT 500) GROUP BY event_id",
      )
      .all<{ event_id: string; n: number }>()
  ).results;
  const knownUrls = new Set(
    (
      await store.db
        .prepare(
          "SELECT url FROM sources WHERE event_id IN (SELECT id FROM events ORDER BY detected_at DESC LIMIT 500)",
        )
        .all<{ url: string }>()
    ).results.map((row) => row.url),
  );
  // Sample the owner's existing 100-item plan, but bound each ingestion to
  // twelve unseen reports. Repeated feeds neither requeue failed sources nor
  // use unbounded D1 batches on the free Worker.
  const unseen = items.filter((item) => !knownUrls.has(item.url)).slice(0, 12);
  const counts = new Map(sourceCounts.map((r) => [r.event_id, r.n]));
  const statements: D1PreparedStatement[] = [];
  const eventStatements: number[] = [];
  for (const item of unseen) {
    const similar = prior.find((e) => similarity(e.title, item.title) >= 0.7);
    const id = similar?.id || (await hash(item.url)).slice(0, 24);
    if (!similar) {
      eventStatements.push(statements.length);
      statements.push(
        store.db
          .prepare(
            "INSERT INTO events(id,provider_id,fingerprint,title,url,detected_at,event_at,selection_reason) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING",
          )
          .bind(
            id,
            item.providerId,
            await hash(normalizedTitle(item.title)),
            item.title,
            item.url,
            new Date().toISOString(),
            item.date,
            "Noticia reciente; relevancia y hechos pendientes de verificación",
          ),
      );
      prior.push({ id, title: item.title, state: "detected" });
    }
    if ((counts.get(id) || 0) < 5) {
      statements.push(
        store.db
          .prepare(
            "INSERT INTO sources(id,event_id,url,publisher,published_at) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM events WHERE id=?) ON CONFLICT DO NOTHING",
          )
          .bind(
            (await hash(id + item.url)).slice(0, 24),
            id,
            item.url,
            item.source,
            item.date,
            id,
          ),
      );
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    if (
      similar &&
      ["needs_sources", "needs_verification"].includes(similar.state)
    )
      statements.push(
        store.db
          .prepare(
            "UPDATE events SET state='detected',verification=NULL,verified_at=NULL WHERE id=?",
          )
          .bind(id),
      );
  }
  const results = statements.length ? await store.db.batch(statements) : [];
  const added = eventStatements.reduce(
    (n, i) => n + (results[i]?.meta.changes || 0),
    0,
  );
  await store.history(
    "worker",
    "poll",
    `${items.length} resultados recientes, ${added} candidatos nuevos; no se considera que la caché del proveedor demuestre un acontecimiento nuevo`,
  );
  return added;
}
async function prepare(env: Env, store: Store, s: Settings, event: Event) {
  let sources = await store.sources(event.id);
  for (const source of sources.filter((x) => !x.fetched_at)) {
    const result = await consultSource(source.url, s);
    for (const link of result.primaryLinks || []) {
      const n = await store.db
        .prepare("SELECT count(*) AS n FROM sources WHERE event_id=?")
        .bind(event.id)
        .first<{ n: number }>();
      if ((n?.n || 0) >= 5) break;
      await store.db
        .prepare(
          "INSERT INTO sources(id,event_id,url,publisher) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
        )
        .bind(
          (await hash(event.id + link)).slice(0, 24),
          event.id,
          link,
          new URL(link).hostname,
        )
        .run();
    }
    await store.db
      .prepare(
        "UPDATE sources SET accessible=?,primary_source=?,independence_group=?,excerpt=?,error=?,fetched_at=? WHERE id=?",
      )
      .bind(
        result.accessible,
        result.primary_source,
        result.independence_group,
        result.excerpt,
        result.error,
        new Date().toISOString(),
        source.id,
      )
      .run();
  }
  sources = await store.sources(event.id);
  for (const source of sources.filter((x) => !x.fetched_at)) {
    const result = await consultSource(source.url, s);
    await store.db
      .prepare(
        "UPDATE sources SET accessible=?,primary_source=?,independence_group=?,excerpt=?,error=?,fetched_at=? WHERE id=?",
      )
      .bind(
        result.accessible,
        result.primary_source,
        result.independence_group,
        result.excerpt,
        result.error,
        new Date().toISOString(),
        source.id,
      )
      .run();
  }
  sources = await store.sources(event.id);
  const accessible = sources.filter((x) => x.accessible);
  if (!accessible.length || !accessible.some((x) => x.primary_source)) {
    await store.state(
      event.id,
      "needs_sources",
      "Falta una fuente primaria accesible; no se redacta ni se gasta IA",
    );
    return;
  }
  let verification: Verification;
  let verifiedThisInvocation = false;
  if (event.verification && event.verified_at) {
    verification = JSON.parse(event.verification);
  } else {
    verification = await verify(env, store, s, event, sources);
    const allowedGroups = new Set(accessible.map((x) => x.independence_group));
    if (verification.independentGroups.some((g) => !allowedGroups.has(g)))
      verification.sufficient = false;
    if (
      !sufficient(
        verification,
        new Set(accessible.map((x) => x.id)),
        new Set(accessible.filter((x) => x.primary_source).map((x) => x.url)),
      )
    ) {
      await store.db
        .prepare(
          "UPDATE events SET state='needs_verification',verification=?,last_error=? WHERE id=?",
        )
        .bind(
          JSON.stringify(verification),
          verification.reason.slice(0, 1000),
          event.id,
        )
        .run();
      return;
    }
    if (Date.now() - Date.parse(verification.eventDate) > 7 * 86400000) {
      await store.state(
        event.id,
        "needs_verification",
        "El acontecimiento no es reciente; requiere revisión de contexto",
      );
      return;
    }
    const existing = await store.db
      .prepare(
        "SELECT id,state FROM events WHERE canonical_event=? AND id<>? AND related_id IS NULL",
      )
      .bind(verification.canonicalEvent, event.id)
      .first<{ id: string; state: string }>();
    if (
      existing &&
      !event.related_id &&
      verification.materialUpdate &&
      existing.state === "published"
    ) {
      const prior = await store.event(existing.id);
      await store.db
        .prepare(
          "UPDATE events SET related_id=?,revision=?,published_at=? WHERE id=?",
        )
        .bind(
          existing.id,
          (prior?.revision || 1) + 1,
          prior?.published_at,
          event.id,
        )
        .run();
      event = (await store.event(event.id))!;
    }
    if (existing && !event.related_id) {
      await store.db
        .prepare(
          "UPDATE events SET state='possible_update',related_id=?,last_error='Posible actualización; requiere asignación editorial' WHERE id=?",
        )
        .bind(existing.id, event.id)
        .run();
      return;
    }
    await store.db
      .prepare(
        "UPDATE events SET verification=?,verified_at=?,canonical_event=?,urgent=?,urgent_reason=?,category=?,importance=?,importance_reason=? WHERE id=?",
      )
      .bind(
        JSON.stringify(verification),
        new Date().toISOString(),
        verification.canonicalEvent,
        verification.urgency.confirmed ? 1 : 0,
        verification.urgency.reason,
        verification.category,
        verification.relevanceScore || 0,
        verification.importanceReason || verification.reason,
        event.id,
      )
      .run();
    verifiedThisInvocation = true;
  }
  event = (await store.event(event.id))!;
  if (s.executionMode === "hourly" && (verification.relevanceScore || 0) < 60) {
    await store.state(
      event.id,
      "rejected",
      "Relevancia verificada insuficiente para publicación",
    );
    return;
  }
  if (
    s.executionMode === "hourly" &&
    !event.related_id &&
    !event.published_at
  ) {
    const initial = await store.db
      .prepare("SELECT state FROM hourly_cycles WHERE id='initial-once'")
      .first<{ state: string }>();
    if (initial?.state === "complete") {
      const open = await store.db
        .prepare(
          "SELECT id FROM hourly_cycles WHERE kind='hourly' AND state='open' ORDER BY started_at DESC LIMIT 1",
        )
        .first<{ id: string }>();
      const used = open
        ? await store.db
            .prepare(
              "SELECT count(*) AS n FROM cycle_items WHERE cycle_id=? AND kind='new' AND state IN ('reserved','published')",
            )
            .bind(open.id)
            .first<{ n: number }>()
        : null;
      if ((used?.n || 0) >= 1 && (verification.relevanceScore || 0) < 85) {
        await store.db
          .prepare("UPDATE events SET state='qualified',retry_at=? WHERE id=?")
          .bind(new Date(Date.now() + 3600000).toISOString(), event.id)
          .run();
        return;
      }
    }
  }
  if (s.executionMode === "hourly" && verifiedThisInvocation)
    throw new SafeError(
      "resume_pending",
      "Verificación guardada; continuar la redacción en el siguiente turno",
    );
  for (const lang of ["en", "es"] as const) {
    const drafts = await store.drafts(event.id);
    if (drafts.some((d) => d.lang === lang && d.valid)) continue;
    const en = drafts.find((d) => d.lang === "en")?.value;
    const article = await draftLanguage(
      env,
      store,
      s,
      event,
      verification,
      lang,
      en,
    );
    // Updates preserve existing paths before validation and deployment URL checks.
    if (event.related_id) {
      const old = await store.drafts(event.related_id);
      const prior = old.find((d) => d.lang === lang)?.value;
      if (!prior)
        throw new SafeError(
          "update_original",
          "No está disponible la versión original",
        );
      article.slug = prior.slug;
      article.publishedAt = prior.publishedAt;
    }
    await store.db
      .prepare(
        "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES(?,?,?,?,1,?) ON CONFLICT(event_id,lang) DO UPDATE SET revision=excluded.revision,value=excluded.value,valid=1,updated_at=excluded.updated_at",
      )
      .bind(
        event.id,
        lang,
        event.revision,
        JSON.stringify(article),
        new Date().toISOString(),
      )
      .run();
    if (s.executionMode === "hourly")
      throw new SafeError(
        "resume_pending",
        `Versión ${lang} guardada; continuar sin regenerarla`,
      );
  }
  const drafts = await store.drafts(event.id);
  const en = drafts.find((d) => d.lang === "en")?.value,
    es = drafts.find((d) => d.lang === "es")?.value;
  if (!en || !es) throw new SafeError("translations", "Falta una traducción");
  try {
    // The independent review below checks numeric equivalence, including
    // translated ordinals/number words that a regex cannot compare reliably.
    validatePair(en, es, { numericReviewed: true });
  } catch (error) {
    await store.db
      .prepare(
        "UPDATE drafts SET valid=0 WHERE event_id=? AND (?='draft' OR lang='es')",
      )
      .bind(event.id, error instanceof SafeError ? error.code : "translation")
      .run();
    throw error;
  }
  const fingerprint = await hash(
    JSON.stringify([verification.essentialFacts, en, es]),
  );
  if (
    !verification.draftReview?.passed ||
    verification.draftReview.fingerprint !== fingerprint
  ) {
    const review = await reviewPair(env, store, s, verification, en, es);
    if (!review.passed) {
      const invalid = review.invalidLanguages.length
        ? review.invalidLanguages
        : ["en", "es"];
      await store.db.batch(
        invalid.map((lang) =>
          store.db
            .prepare("UPDATE drafts SET valid=0 WHERE event_id=? AND lang=?")
            .bind(event.id, lang),
        ),
      );
      throw new SafeError(
        "editorial_review",
        review.issues.join("; ").slice(0, 1000) ||
          "Revisión editorial no superada",
      );
    }
    verification.draftReview = {
      fingerprint,
      passed: true,
      checkedAt: new Date().toISOString(),
    };
    await store.db
      .prepare("UPDATE events SET verification=? WHERE id=?")
      .bind(JSON.stringify(verification), event.id)
      .run();
  }
  await store.db
    .prepare(
      "UPDATE events SET state='draft',prepared_at=?,retry_at=NULL,last_error=NULL WHERE id=?",
    )
    .bind(new Date().toISOString(), event.id)
    .run();
  // Automated approval requires an explicit setting; defaults remain manual.
  if (s.autoApprove) {
    await store.db
      .prepare(
        "UPDATE events SET state='approved',approved_by='automated-policy',approved_revision=revision WHERE id=?",
      )
      .bind(event.id)
      .run();
  }
  await store.history(
    "worker",
    "prepared",
    "Ambas versiones preparadas; revisión pendiente salvo aprobación automática explícita",
    event.id,
  );
}
export async function tick(
  env: Env,
  options: { manual?: boolean; live?: boolean; now?: Date } = {},
) {
  const store = new Store(env.DB),
    now = options.now || new Date(),
    owner = crypto.randomUUID();
  if (!(await store.lock("scheduler", owner, now, 15)))
    return { status: "busy" };
  const runId = crypto.randomUUID();
  await store.db
    .prepare("INSERT INTO runs(id,started_at,mode) VALUES(?,?,?)")
    .bind(
      runId,
      now.toISOString(),
      options.manual ? "manual-test" : "scheduled",
    )
    .run();
  try {
    let s = (await store.settings()).value;
    await store.db
      .prepare(
        "UPDATE events SET state='retry',retry_at=?,last_error='Trabajo interrumpido; se conservan traducciones válidas' WHERE state='preparing' AND lease_until<?",
      )
      .bind(now.toISOString(), now.toISOString())
      .run();
    if (!options.manual && (!s.enabled || s.paused)) {
      return { status: !s.enabled ? "disabled" : "paused" };
    }
    // Reconcile existing deployments, but never initiate any side effect while paused.
    if (!options.manual)
      for (const event of (
        await store.db
          .prepare("SELECT * FROM events WHERE state='deploying' LIMIT 3")
          .all<Event>()
      ).results) {
        try {
          await reconcile(env, store, event);
        } catch (error) {
          await store.state(
            event.id,
            "deploying",
            error instanceof SafeError
              ? error.message
              : "Conciliación pendiente",
          );
        }
      }
    const runtime = await store.db
      .prepare("SELECT next_check,next_regular FROM runtime WHERE id=1")
      .first<{ next_check: string | null; next_regular: string | null }>();
    const due = !runtime?.next_check || runtime.next_check <= now.toISOString();
    if ((!options.manual && due) || (options.manual && options.live)) {
      // Set due time BEFORE network operations to avoid repeated paid failures every minute.
      await store.db
        .prepare(
          "UPDATE runtime SET last_check=?,next_check=?,last_error=NULL,status=? WHERE id=1",
        )
        .bind(
          now.toISOString(),
          new Date(+now + s.intervalMinutes * 60000).toISOString(),
          s.mode === "test" ? "test" : "active",
        )
        .run();
      await collect(env, store, s);
    }
    const events = (
      await store.db
        .prepare(
          "SELECT * FROM events WHERE state IN ('detected','retry') AND (retry_at IS NULL OR retry_at<=?) ORDER BY urgent DESC,detected_at ASC LIMIT 2",
        )
        .bind(now.toISOString())
        .all<Event>()
    ).results;
    for (const event of events) {
      s = (await store.settings()).value;
      if (!options.manual && (!s.enabled || s.paused)) break;
      try {
        await store.db
          .prepare(
            "UPDATE events SET state='preparing',lease_until=? WHERE id=?",
          )
          .bind(new Date(+now + 15 * 60000).toISOString(), event.id)
          .run();
        await prepare(env, store, s, event);
      } catch (error) {
        const safe =
          error instanceof SafeError
            ? error.message
            : "Error editorial interno";
        const attempts = event.attempts + 1;
        await store.db
          .prepare(
            "UPDATE events SET state=?,attempts=?,retry_at=?,last_error=? WHERE id=?",
          )
          .bind(
            attempts >= 3 ? "error" : "retry",
            attempts,
            new Date(
              +now + Math.min(360, 10 * 2 ** attempts) * 60000,
            ).toISOString(),
            safe,
            event.id,
          )
          .run();
        await store.history("worker", "error", safe, event.id);
      }
    }
    s = (await store.settings()).value;
    if (options.manual || s.mode !== "active" || !s.enabled || s.paused)
      return { status: "test", published: 0 };
    const candidate = await store.db
      .prepare(
        "SELECT * FROM events WHERE state='approved' AND approved_revision=revision ORDER BY urgent DESC,prepared_at ASC LIMIT 1",
      )
      .first<Event>();
    if (candidate) {
      const fresh = (await store.settings()).value;
      const counts = await store.counts(now);
      const next = runtime?.next_regular;
      if (
        candidate.urgent ||
        candidate.related_id ||
        (counts.regular < fresh.dailyTarget &&
          (!next || next <= now.toISOString()))
      ) {
        await startPublication(env, store, fresh, candidate, now);
        await store.db
          .prepare("UPDATE runtime SET next_regular=? WHERE id=1")
          .bind(
            nextRegular(
              now,
              Math.max(
                0,
                fresh.dailyTarget - counts.regular - counts.reserved - 1,
              ),
              fresh.minimumGapMinutes,
            ),
          )
          .run();
      }
    }
    return { status: "ok" };
  } catch (error) {
    const safe =
      error instanceof SafeError ? error.message : "Fallo editorial interno";
    await store.db
      .prepare("UPDATE runtime SET last_error=?,status='error' WHERE id=1")
      .bind(safe)
      .run();
    await store.history("worker", "run_error", safe);
    return { status: "error", error: safe };
  } finally {
    await store.db
      .prepare(
        "UPDATE runs SET ended_at=?,result=?,error=(SELECT last_error FROM runtime WHERE id=1) WHERE id=?",
      )
      .bind(
        new Date().toISOString(),
        options.manual ? "manual-no-publication" : "scheduled",
        runId,
      )
      .run();
    await store.unlock("scheduler", owner);
  }
}
export { prepare, collect };
