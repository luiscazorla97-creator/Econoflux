import type { APIContext } from "astro";
import { marketSnapshot } from "../../lib/market";
export async function GET(context: APIContext) {
  const snapshot = await marketSnapshot(context.locals);
  const quotes=snapshot?.value?JSON.parse(snapshot.value):[];
  return Response.json(
    {
      quotes,
      fetchedAt: snapshot?.updated_at || null,
      stale: !!snapshot?.last_error || quotes.some((q:{updatedAt:string})=>Date.now()-Date.parse(q.updatedAt)>15*60000),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
        "X-Robots-Tag": "noindex",
      },
    },
  );
}
