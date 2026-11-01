import { Store } from "./store";
import { validatePair, dayKey } from "./policy";
import { bounded } from "./providers";
import {
  SafeError,
  type Env,
  type Event,
  type Settings,
  type PreparedArticle,
} from "./types";
async function api(url: string, token: string, init: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "EconoFlux-editorial",
        ...init.headers,
      },
    });
  } catch {
    throw new SafeError(
      "publish_network",
      "No se pudo consultar el servicio de publicación",
    );
  }
  if (!response.ok)
    throw new SafeError(
      "publish_http",
      `Servicio de publicación HTTP ${response.status}`,
    );
  try {
    return JSON.parse(await bounded(response, 2000000));
  } catch {
    throw new SafeError(
      "publish_response",
      "Respuesta de publicación inválida",
    );
  }
}
const decode = (s: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(s.replace(/\s/g, "")), (c) => c.charCodeAt(0)),
  );
const encode = (s: string) => {
  const bytes = new TextEncoder().encode(s);
  let b = "";
  for (const byte of bytes) b += String.fromCharCode(byte);
  return btoa(b);
};
function gitURL(env: Env) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY))
    throw new SafeError("repository", "Repositorio inválido");
  return "https://api.github.com/repos/" + env.GITHUB_REPOSITORY;
}
function cfURL(env: Env) {
  if (!/^[a-f0-9]{32}$/.test(env.CLOUDFLARE_ACCOUNT_ID || ""))
    throw new SafeError("account", "Falta la cuenta Cloudflare del Worker");
  return `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/pages/projects/${env.PAGES_PROJECT}`;
}
export async function startPublication(
  env: Env,
  store: Store,
  s: Settings,
  event: Event,
  now = new Date(),
) {
  if (!env.GITHUB_TOKEN || !env.CLOUDFLARE_API_TOKEN)
    throw new SafeError(
      "publish_secrets",
      "Faltan GITHUB_TOKEN o CLOUDFLARE_API_TOKEN en el Worker",
    );
  const drafts = await store.drafts(event.id);
  const en = drafts.find((d) => d.lang === "en" && d.valid)?.value,
    es = drafts.find((d) => d.lang === "es" && d.valid)?.value;
  if (!en || !es)
    throw new SafeError("translations", "Falta una versión válida");
  validatePair(en, es);
  if (event.approved_revision !== event.revision)
    throw new SafeError("approval", "La revisión actual no está aprobada");
  if (!(await store.reserve(event, now)))
    throw new SafeError("capacity", "Pausa o capacidad diaria agotada");
  try {
    await store.charge("builds", s.dailyBuilds, now);
    const base = gitURL(env),
      path = "/contents/src/content/published.json";
    const token = env.GITHUB_TOKEN;
    const current = await api(
      base + path + "?ref=" + encodeURIComponent(env.GITHUB_BRANCH),
      token,
    );
    let all: PreparedArticle[];
    try {
      all = JSON.parse(decode(current.content));
      if (!Array.isArray(all)) throw 0;
    } catch {
      throw new SafeError(
        "content",
        "El archivo de publicaciones de GitHub no es válido",
      );
    }
    const id = event.related_id || event.id;
    const previous = all.filter((a) => a.translationId === id);
    // Updates retain original dates and slugs, never masquerade as new articles.
    const pair = [en, es].map((a) => {
      const old = previous.find((o) => o.lang === a.lang);
      return {
        ...a,
        status: "published" as const,
        publishedAt: old?.publishedAt || now.toISOString(),
        ...(old ? { slug: old.slug, updatedAt: now.toISOString() } : {}),
        editorialRevision: event.revision,
      };
    });
    validatePair(pair[0], pair[1]);
    let sha: string;
    if (
      previous.length === 2 &&
      previous.every((a) => a.editorialRevision === event.revision)
    )
      sha = (
        await api(
          base + "/commits/" + encodeURIComponent(env.GITHUB_BRANCH),
          token,
        )
      ).sha;
    else {
      if (previous.some((a) => a.editorialRevision > event.revision))
        throw new SafeError(
          "stale_revision",
          "Ya existe una revisión posterior",
        );
      all = all.filter((a) => a.translationId !== id).concat(pair);
      const commit = await api(base + path, token, {
        method: "PUT",
        body: JSON.stringify({
          message: `Publish EconoFlux bilingual article ${id} revision ${event.revision}`,
          content: encode(JSON.stringify(all, null, 2) + "\n"),
          sha: current.sha,
          branch: env.GITHUB_BRANCH,
        }),
      });
      sha = commit.commit.sha;
    }
    await store.db
      .prepare(
        "UPDATE events SET state='deploying',commit_sha=?,last_error=NULL WHERE id=?",
      )
      .bind(sha, event.id)
      .run();
    // Use a Git-origin Pages project; never upload a bundle or create Direct Upload.
    const project = await api(cfURL(env), env.CLOUDFLARE_API_TOKEN);
    if (project.result?.source?.type !== "github")
      throw new SafeError(
        "git_integration",
        "Pages debe conservar la integración GitHub",
      );
    const existing = await api(
      cfURL(env) + "/deployments",
      env.CLOUDFLARE_API_TOKEN,
    );
    let deployment = existing.result?.find(
      (d: any) => d.deployment_trigger?.metadata?.commit_hash === sha,
    );
    if (
      deployment &&
      ["failure", "canceled"].includes(deployment.latest_stage?.status)
    )
      deployment = (
        await api(
          cfURL(env) + "/deployments/" + deployment.id + "/retry",
          env.CLOUDFLARE_API_TOKEN,
          { method: "POST" },
        )
      ).result;
    if (!deployment) {
      const form = new FormData();
      form.set("branch", env.GITHUB_BRANCH);
      const response = await fetch(cfURL(env) + "/deployments", {
        method: "POST",
        headers: { Authorization: "Bearer " + env.CLOUDFLARE_API_TOKEN },
        body: form,
        redirect: "error",
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok)
        throw new SafeError("deploy", "No se pudo iniciar la compilación Git");
      deployment = JSON.parse(await bounded(response)).result;
    }
    if (!deployment?.id)
      throw new SafeError("deploy", "Despliegue sin identificador");
    await store.db
      .prepare("UPDATE events SET deployment_id=? WHERE id=?")
      .bind(deployment.id, event.id)
      .run();
    await store.history(
      "worker",
      "deployment_started",
      "Compilación Git iniciada; aún no contabilizada como publicación",
      event.id,
    );
  } catch (error) {
    const latest = await store.event(event.id);
    if (!latest?.commit_sha) {
      await store.release(event.id);
      await store.state(
        event.id,
        "approved",
        "Fallo antes del commit; capacidad liberada",
      );
    } else {
      await store.state(
        event.id,
        "deploying",
        "Commit creado; se conserva la reserva hasta verificar o conciliar el despliegue",
      );
    }
    throw error;
  }
}
export async function reconcile(env: Env, store: Store, event: Event) {
  if (!env.CLOUDFLARE_API_TOKEN || !event.commit_sha)
    throw new SafeError("reconcile", "Falta configuración para conciliar");
  let id = event.deployment_id;
  if (!id) {
    const list = await api(
      cfURL(env) + "/deployments",
      env.CLOUDFLARE_API_TOKEN,
    );
    id = list.result?.find(
      (d: any) =>
        d.deployment_trigger?.metadata?.commit_hash === event.commit_sha,
    )?.id;
    if (!id)
      throw new SafeError(
        "deploy_pending",
        "Commit pendiente de una compilación; reserva conservada",
      );
    await store.db
      .prepare("UPDATE events SET deployment_id=? WHERE id=?")
      .bind(id, event.id)
      .run();
  }
  const response = await api(
    cfURL(env) + "/deployments/" + id,
    env.CLOUDFLARE_API_TOKEN,
  );
  const d = response.result;
  if (
    d.latest_stage?.status === "failure" ||
    d.latest_stage?.status === "canceled"
  ) {
    await store.state(
      event.id,
      "deployment_failed",
      "Cloudflare no publicó la compilación; la reserva permanece retenida hasta reintentar",
    );
    return false;
  }
  if (d.latest_stage?.name !== "deploy" || d.latest_stage?.status !== "success")
    return false;
  const drafts = await store.drafts(event.id);
  if (drafts.length !== 2)
    throw new SafeError("pair", "Faltan versiones guardadas");
  for (const { value: a } of drafts) {
    const url = new URL(`/${a.lang}/articles/${a.slug}/`, env.SITE_URL);
    const r = await fetch(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { "Cache-Control": "no-cache" },
    });
    if (!r.ok)
      throw new SafeError(
        "url_verification",
        "Una URL final no está disponible; noticia aún no completada",
      );
    const text = await bounded(r, 1000000);
    if (
      !text.includes(
        `name="econoflux-article-id" content="${a.translationId}"`,
      ) ||
      !text.includes(`name="econoflux-revision" content="${event.revision}"`) ||
      !text.includes(`<html lang="${a.lang}"`)
    )
      throw new SafeError(
        "url_revision",
        "Una URL no contiene la revisión o el idioma esperado",
      );
  }
  const now = new Date().toISOString();
  await store.db.batch([
    store.db
      .prepare(
        "UPDATE events SET state='published',published_at=coalesce(published_at,?),updated_at=?,last_error=NULL WHERE id=? AND state='deploying'",
      )
      .bind(now, event.related_id ? now : null, event.id),
    store.db
      .prepare(
        "UPDATE reservations SET state='published',day=? WHERE event_id=? AND state='reserved'",
      )
      .bind(dayKey(new Date()), event.id),
    store.db.prepare("UPDATE runtime SET last_error=NULL WHERE id=1"),
  ]);
  await store.history(
    "worker",
    "published",
    "Ambas URLs verificadas; una noticia bilingüe completada",
    event.id,
  );
  return true;
}
