import { it, expect } from "vitest";
import { preferredLanguage, languageRedirect } from "../../src/lib/language";
it.each([
  [null, "en"],
  ["", "en"],
  ["es-ES,es;q=0.9,en;q=0.8", "es"],
  ["es-AR,es;q=0.9", "es"],
  ["es-419,en;q=0.5", "es"],
  ["en-US,en;q=0.9,es;q=0.5", "en"],
  ["es;q=0.5,en;q=0.9", "en"],
  ["fr-FR,es;q=0.8,en;q=0.6", "es"],
  ["fr-FR,de;q=0.9", "en"],
  ["en;q=0,es;q=0.5", "es"],
  ["es;q=0,en;q=0", "en"],
  ["es;q=invalid,en;q=0.4", "en"],
  ["es;q=2,en;q=0.5", "en"],
  ["es;q=0,*;q=0.8", "en"],
  ["en;q=0,*;q=0.8", "es"],
  ["*;q=0.8,es;q=0.4", "en"],
  ["es,en", "es"],
] as const)("selects %s → %s", (header, expected) => {
  expect(preferredLanguage(header)).toBe(expected);
});
it("redirects temporarily without sharing a visitor preference through caches and preserves query parameters", () => {
  for (const [header, target] of [
    ["es-ES", "/es/?utm_source=test"],
    ["en-GB", "/en/?utm_source=test"],
  ]) {
    const response = languageRedirect(
      new Request("https://econoflux.com/?utm_source=test", {
        headers: { "Accept-Language": header },
      }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(target);
    expect(response.headers.get("Vary")).toBe("Accept-Language");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  }
});
