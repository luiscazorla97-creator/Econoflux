import type { APIContext } from "astro";
import { academyImage } from "../../../lib/academy-image";
export const GET = (context: APIContext) => academyImage(context, "svg");
