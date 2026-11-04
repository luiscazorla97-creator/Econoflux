import type { APIContext } from "astro";
export async function marketEditionAsset(
  context: APIContext,
  type: "png" | "svg" | "json",
) {
  const id = context.params.id || "";
  if (!/^market-\d{4}-\d{2}-\d{2}-[123]$/.test(id))
    return new Response("Not found", { status: 404 });
  const db = (context.locals as any).runtime?.env?.DB;
  if (!db) return new Response("Unavailable", { status: 503 });
  const row = await db
    .prepare(
      "SELECT e.snapshot,a.svg,a.png FROM market_editions e JOIN market_edition_assets a ON a.id=e.id WHERE e.id=? AND e.state='published' AND EXISTS(SELECT 1 FROM public_articles p WHERE p.translation_id=e.id AND p.visible=1)",
    )
    .bind(id)
    .first();
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(
    type === "png"
      ? new Uint8Array(row.png)
      : type === "svg"
        ? row.svg
        : row.snapshot,
    {
      headers: {
        "Content-Type":
          type === "png"
            ? "image/png"
            : type === "svg"
              ? "image/svg+xml"
              : "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
        "Content-Security-Policy":
          "default-src 'none'; style-src 'unsafe-inline'",
      },
    },
  );
}
