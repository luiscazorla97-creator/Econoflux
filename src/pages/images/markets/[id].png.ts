import type { APIContext } from "astro";
import { marketEditionAsset } from "../../../lib/market-edition";
export const GET = (context: APIContext) => marketEditionAsset(context, "png");
