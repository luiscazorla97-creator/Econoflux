import type { APIContext } from "astro";
export async function academyImage(context: APIContext, type: "svg" | "png") {
  const id = context.params.id || "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    return new Response("Not found", { status: 404 });
  const db = (context.locals as any).runtime?.env?.DB;
  if (!db) return new Response("Unavailable", { status: 503 });
  const row = await db
    .prepare(
      "SELECT a.svg,a.png FROM academy_assets a WHERE a.id=? AND EXISTS(SELECT 1 FROM public_guides g WHERE g.translation_id=a.id AND g.visible=1)",
    )
    .bind(id)
    .first();
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(type === "svg" ? row.svg : new Uint8Array(row.png), {
    headers: {
      "Content-Type": type === "svg" ? "image/svg+xml" : "image/png",
      "Cache-Control": "public, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
