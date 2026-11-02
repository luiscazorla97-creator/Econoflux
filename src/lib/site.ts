export const SITE_ORIGIN = "https://econoflux.com";
export function launchEnabled(locals: any) {
  return locals.runtime?.env?.PUBLIC_LAUNCH === "true";
}
export function isIndexableSite(url: URL, locals: any) {
  return launchEnabled(locals) && url.hostname === "econoflux.com";
}
export function escapeXML(value: string) {
  return value.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
}
