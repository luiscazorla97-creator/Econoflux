import type { APIContext } from "astro";
export async function GET(context: APIContext) {
  if (!/^[a-f0-9]{32}$/.test(context.params.id || ""))
    return new Response("Not found", { status: 404 });
  const db = (context.locals as any).runtime?.env?.DB;
  const asset = await db
    ?.prepare(
      "SELECT body,mime FROM editorial_assets WHERE id=? AND ready=1 AND body IS NOT NULL",
    )
    .bind(context.params.id)
    .first();
  if (!asset) return new Response("Not found", { status: 404 });
  const bytes =
    asset.body instanceof ArrayBuffer ? asset.body : new Uint8Array(asset.body);
  return new Response(bytes, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public,max-age=31536000,immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
