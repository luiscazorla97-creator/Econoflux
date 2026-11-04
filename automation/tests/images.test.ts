import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { Miniflare } from "miniflare";
import { readFileSync } from "node:fs";
import { imageJobs } from "../src/images";
import { dayKey } from "../src/policy";
import type { Env } from "../src/types";
let mf: Miniflare, env: Env;
beforeEach(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default{fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "image-test" },
  });
  const db = await mf.getD1Database("DB");
  for (const f of [
    "0001_editorial.sql",
    "0002_hourly.sql",
    "0004_market_images.sql",
    "0005_licensed_assets.sql",
    "0006_social_assets.sql",
    "0007_image_licenses.sql",
    "0009_image_runtime.sql",
    "0010_image_uniqueness.sql",
  ])
    for (const sql of readFileSync("automation/migrations/" + f, "utf8")
      .replace(/--[^\n]*/g, "")
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(sql).run();
  env = {
    DB: db as any,
    SITE_URL: "https://econoflux.com",
    AI_MODEL: "gpt-5-mini",
    ECONOFLUX_OPENAI_API_KEY: "unit-test-secret",
    GITHUB_REPOSITORY: "fixture",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "econoflux",
  };
  await db
    .prepare("UPDATE automation_control SET enabled=1,paused=0 WHERE id=1")
    .run();
  await db
    .prepare(
      "UPDATE settings SET value=json_set(value,'$.dailyBudgetMicrousd',3000000,'$.dailyAICalls',160)",
    )
    .run();
  for (const lang of ["en", "es"])
    await db
      .prepare(
        "INSERT INTO public_articles(translation_id,lang,slug,revision,value,published_at) VALUES('fixture',?,'fixture',1,?,?)",
      )
      .bind(
        lang,
        JSON.stringify({
          title:
            lang === "en"
              ? "Digital euro infrastructure"
              : "Infraestructura del euro digital",
          summary: "A conceptual payment-network illustration",
          lang,
        }),
        new Date().toISOString(),
      )
      .run();
});
afterEach(async () => {
  vi.unstubAllGlobals();
  await mf.dispose();
});
async function approved() {
  await env.DB.prepare(
    "UPDATE image_control SET enabled=1,approved_at=? WHERE id=1",
  )
    .bind(new Date().toISOString())
    .run();
}
function success() {
  const bytes = new Uint8Array([
    82, 73, 70, 70, 12, 0, 0, 0, 87, 69, 66, 80, 0, 0,
  ]);
  return Response.json({
    data: [{ b64_json: Buffer.from(bytes).toString("base64") }],
    usage: { input_tokens: 100, output_tokens: 1875 },
  });
}
it("does not spend without approval or during general pause", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await imageJobs(env);
  expect(fetcher).not.toHaveBeenCalled();
  await approved();
  await env.DB.prepare(
    "UPDATE automation_control SET paused=1 WHERE id=1",
  ).run();
  await imageJobs(env);
  expect(fetcher).not.toHaveBeenCalled();
});
it("settles one shared reservation and never generates twice for a topic", async () => {
  await approved();
  const fetcher = vi.fn(async (_url: any, init: any) => {
    const request = JSON.parse(init.body);
    expect(request.model).toBe("gpt-image-1-mini");
    expect(request.quality).toBe("medium");
    expect(request.output_format).toBe("webp");
    return success();
  });
  vi.stubGlobal("fetch", fetcher);
  await imageJobs(env);
  await imageJobs(env);
  expect(fetcher).toHaveBeenCalledTimes(1);
  const usage = await env.DB.prepare(
    "SELECT ai_actual,ai_reserved,ai_calls FROM usage WHERE day=?",
  )
    .bind(dayKey(new Date()))
    .first<any>();
  expect(usage).toEqual({ ai_actual: 15200, ai_reserved: 0, ai_calls: 1 });
  const asset = await env.DB.prepare(
    "SELECT ready,alt_es,length(content_hash) hash_length FROM editorial_assets WHERE event_id='fixture'",
  ).first<any>();
  expect(asset.ready).toBe(1);
  expect(asset.alt_es).toContain("Infraestructura del euro digital");
  expect(asset.hash_length).toBe(64);
});
it("defers at the cap without disabling tomorrow or making a provider request", async () => {
  await approved();
  await env.DB.prepare("INSERT INTO usage(day,ai_actual) VALUES(?,2990000)")
    .bind(dayKey(new Date()))
    .run();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await imageJobs(env);
  expect(fetcher).not.toHaveBeenCalled();
  const control = await env.DB.prepare(
    "SELECT enabled,next_attempt FROM image_control",
  ).first<any>();
  expect(control.enabled).toBe(1);
  expect(control.next_attempt > new Date().toISOString()).toBe(true);
});
it("reports organization verification safely and releases a rejected reservation", async () => {
  await approved();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(
        { error: { message: "Your organization must be verified." } },
        { status: 403 },
      ),
    ),
  );
  await imageJobs(env);
  const config = await env.DB.prepare(
    "SELECT enabled,preflight_error FROM image_control",
  ).first<any>();
  expect(config.enabled).toBe(0);
  expect(config.preflight_error).toContain(
    "organization_verification_required",
  );
  expect(
    JSON.stringify(
      (await env.DB.prepare("SELECT detail FROM history").all()).results,
    ),
  ).not.toContain("unit-test-secret");
  expect(
    (await env.DB.prepare("SELECT ai_reserved FROM usage").first<any>())
      .ai_reserved,
  ).toBe(0);
});
it("retains uncertain billing and its durable claim after a transport interruption", async () => {
  await approved();
  const fetcher = vi.fn(async () => {
    throw Error("network timeout");
  });
  vi.stubGlobal("fetch", fetcher);
  await imageJobs(env);
  await env.DB.prepare("UPDATE image_control SET enabled=1 WHERE id=1").run();
  await imageJobs(env);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (await env.DB.prepare("SELECT ai_reserved FROM usage").first<any>())
      .ai_reserved,
  ).toBe(30000);
  expect(
    (await env.DB.prepare("SELECT ready FROM editorial_assets").first<any>())
      .ready,
  ).toBe(0);
});
it("prepares an approved reserved story’s image before the story becomes public", async () => {
  await approved();
  await env.DB.prepare(
    "INSERT INTO events(id,fingerprint,title,url,detected_at,state,selection_reason,approved_revision) VALUES('fixture','fixture','Fixture','https://example.org/fixture',?,'approved','fixture',1)",
  )
    .bind(new Date().toISOString())
    .run();
  for (const row of (
    await env.DB.prepare(
      "SELECT lang,value FROM public_articles WHERE translation_id='fixture'",
    ).all<any>()
  ).results)
    await env.DB.prepare(
      "INSERT INTO drafts(event_id,lang,revision,value,valid,updated_at) VALUES('fixture',?,1,?,1,?)",
    )
      .bind(row.lang, row.value, new Date().toISOString())
      .run();
  await env.DB.prepare(
    "DELETE FROM public_articles WHERE translation_id='fixture'",
  ).run();
  await env.DB.prepare(
    "INSERT INTO cycle_items(event_id,cycle_id,kind,state,reserved_at) VALUES('fixture','initial-once','new','reserved',?)",
  )
    .bind(new Date().toISOString())
    .run();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => success()),
  );
  await imageJobs(env);
  expect(
    (
      await env.DB.prepare(
        "SELECT ready FROM editorial_assets WHERE event_id='fixture'",
      ).first<any>()
    ).ready,
  ).toBe(1);
  expect(
    (
      await env.DB.prepare(
        "SELECT count(*) n FROM public_articles",
      ).first<any>()
    ).n,
  ).toBe(0);
});
it("prefers a rights-verified matching company logo without calling the image API", async () => {
  await approved();
  await env.DB.prepare(
    "INSERT INTO editorial_assets(id,event_id,kind,public_path,license,creator,credit_en,credit_es,alt_en,alt_es,width,height,mime,ready,created_at,subject,rights_verified_at,source_url,license_url) VALUES('licensed-logo',NULL,'licensed-logo','/images/editorial/local.webp','CC BY 3.0','Fixture company','Fixture company','Empresa de prueba','Official logo','Logotipo oficial',1200,630,'image/webp',1,?,'Digital euro',?,'https://example.org/press/logo','https://creativecommons.org/licenses/by/3.0/')",
  )
    .bind(new Date().toISOString(), new Date().toISOString())
    .run();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  await imageJobs(env);
  expect(fetcher).not.toHaveBeenCalled();
  expect(
    (
      await env.DB.prepare(
        "SELECT event_id FROM editorial_assets WHERE id='licensed-logo'",
      ).first<any>()
    )?.event_id,
  ).toBe("fixture");
  expect(
    (await env.DB.prepare("SELECT count(*) n FROM usage").first<any>())?.n,
  ).toBe(0);
});
