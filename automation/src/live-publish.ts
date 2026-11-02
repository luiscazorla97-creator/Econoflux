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
  const control = await store.db
    .prepare("SELECT enabled,paused FROM automation_control WHERE id=1")
    .first<{ enabled: number; paused: number }>();
  if (!control?.enabled || control.paused)
    throw new SafeError("paused", "Automatización detenida");
  const existing = await store.db
    .prepare("SELECT * FROM cycle_items WHERE event_id=?")
    .bind(event.id)
    .first();
  if (!existing && !(await reserveCycle(store, event, cycleId)))
    throw new SafeError("cycle_limit", "Límite del ciclo alcanzado");
  const now = new Date().toISOString(),
    id = event.related_id || event.id;
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
      status: "published" as const,
      translationId: id,
      publishedAt: prior?.publishedAt || now,
      ...(prior ? { slug: prior.slug, updatedAt: now } : {}),
    };
  });
  validatePair(pair[0], pair[1], { numericReviewed: !!reviewed });
  // One D1 transaction exposes BOTH complete languages; no build or provider call.
  await store.db.batch([
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
