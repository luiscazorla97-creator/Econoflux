import { defineMiddleware } from "astro:middleware";
import { isIndexableSite, launchEnabled, SITE_ORIGIN } from "./lib/site";
import { academyUrl } from "./content/academy";
export const onRequest = defineMiddleware(async (context, next) => {
  if (
    launchEnabled(context.locals) &&
    ["www.econoflux.com", "econoflux.pages.dev"].includes(context.url.hostname)
  )
    return Response.redirect(
      SITE_ORIGIN + context.url.pathname + context.url.search,
      301,
    );
  // The old Guides listing duplicated News. Consolidate its historical aliases
  // on the actual educational library without changing any article URL.
  const oldGuides = context.url.pathname.match(
    /^\/(en|es)\/category\/learn\/$/,
  );
  if (oldGuides)
    return new Response(null, {
      status: 301,
      headers: {
        Location: academyUrl(oldGuides[1] as "en" | "es"),
        "Cache-Control": "no-store",
      },
    });
  if (
    launchEnabled(context.locals) &&
    context.url.hostname === "econoflux.com" &&
    context.url.protocol !== "https:"
  )
    return Response.redirect(
      SITE_ORIGIN + context.url.pathname + context.url.search,
      301,
    );
  // Astro's directory URL policy also affects dynamic file endpoints. Keep
  // public asset URLs conventional while resolving their internal slash route.
  if (
    /^\/images\/(?:(?:academy|markets)\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:svg|png)|editorial\/[a-f0-9]{32}\.webp)$/.test(
      context.url.pathname,
    )
  )
    return context.rewrite(new URL(context.url.pathname + "/", context.url));
  if (
    /^\/market-data\/market-\d{4}-\d{2}-\d{2}-[123]\.json$/.test(
      context.url.pathname,
    )
  )
    return context.rewrite(new URL(context.url.pathname + "/", context.url));
  const response = await next();
  if (!(
    response.ok &&
    /^\/images\/(academy|markets|editorial)\//.test(context.url.pathname)
  ))
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
