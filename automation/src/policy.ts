import {
  SafeError,
  type Settings,
  type Verification,
  type PreparedArticle,
} from "./types";
export const TIME_ZONE = "America/New_York";
export function dayKey(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dayEnd(now: Date) {
  let low = now.getTime(),
    high = low + 27 * 3600000;
  const key = dayKey(now);
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dayKey(new Date(mid)) === key) low = mid;
    else high = mid;
  }
  return new Date(Math.ceil(high / 1000) * 1000);
}
export function nextRegular(now: Date, remaining: number, gapMinutes: number) {
  const seconds = (dayEnd(now).getTime() - now.getTime()) / 1000;
  const gap = Math.max(gapMinutes * 60, seconds / Math.max(1, remaining + 1));
  return new Date(now.getTime() + gap * 1000).toISOString();
}
export function validateSettings(raw: unknown, current: Settings): Settings {
  if (!raw || typeof raw !== "object")
    throw new SafeError("invalid_config", "Configuración inválida");
  const s = { ...current, ...raw } as Settings;
  const limits: Record<string, [number, number]> = {
    dailyTarget: [1, 1000],
    intervalMinutes: [1, 1440],
    extraQuota: [0, 1000],
    dailyNewsCalls: [1, 10000],
    dailyAICalls: [0, 2000],
    dailyBudgetMicrousd: [0, 100000000],
    dailyBuilds: [0, 500],
    maxConcurrent: [1, 1],
    minimumGapMinutes: [1, 1440],
  };
  for (const [key, [min, max]] of Object.entries(limits)) {
    const value = s[key as keyof Settings];
    if (
      typeof value !== "number" ||
      !Number.isSafeInteger(value) ||
      value < min ||
      value > max
    )
      throw new SafeError(
        "invalid_config",
        `${key}: entero entre ${min} y ${max}`,
      );
  }
  for (const key of [
    "breakingEnabled",
    "enabled",
    "paused",
    "autoApprove",
  ] as const)
    if (typeof s[key] !== "boolean")
      throw new SafeError("invalid_config", key + ": debe ser booleano");
  if (!["test", "active"].includes(s.mode))
    throw new SafeError("invalid_config", "Modo inválido");
  if (
    !Array.isArray(s.primaryHosts) ||
    s.primaryHosts.length > 30 ||
    s.primaryHosts.some(
      (h) => typeof h !== "string" || !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(h),
    )
  )
    throw new SafeError("invalid_config", "Dominios primarios inválidos");
  // Cost bounds are explicit, not silently inferred from the daily target.
  if (s.inputUSDPerMillion !== 0.25 || s.outputUSDPerMillion !== 2)
    throw new SafeError(
      "unsupported_price",
      "El modelo y su tarifa requieren una actualización explícita del adaptador",
    );
  return s;
}
export function capacity(s: Settings) {
  const ai = Math.floor(s.dailyAICalls / 3),
    build = s.dailyBuilds,
    spacing = Math.floor(1440 / s.minimumGapMinutes);
  return {
    estimatedRegularCapacity: Math.min(ai, build, spacing),
    requiredPages: s.dailyTarget * 2,
    newsChecksPerDay: Math.ceil(1440 / s.intervalMinutes),
    limitations: [
      ...(s.dailyTarget > build
        ? ["El objetivo supera el límite diario de compilaciones."]
        : []),
      ...(s.dailyTarget > ai
        ? [
            "El objetivo supera la capacidad orientativa de IA (verificación + dos idiomas).",
          ]
        : []),
      ...(Math.ceil(1440 / s.intervalMinutes) > s.dailyNewsCalls
        ? ["La frecuencia supera el límite diario de consultas de noticias."]
        : []),
      ...(s.dailyTarget > spacing
        ? ["El objetivo supera el espaciado mínimo configurado."]
        : []),
    ],
  };
}
export function normalizedTitle(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function similarity(a: string, b: string) {
  const x = new Set(normalizedTitle(a).split(" ")),
    y = new Set(normalizedTitle(b).split(" "));
  return (
    [...x].filter((w) => y.has(w)).length /
    Math.max(1, new Set([...x, ...y]).size)
  );
}
export function publicURL(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new SafeError("source_url", "URL inválida");
  }
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname) ||
    /\.(local|internal|localhost|test)$/i.test(u.hostname)
  )
    throw new SafeError("source_url", "Solo fuentes HTTPS públicas");
  for (const key of [...u.searchParams.keys()]) {
    if (/^(token|key|api_?key|access_token)$/i.test(key))
      throw new SafeError("source_url", "URL con credenciales rechazada");
    if (/^utm_|^(fbclid|gclid)$/i.test(key)) u.searchParams.delete(key);
  }
  u.hash = "";
  return u.href;
}
export async function hash(value: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export function sufficient(
  v: Verification,
  accessibleIds: Set<string>,
  primaryURLs: Set<string>,
) {
  return (
    v.sufficient &&
    v.essentialFacts.length > 0 &&
    v.sourceIds.length > 0 &&
    v.sourceIds.every((id) => accessibleIds.has(id)) &&
    v.primaryUrls.some((u) => primaryURLs.has(u)) &&
    (!v.highRisk || new Set(v.independentGroups).size >= 2) &&
    !!v.canonicalEvent &&
    Number.isFinite(Date.parse(v.eventDate))
  );
}
export function validatePair(
  a: PreparedArticle,
  b: PreparedArticle,
  options: { numericReviewed?: boolean } = {},
) {
  if (
    a.lang !== "en" ||
    b.lang !== "es" ||
    a.status !== b.status ||
    a.translationId !== b.translationId ||
    a.editorialRevision !== b.editorialRevision
  )
    throw new SafeError("translation", "Par bilingüe inconsistente");
  const numbers = (x: PreparedArticle) =>
    [
      ...new Set(
        [
          x.title,
          x.summary,
          ...x.sections.flatMap((s) => [...s.text, ...(s.list || [])]),
        ]
          .join(" ")
          .replace(/\bprimer trimestre\b/gi, "trimestre 1")
          .replace(/\bsegundo trimestre\b/gi, "trimestre 2")
          .replace(/\btercer trimestre\b/gi, "trimestre 3")
          .replace(/\bcuarto trimestre\b/gi, "trimestre 4")
          .match(/\d+(?:[.,]\d+)*/g) || [],
      ),
    ].sort();
  if (
    !options.numericReviewed &&
    JSON.stringify(numbers(a)) !== JSON.stringify(numbers(b))
  )
    throw new SafeError("translation", "Las cifras difieren entre idiomas");
  if (
    JSON.stringify(a.sources.map((s) => s.url).sort()) !==
    JSON.stringify(b.sources.map((s) => s.url).sort())
  )
    throw new SafeError("translation", "Las fuentes difieren entre idiomas");
  for (const x of [a, b])
    if (
      !x.title ||
      !x.summary ||
      !x.seoTitle ||
      !x.seoDescription ||
      !x.sections.length ||
      !x.sections.every(
        (s) =>
          s.title &&
          s.text.length &&
          s.text.every((t) => typeof t === "string" && t.trim()),
      ) ||
      x.demo ||
      !["draft", "published"].includes(x.status) ||
      !x.image.src.startsWith("/images/") ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug)
    )
      throw new SafeError("draft", "Artículo incompleto");
  for (const article of [a, b]) {
    const prose = [
      article.title,
      article.summary,
      ...article.sections.flatMap((section) => [
        section.title,
        ...section.text,
      ]),
    ].join(" ");
    if (
      /supplied facts|provided verification|verification note|hechos suministrados|material de verificaci[oó]n suministrado/i.test(
        prose,
      )
    )
      throw new SafeError(
        "draft",
        "El artículo expone notas internas; requiere nueva redacción",
      );
    if (article.lang === "es" && /\b(?:billion|trillion)\b/i.test(prose))
      throw new SafeError(
        "translation",
        "Traducir las unidades monetarias al español sin alterar las cifras",
      );
  }
}
