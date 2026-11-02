import { defineMiddleware } from "astro:middleware";
import { preview } from "./content/articles";
export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (preview) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
