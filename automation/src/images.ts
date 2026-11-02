import type { Env } from "./types";
import { Store } from "./store";
import { hash, dayEnd } from "./policy";
import { SafeError } from "./types";
import { bounded } from "./providers";
export function matchesAssetSubject(subject: string, text: string) {
  const escaped = subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("\\b" + escaped + "\\b(?!\\s+(?:Jr|Junior)\\b)", "i").test(
    text,
  );
}
// Owner-approved image model, sharing the existing hard daily AI cap.
export async function imageJobs(env: Env) {
  const config = await env.DB.prepare(
    "SELECT * FROM image_control WHERE id=1",
  ).first<any>();
  if (config?.next_attempt && config.next_attempt > new Date().toISOString())
    return;
  const control = await env.DB.prepare(
    "SELECT enabled,paused FROM automation_control WHERE id=1",
  ).first<any>();
  if (!control?.enabled || control.paused) return;
  if (config?.preflight_requested) {
    await env.DB.prepare(
      "UPDATE image_control SET preflight_requested=0 WHERE id=1",
    ).run();
    try {
      const response = await fetch(
        "https://api.openai.com/v1/models/gpt-image-1-mini",
        {
          headers: { Authorization: "Bearer " + env.ECONOFLUX_OPENAI_API_KEY },
          redirect: "manual",
          signal: AbortSignal.timeout(15000),
        },
      );
      const data = response.ok ? ((await response.json()) as any) : null;
      if (!response.ok || data?.id !== "gpt-image-1-mini")
        throw new Error("Image model access HTTP " + response.status);
      await env.DB.prepare(
        "UPDATE image_control SET preflight_at=?,preflight_error=NULL WHERE id=1",
      )
        .bind(new Date().toISOString())
        .run();
    } catch (error) {
      await env.DB.prepare(
        "UPDATE image_control SET preflight_error=? WHERE id=1",
      )
        .bind(
          error instanceof Error &&
            error.message.startsWith("Image model access")
            ? error.message
            : "No se pudo verificar acceso al modelo de imágenes",
        )
        .run();
    }
  }

  const store = new Store(env.DB),
    owner = crypto.randomUUID();
  if (!(await store.lock("image-worker", owner, new Date(), 5))) return;
  let day: string | undefined;
  try {
    const row =
      (await env.DB.prepare(
        "SELECT coalesce(e.related_id,e.id) translation_id,e.id draft_event_id,d.value FROM events e JOIN cycle_items c ON c.event_id=e.id AND c.state='reserved' JOIN drafts d ON d.event_id=e.id AND d.lang='en' AND d.valid=1 AND d.revision=e.revision WHERE e.state='approved' AND e.approved_revision=e.revision AND NOT EXISTS(SELECT 1 FROM editorial_assets a WHERE a.event_id=coalesce(e.related_id,e.id)) ORDER BY e.importance DESC,e.event_at DESC LIMIT 1",
      ).first<{
        translation_id: string;
        value: string;
        draft_event_id?: string;
      }>()) ||
      (await env.DB.prepare(
        "SELECT p.translation_id,p.value FROM public_articles p WHERE p.visible=1 AND p.lang='en' AND NOT EXISTS(SELECT 1 FROM editorial_assets a WHERE a.event_id=p.translation_id) ORDER BY p.published_at DESC LIMIT 1",
      ).first<{ translation_id: string; value: string }>());
    if (!row) return;
    const article = JSON.parse(row.value);
    const licensed = await env.DB.prepare(
      "SELECT id,subject FROM editorial_assets WHERE event_id IS NULL AND ready=1 AND kind='licensed-photo' AND rights_verified_at IS NOT NULL AND source_url IS NOT NULL AND subject IS NOT NULL LIMIT 30",
    ).all<{ id: string; subject: string }>();
    const matching = licensed.results.find((asset) =>
      matchesAssetSubject(asset.subject, article.title + " " + article.summary),
    );
    if (matching) {
      await env.DB.prepare(
        "UPDATE editorial_assets SET event_id=? WHERE id=? AND event_id IS NULL",
      )
        .bind(row.translation_id, matching.id)
        .run();
      return;
    }
    if (!config?.enabled || !config.approved_at) return;
    if (
      config.model !== "gpt-image-1-mini" ||
      config.quality !== "medium" ||
      config.size !== "1536x1024"
    )
      throw new Error("Modelo o tarifa de imágenes sin aprobar");
    const settings = (await store.settings()).value;
    // Conservative reservation includes output and text prompt. Unknown final
    // usage remains reserved instead of undercounting the shared $3 cap.
    day = await store.charge(
      "ai_calls",
      settings.dailyAICalls,
      new Date(),
      30000,
      settings.dailyBudgetMicrousd,
    );
    const prompt = (
      "Original premium conceptual 3D editorial illustration for EconoFlux. Graphite black and restrained metallic gold, realistic studio materials, subject-specific composition, no text, digits or price charts, no documentary event photography, no fake photographs of real people. Make the illustration distinct. Topic: " +
      article.title +
      ". Context: " +
      article.summary +
      ". No generic gold cubes or unrelated Bitcoin coins. Keep the subject near the center for social-card cropping. Use a distinct camera and composition. No official seals, institutional emblems, company wordmarks, signs or words; use unlabeled legal or financial objects. Currency symbols and crypto network icons are allowed only when relevant."
    ).slice(0, 1800);
    const id = (await hash(row.translation_id + prompt)).slice(0, 32);
    const spanish =
      (await env.DB.prepare(
        "SELECT json_extract(value,'$.title') title FROM public_articles WHERE translation_id=? AND lang='es'",
      )
        .bind(row.translation_id)
        .first<{ title: string }>()) ||
      (await env.DB.prepare(
        "SELECT json_extract(value,'$.title') title FROM drafts WHERE event_id=? AND lang='es' AND valid=1",
      )
        .bind((row as any).draft_event_id || row.translation_id)
        .first<{ title: string }>());
    // A durable claim prevents a second billable request after an uncertain crash.
    await env.DB.prepare(
      "INSERT INTO editorial_assets(id,event_id,kind,public_path,license,creator,credit_en,credit_es,alt_en,alt_es,width,height,mime,ready,created_at) VALUES(?,?,'ai-illustration',?,'Original AI illustration; OpenAI terms apply','EconoFlux / gpt-image-1-mini','EconoFlux · AI-generated conceptual illustration','EconoFlux · Ilustración conceptual generada con IA',?,?,1536,1024,'image/webp',0,?)",
    )
      .bind(
        id,
        row.translation_id,
        `/images/editorial/${id}.webp`,
        "Conceptual 3D illustration: " + article.title,
        "Ilustración conceptual 3D: " +
          (spanish?.title || "finanzas digitales"),
        new Date().toISOString(),
      )
      .run();
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.ECONOFLUX_OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          prompt,
          n: 1,
          size: config.size,
          quality: config.quality,
          output_format: "webp",
          output_compression: 80,
          safety_identifier: await hash("econoflux-editorial"),
        }),
        redirect: "manual",
        signal: AbortSignal.timeout(120000),
      },
    );
    if (!response.ok) {
      const diagnostic = (await bounded(response, 12000)).toLowerCase();
      const reason =
        /organi[sz]ation.{0,100}verif|verif.{0,60}organi[sz]ation/.test(
          diagnostic,
        )
          ? "organization_verification_required"
          : /insufficient_quota|billing|credit/.test(diagnostic)
            ? "insufficient_quota"
            : /rate.limit/.test(diagnostic)
              ? "rate_limit_exceeded"
              : /model_not_found/.test(diagnostic)
                ? "model_not_found"
                : "provider_rejected";
      await store.settle(day, 30000, 0);
      day = undefined;
      await env.DB.prepare(
        "DELETE FROM editorial_assets WHERE id=? AND ready=0",
      )
        .bind(id)
        .run();
      if (
        response.status >= 500 ||
        (response.status === 429 && reason === "rate_limit_exceeded")
      ) {
        await env.DB.prepare(
          "UPDATE image_control SET next_attempt=?,preflight_error=? WHERE id=1",
        )
          .bind(
            new Date(Date.now() + 15 * 60000).toISOString(),
            `Image generation HTTP ${response.status} (${reason}); reintento limitado en 15 minutos`,
          )
          .run();
        return;
      }
      throw new Error(`Image generation HTTP ${response.status} (${reason})`);
    }
    const result = JSON.parse(await bounded(response, 2400000)) as any;
    const usage = result.usage;
    if (
      Number.isFinite(usage?.input_tokens) &&
      Number.isFinite(usage?.output_tokens)
    ) {
      // Official gpt-image-1-mini pricing: $2/M text input, $8/M image output.
      // This request contains text only; cached-input discounts are conservatively ignored.
      // Keep a $0.015 output floor from the published medium-landscape estimate.
      const actual = Math.ceil(
        usage.input_tokens * 2 + Math.max(15000, usage.output_tokens * 8),
      );
      await store.settle(day, 30000, actual);
      day = undefined;
      await env.DB.prepare(
        "UPDATE image_control SET last_cost_microusd=? WHERE id=1",
      )
        .bind(actual)
        .run();
    }
    const encoded = result.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || encoded.length > 1800000)
      throw new Error("Respuesta de imagen inválida o demasiado grande");
    const body = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    if (new TextDecoder().decode(body.slice(8, 12)) !== "WEBP")
      throw new Error("Formato de imagen incorrecto");
    await env.DB.prepare(
      "UPDATE editorial_assets SET source_url=?,body=?,content_hash=?,ready=1 WHERE id=? AND ready=0",
    )
      .bind(
        "https://openai.com/policies/terms-of-use/",
        body,
        [...new Uint8Array(await crypto.subtle.digest("SHA-256", body))]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(""),
        id,
      )
      .run();
    await env.DB.prepare(
      "UPDATE image_control SET last_success_at=?,preflight_error=NULL,next_attempt='' WHERE id=1",
    )
      .bind(new Date().toISOString())
      .run();
    await store.history(
      "image-worker",
      "image_ready",
      JSON.stringify({
        eventId: row.translation_id,
        asset: id,
        bytes: body.length,
      }),
    );
  } catch (error) {
    if (error instanceof SafeError && error.code === "budget") {
      await env.DB.prepare(
        "UPDATE image_control SET next_attempt=?,preflight_error='Presupuesto compartido agotado; posponer imágenes hasta el siguiente día editorial' WHERE id=1",
      )
        .bind(dayEnd(new Date()).toISOString())
        .run();
      return;
    }
    await store.history(
      "image-worker",
      "image_pending",
      error instanceof Error &&
        /^(Image generation HTTP|Modelo o tarifa)/.test(error.message)
        ? error.message
        : "Imagen específica pendiente; no interrumpir publicación de noticias",
    );
    // Backoff prevents spending on a broken image API every minute.
    await env.DB.prepare(
      "UPDATE image_control SET enabled=0,preflight_error=? WHERE id=1",
    )
      .bind(
        error instanceof Error && /^Image generation HTTP/.test(error.message)
          ? error.message
          : "Generación detenida; solicitud incierta conservada para evitar cobros duplicados",
      )
      .run();
  } finally {
    await store.unlock("image-worker", owner);
  }
}
