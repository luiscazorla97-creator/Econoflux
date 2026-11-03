type Language = "en" | "es";

/** Negotiate only the entry page; explicit language URLs always take priority. */
export function preferredLanguage(header: string | null): Language {
  const ranges = (header || "").split(",").map((entry, index) => {
    const [range, ...parameters] = entry.trim().toLowerCase().split(";");
    const quality = parameters
      .map((p) => p.trim())
      .find((p) => p.startsWith("q="));
    const q = quality ? Number(quality.slice(2)) : 1;
    return {
      range: range.trim(),
      q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0,
      index,
    };
  });
  const choices = (["en", "es"] as const)
    .map((lang) => {
      const matches = ranges.filter(
        (r) => r.range === lang || r.range.startsWith(lang + "-"),
      );
      const eligible = matches.length
        ? matches
        : ranges.filter((r) => r.range === "*");
      const best = eligible.sort((a, b) => b.q - a.q || a.index - b.index)[0];
      return { lang, q: best?.q || 0, index: best?.index ?? Infinity };
    })
    .filter((c) => c.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  return choices[0]?.lang || "en";
}

export function languageRedirect(request: Request): Response {
  const lang = preferredLanguage(request.headers.get("Accept-Language"));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${lang}/${new URL(request.url).search}`,
      Vary: "Accept-Language",
      "Cache-Control": "no-store",
    },
  });
}
