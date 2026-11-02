import type { Env } from "./types";
import { Store } from "./store";
import { hash } from "./policy";
// Disabled until the owner approves the documented image model/cost. No new service.
export async function imageJobs(env: Env) {
  const config = await env.DB.prepare(
    "SELECT * FROM image_control WHERE id=1",
  ).first<any>();
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
  try {
    const row = await env.DB.prepare(
      "SELECT p.translation_id,p.value FROM public_articles p WHERE p.visible=1 AND p.lang='en' AND NOT EXISTS(SELECT 1 FROM editorial_assets a WHERE a.event_id=p.translation_id) ORDER BY p.published_at DESC LIMIT 1",
    ).first<{ translation_id: string; value: string }>();
    if (!row) return;
    const article = JSON.parse(row.value);
    const licensed = await env.DB.prepare(
      "SELECT id,subject FROM editorial_assets WHERE event_id IS NULL AND ready=1 AND kind='licensed-photo' AND rights_verified_at IS NOT NULL AND source_url IS NOT NULL AND subject IS NOT NULL LIMIT 30",
    ).all<{ id: string; subject: string }>();
    const matching = licensed.results.find((asset) =>
      article.title.toLowerCase().includes(asset.subject.toLowerCase()),
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
    await store.charge(
      "ai_calls",
      settings.dailyAICalls,
      new Date(),
      30000,
      settings.dailyBudgetMicrousd,
    );
    const prompt = (
      "Original premium conceptual 3D editorial illustration for EconoFlux. Graphite black and restrained metallic gold, realistic studio materials, subject-specific composition, no text, digits or price charts, no documentary event photography, no fake photographs of real people. Make the illustration distinct. Topic: " +
      article.title
    ).slice(0, 1800);
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
    if (!response.ok)
      throw new Error("Image generation HTTP " + response.status);
    const result = (await response.json()) as any;
    const encoded = result.data?.[0]?.b64_json;
    if (typeof encoded !== "string" || encoded.length > 1800000)
      throw new Error("Respuesta de imagen inválida o demasiado grande");
    const body = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    if (new TextDecoder().decode(body.slice(8, 12)) !== "WEBP")
      throw new Error("Formato de imagen incorrecto");
    const id = (await hash(row.translation_id + prompt)).slice(0, 32);
    await env.DB.prepare(
      "INSERT INTO editorial_assets(id,event_id,kind,public_path,source_url,license,creator,credit_en,credit_es,alt_en,alt_es,width,height,mime,body,ready,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)",
    )
      .bind(
        id,
        row.translation_id,
        "ai-illustration",
        `/images/editorial/${id}.webp`,
        "https://openai.com/policies/terms-of-use/",
        "Original AI illustration; OpenAI terms apply",
        "EconoFlux / gpt-image-1-mini",
        "EconoFlux · AI-generated conceptual illustration",
        "EconoFlux · Ilustración conceptual generada con IA",
        "Conceptual 3D editorial illustration about " + article.title,
        "Ilustración conceptual 3D sobre finanzas digitales",
        1536,
        1024,
        "image/webp",
        body,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
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
      "UPDATE image_control SET enabled=0,preflight_error='Generación detenida tras un error; revisar antes de reactivar' WHERE id=1",
    ).run();
  } finally {
    await store.unlock("image-worker", owner);
  }
}
