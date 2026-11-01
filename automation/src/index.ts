import { authorize, validMutation } from "./auth";
import { Store } from "./store";
import { readiness, tick } from "./engine";
import { panel, css, js } from "./panel";
import { hash, publicURL, validatePair, sufficient } from "./policy";
import { SafeError, type Env, type Verification } from "./types";
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
export async function handle(request: Request, env: Env) {
  const url = new URL(request.url);
  if (url.pathname === "/health")
    return json({
      service: "EconoFlux editorial",
      configured: !!env.DB && !!env.CF_ACCESS_AUD,
      automation: "not disclosed",
    });
  const actor = await authorize(request, env);
  if (!actor)
    return json(
      {
        message:
          "Acceso cerrado. Configura Cloudflare Access y un administrador autorizado.",
      },
      403,
    );
  if (!env.DB) return json({ message: "Base editorial no configurada." }, 503);
  if (!["GET", "POST"].includes(request.method))
    return json({ message: "Método no admitido" }, 405);
  if (request.method === "POST" && !validMutation(request))
    return json({ message: "Origen o tipo de contenido inválido" }, 403);
  try {
    if (url.pathname === "/admin" || url.pathname === "/")
      return new Response(panel, {
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    if (url.pathname === "/panel.js")
      return new Response(js, {
        headers: {
          ...headers,
          "Content-Type": "text/javascript; charset=utf-8",
        },
      });
    if (url.pathname === "/panel.css")
      return new Response(css, {
        headers: { ...headers, "Content-Type": "text/css; charset=utf-8" },
      });
    const store = new Store(env.DB);
    if (url.pathname === "/api/status" && request.method === "GET")
      return json({ ...(await store.status()), readiness: readiness(env) });
    const match = url.pathname.match(/^\/api\/events\/([a-f0-9]{24})$/);
    if (match) {
      const event = await store.event(match[1]);
      if (!event) return json({ message: "Trabajo no encontrado" }, 404);
      if (request.method === "GET")
        return json({
          event,
          sources: await store.sources(event.id),
          drafts: await store.drafts(event.id),
        });
      const body = await readBody(request);
      if (body.revision !== event.revision)
        throw new SafeError(
          "conflict",
          "La revisión cambió; recarga el borrador",
        );
      if (["published", "deploying"].includes(event.state))
        throw new SafeError(
          "immutable",
          "El trabajo está publicado o desplegándose; crea una actualización o concilia el despliegue",
        );
      const note = String(body.note || "").slice(0, 2000);
      switch (body.action) {
        case "approve": {
          const drafts = await store.drafts(event.id);
          const en = drafts.find((d) => d.lang === "en" && d.valid)?.value,
            es = drafts.find((d) => d.lang === "es" && d.valid)?.value;
          if (!en || !es || !event.verified_at || !event.verification)
            throw new SafeError(
              "verification",
              "Faltan ambas versiones o la verificación",
            );
          validatePair(en, es);
          const v = JSON.parse(event.verification) as Verification,
            sources = await store.sources(event.id);
          if (
            !sufficient(
              v,
              new Set(sources.filter((s) => s.accessible).map((s) => s.id)),
              new Set(
                sources
                  .filter((s) => s.accessible && s.primary_source)
                  .map((s) => s.url),
              ),
            )
          )
            throw new SafeError(
              "verification",
              "Hechos insuficientemente verificados",
            );
          await store.db
            .prepare(
              "UPDATE events SET state='approved',approved_by=?,approved_revision=revision WHERE id=?",
            )
            .bind(actor, event.id)
            .run();
          break;
        }
        case "reject":
          if (!note) throw new SafeError("reason", "Indica el motivo");
          await store.state(event.id, "rejected", note);
          await store.release(event.id);
          break;
        case "corrections":
          if (!note)
            throw new SafeError("reason", "Indica qué hay que corregir");
          await store.db.batch([
            store.db
              .prepare(
                "UPDATE events SET state='detected',revision=revision+1,approved_revision=NULL,last_error=?,verification=NULL,verified_at=NULL WHERE id=?",
              )
              .bind(note, event.id),
            store.db
              .prepare("DELETE FROM drafts WHERE event_id=?")
              .bind(event.id),
          ]);
          break;
        case "recheck":
          await store.db.batch([
            store.db
              .prepare(
                "UPDATE events SET state='detected',verified_at=NULL,verification=NULL,approved_revision=NULL,revision=revision+1 WHERE id=?",
              )
              .bind(event.id),
            store.db
              .prepare("UPDATE sources SET fetched_at=NULL WHERE event_id=?")
              .bind(event.id),
            store.db
              .prepare("DELETE FROM drafts WHERE event_id=?")
              .bind(event.id),
          ]);
          break;
        case "add-source": {
          const sourceURL = publicURL(String(body.url));
          const n = await store.db
            .prepare("SELECT count(*) AS n FROM sources WHERE event_id=?")
            .bind(event.id)
            .first<{ n: number }>();
          if ((n?.n || 0) >= 5)
            throw new SafeError("sources", "Máximo cinco fuentes por trabajo");
          await store.db.batch([
            store.db
              .prepare(
                "INSERT INTO sources(id,event_id,url,publisher) VALUES(?,?,?,?) ON CONFLICT DO NOTHING",
              )
              .bind(
                (await hash(event.id + sourceURL)).slice(0, 24),
                event.id,
                sourceURL,
                new URL(sourceURL).hostname,
              ),
            store.db
              .prepare(
                "UPDATE events SET state='detected',verification=NULL,verified_at=NULL,approved_revision=NULL WHERE id=?",
              )
              .bind(event.id),
            store.db
              .prepare("UPDATE drafts SET valid=0 WHERE event_id=?")
              .bind(event.id),
          ]);
          break;
        }
        case "update-of": {
          const prior = await store.event(String(body.relatedId));
          if (!prior || prior.state !== "published" || prior.id === event.id)
            throw new SafeError(
              "update",
              "Selecciona un artículo publicado válido",
            );
          await store.db.batch([
            store.db
              .prepare(
                "UPDATE events SET related_id=?,revision=?,published_at=?,state='detected',approved_revision=NULL,verification=NULL,verified_at=NULL WHERE id=?",
              )
              .bind(
                prior.related_id || prior.id,
                prior.revision + 1,
                prior.published_at,
                event.id,
              ),
            store.db
              .prepare("DELETE FROM drafts WHERE event_id=?")
              .bind(event.id),
          ]);
          break;
        }
        case "retry-deploy":
          if (event.state !== "deployment_failed")
            throw new SafeError(
              "deploy",
              "Solo se reintentan compilaciones fallidas",
            );
          await store.state(event.id, "approved");
          break;
        default:
          throw new SafeError("action", "Acción inválida");
      }
      await store.history(actor, String(body.action), note, event.id);
      return json({ saved: true });
    }
    if (url.pathname === "/api/settings" && request.method === "POST") {
      const body = await readBody(request),
        current = await store.settings();
      if (
        body.value?.enabled &&
        body.value?.mode === "active" &&
        (!current.value.enabled || current.value.mode !== "active")
      ) {
        if (body.activationPhrase !== "ACTIVAR PUBLICACIÓN REAL")
          throw new SafeError(
            "activation",
            "Se requiere confirmación expresa de publicación real",
          );
        const missing = Object.entries(readiness(env))
          .filter(([, ready]) => !ready)
          .map(([key]) => key);
        if (missing.length)
          throw new SafeError(
            "readiness",
            "Falta configurar: " + missing.join(", "),
          );
      }
      return json(await store.updateSettings(body.value, body.version, actor));
    }
    if (url.pathname === "/api/pause" && request.method === "POST") {
      const current = await store.settings();
      return json(
        await store.updateSettings(
          { ...current.value, paused: true },
          current.version,
          actor,
        ),
      );
    }
    if (url.pathname === "/api/manual" && request.method === "POST") {
      const body = await readBody(request);
      return json(await tick(env, { manual: true, live: body.live === true }));
    }
    return json({ message: "Ruta no encontrada" }, 404);
  } catch (error) {
    return error instanceof SafeError
      ? json(
          { code: error.code, message: error.message },
          error.code === "conflict" ? 409 : 400,
        )
      : json(
          { message: "Error interno; no se exponen detalles ni credenciales" },
          500,
        );
  }
}
async function readBody(request: Request) {
  const bytes = await request.text();
  if (bytes.length > 30000)
    throw new SafeError("size", "Petición demasiado grande");
  try {
    return JSON.parse(bytes);
  } catch {
    throw new SafeError("json", "JSON inválido");
  }
}
export default {
  fetch: handle,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    if (!env.DB) return;
    ctx.waitUntil(tick(env));
  },
};
