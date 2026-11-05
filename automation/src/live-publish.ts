import { sourceDigest } from "./report-followups";
import { Store } from "./store";
import { validatePair, dayKey, hash } from "./policy";
import { bounded } from "./providers";
import { SafeError, type Env, type Event, type PreparedArticle } from "./types";
export async function reserveCycle(
  store: Store,
  event: Event,
  cycleId: string,
) {
  const result = await store.db
    .prepare(
      `INSERT INTO cycle_items(event_id,cycle_id,kind,state,reserved_at)
 SELECT ?,?,?,'reserved',? FROM hourly_cycles c JOIN automation_control a ON a.id=1
 WHERE c.id=? AND c.state='open' AND a.enabled=1 AND a.paused=0
 AND EXISTS(SELECT 1 FROM events WHERE id=? AND state='approved' AND approved_revision=revision AND revision=?)
 AND (?='update' OR (SELECT count(*) FROM cycle_items WHERE cycle_id=c.id AND kind='new' AND state IN ('reserved','published'))<c.limit_count)
 ON CONFLICT(event_id) DO NOTHING`,
    )
    .bind(
      event.id,
      cycleId,
      event.related_id ? "update" : "new",
      new Date().toISOString(),
      cycleId,
      event.id,
      event.revision,
      event.related_id ? "update" : "new",
    )
    .run();
  return result.meta.changes === 1;
}
export async function stagePair(
  env: Env,
  store: Store,
  event: Event,
  cycleId: string,
) {
  if (event.state !== "approved" || event.approved_revision !== event.revision)
    throw new SafeError("approval", "Revisión no aprobada automáticamente");
  const drafts = await store.drafts(event.id);
  const en = drafts.find((d) => d.lang === "en" && d.valid)?.value,
    es = drafts.find((d) => d.lang === "es" && d.valid)?.value;
  if (!en || !es)
    throw new SafeError("translations", "Falta una traducción válida");
  const verification = event.verification
    ? JSON.parse(event.verification)
    : null;
  const reviewed =
    verification?.draftReview?.passed &&
    verification.draftReview.fingerprint ===
      (await hash(JSON.stringify([verification.essentialFacts, en, es])));
  validatePair(en, es, { numericReviewed: !!reviewed });
  if (
    (await store.settings()).value.reportingPolicy === 2 &&
    (!verification?.confirmation ||
      !en.confirmation ||
      !es.confirmation ||
      en.confirmation.status !== verification.confirmation.status ||
      es.confirmation.status !== verification.confirmation.status)
  )
    throw new SafeError(
      "confirmation_missing",
      "Revalidar el nivel de confirmación antes de publicar",
    );
  const control = await store.db
    .prepare("SELECT enabled,paused FROM automation_control WHERE id=1")
    .first<{ enabled: number; paused: number }>();
  if (!control?.enabled || control.paused)
    throw new SafeError("paused", "Automatización detenida");
  const existing = await store.db
    .prepare("SELECT * FROM cycle_items WHERE event_id=?")
    .bind(event.id)
    .first();
  if (
    existing &&
    existing.cycle_id !== cycleId &&
    existing.state === "reserved" &&
    !event.related_id &&
    !event.published_at
  ) {
    const moved = await store.db
      .prepare(
        "UPDATE cycle_items SET cycle_id=?,reserved_at=? WHERE event_id=? AND state='reserved' AND EXISTS(SELECT 1 FROM hourly_cycles WHERE id=? AND state='open') AND (SELECT count(*) FROM cycle_items WHERE cycle_id=? AND kind='new' AND state IN ('reserved','published'))<(SELECT limit_count FROM hourly_cycles WHERE id=?)",
      )
      .bind(
        cycleId,
        new Date().toISOString(),
        event.id,
        cycleId,
        cycleId,
        cycleId,
      )
      .run();
    if (!moved.meta.changes)
      throw new SafeError(
        "cycle_limit",
        "Cupo de la hora actual agotado; conservar trabajo",
      );
  }
  if (!existing && !(await reserveCycle(store, event, cycleId)))
    throw new SafeError("cycle_limit", "Límite del ciclo alcanzado");
  const now = new Date().toISOString(),
    id = event.related_id || event.id;
  const asset =
    env.IMAGES_REQUIRED === "true"
      ? await store.db
          .prepare(
            "SELECT public_path,alt_en,alt_es,credit_en,credit_es,width,height,source_url,license,creator,social_path,thumbnail_path,license_url FROM editorial_assets WHERE event_id=? AND ready=1",
          )
          .bind(id)
          .first<any>()
      : null;
  if (env.IMAGES_REQUIRED === "true" && !asset)
    throw new SafeError(
      "image_pending",
      "Noticia verificada; esperar su imagen única antes de publicar ambos idiomas",
    );
  const previous = (
    await store.db
      .prepare("SELECT value FROM public_articles WHERE translation_id=?")
      .bind(id)
      .all<{ value: string }>()
  ).results.map((r) => JSON.parse(r.value) as PreparedArticle);
  if (previous.some((a) => a.editorialRevision > event.revision))
    throw new SafeError("revision", "Ya existe una revisión posterior");
  const pair = [en, es].map((a) => {
    const prior = previous.find((p) => p.lang === a.lang);
    return {
      ...a,
      ...(a.confirmation && prior?.confirmation
        ? {
            confirmation: {
              ...a.confirmation,
              originStatus:
                prior.confirmation.originStatus ||
                (prior.confirmation.status !== "confirmed"
                  ? prior.confirmation.status
                  : a.confirmation.status),
              ...(prior.confirmation.status !== "confirmed" ||
              (prior.confirmation.originStatus &&
                prior.confirmation.originStatus !== "confirmed")
                ? {
                    initialReport:
                      prior.confirmation.initialReport ||
                      prior.confirmation.originalReport,
                  }
                : {}),
            },
          }
        : {}),
      status: "published" as const,
      translationId: id,
      publishedAt: prior?.publishedAt || now,
      ...(asset
        ? {
            image: {
              src: asset.public_path,
              alt: a.lang === "en" ? asset.alt_en : asset.alt_es,
              credit: a.lang === "en" ? asset.credit_en : asset.credit_es,
              width: asset.width,
              height: asset.height,
              sourceUrl: asset.source_url || undefined,
              license: asset.license,
              creator: asset.creator,
              licenseUrl: asset.license_url || undefined,
              ...(asset.social_path
                ? {
                    socialSrc: asset.social_path,
                    socialWidth: 1200,
                    socialHeight: 630,
                  }
                : {}),
              ...(asset.thumbnail_path
                ? {
                    srcSet:
                      asset.thumbnail_path +
                      " 768w, " +
                      asset.public_path +
                      " " +
                      asset.width +
                      "w",
                  }
                : {}),
            },
          }
        : {}),
      ...(prior ? { slug: prior.slug, updatedAt: now } : {}),
    };
  });
  validatePair(pair[0], pair[1], { numericReviewed: !!reviewed });
  const followups = [];
  if (verification?.confirmation) {
    const c = pair[0].confirmation;
    if (c && c.status !== "confirmed" && c.resolution === "pending") {
      const signature = await sourceDigest(
        (await store.sources(event.id)).filter((s) => s.accessible).slice(0, 3),
      );
      followups.push(
        store.db
          .prepare(
            "INSERT INTO report_followups(translation_id,signature,next_check,source_event_id) VALUES(?,?,?,?) ON CONFLICT(translation_id) DO UPDATE SET signature=excluded.signature,next_check=excluded.next_check,source_event_id=excluded.source_event_id,pending_event_id=NULL,last_error=NULL",
          )
          .bind(
            id,
            signature,
            new Date(Date.now() + 6 * 3600000).toISOString(),
            event.id,
          ),
      );
    } else
      followups.push(
        store.db
          .prepare("DELETE FROM report_followups WHERE translation_id=?")
          .bind(id),
      );
  }
  // One D1 transaction exposes BOTH complete languages; no build or provider call.
  await store.db.batch([
    ...followups,
    ...pair.map((a) =>
      store.db
        .prepare(
          "INSERT INTO public_articles(translation_id,lang,slug,revision,value,visible,published_at,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(translation_id,lang) DO UPDATE SET revision=excluded.revision,value=excluded.value,visible=1,updated_at=excluded.updated_at WHERE public_articles.revision<=excluded.revision",
        )
        .bind(
          id,
          a.lang,
          a.slug,
          event.revision,
          JSON.stringify(a),
          a.publishedAt,
          a.updatedAt || null,
        ),
    ),
    store.db
      .prepare(
        "UPDATE events SET state='live_pending',last_error=NULL WHERE id=? AND revision=?",
      )
      .bind(event.id, event.revision),
  ]);
  await store.history(
    "hourly-worker",
    "pair_staged",
    "Ambos idiomas almacenados y servidos; pendiente comprobar URLs",
    event.id,
  );
  return pair;
}
export async function confirmPair(env: Env, store: Store, event: Event) {
  const id = event.related_id || event.id;
  const rows = (
    await store.db
      .prepare(
        "SELECT value FROM public_articles WHERE translation_id=? AND revision=? AND visible=1",
      )
      .bind(id, event.revision)
      .all<{ value: string }>()
  ).results;
  if (rows.length !== 2) throw new SafeError("pair", "Falta el par publicado");
  for (const row of rows) {
    const article = JSON.parse(row.value) as PreparedArticle;
    let response: Response;
    try {
      response = await fetch(
        new URL(`/${article.lang}/articles/${article.slug}/`, env.SITE_URL),
        {
          redirect: "manual",
          signal: AbortSignal.timeout(20000),
          headers: {
            "Cache-Control": "no-cache",
            "User-Agent": "EconoFlux-PublicationVerifier/1.0",
          },
        },
      );
    } catch {
      throw new SafeError("public_url", "URL pública no verificable");
    }
    if (!response.ok)
      throw new SafeError("public_url", `URL pública HTTP ${response.status}`);
    const html = await bounded(response, 1000000);
    if (
      !html.includes(`name="econoflux-article-id" content="${id}"`) ||
      !html.includes(`name="econoflux-revision" content="${event.revision}"`) ||
      !html.includes(`<html lang="${article.lang}"`)
    )
      throw new SafeError(
        "public_revision",
        "La URL no muestra la revisión esperada",
      );
  }
  const now = new Date().toISOString();
  await store.db.batch([
    store.db
      .prepare(
        "UPDATE events SET state='published',published_at=coalesce(published_at,?),updated_at=?,last_error=NULL WHERE id=? AND state='live_pending'",
      )
      .bind(now, event.related_id ? now : null, event.id),
    store.db
      .prepare(
        "UPDATE cycle_items SET state='published',published_at=? WHERE event_id=? AND state='reserved'",
      )
      .bind(now, event.id),
  ]);
  await store.history(
    "hourly-worker",
    "published",
    "Una noticia completa: EN y ES verificadas en URLs públicas, sin compilación",
    event.id,
  );
  return true;
}
