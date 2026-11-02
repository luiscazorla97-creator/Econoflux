import { defineMiddleware } from "astro:middleware";
import { isIndexableSite, launchEnabled, SITE_ORIGIN } from "./lib/site";
export const onRequest = defineMiddleware(async (context, next) => {
  if (
    launchEnabled(context.locals) &&
    ["www.econoflux.com", "econoflux.pages.dev"].includes(context.url.hostname)
  )
    return Response.redirect(
      SITE_ORIGIN + context.url.pathname + context.url.search,
      301,
    );
  if (
    launchEnabled(context.locals) &&
    context.url.hostname === "econoflux.com" &&
    context.url.protocol !== "https:"
  )
    return Response.redirect(
      SITE_ORIGIN + context.url.pathname + context.url.search,
      301,
    );
  const response = await next();
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (
    isIndexableSite(context.url, context.locals) &&
    context.url.protocol === "https:"
  )
    response.headers.set("Strict-Transport-Security", "max-age=31536000");
  if (
    !isIndexableSite(context.url, context.locals) ||
    response.status >= 400 ||
    /^\/api\/|\/(search|admin)\//.test(context.url.pathname)
  )
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
});
