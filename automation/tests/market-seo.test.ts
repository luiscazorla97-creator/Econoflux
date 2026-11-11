import { it, expect, vi } from "vitest";
import { marketDescription } from "../src/market-context";
it("keeps market descriptions unique by frozen day and edition in both languages, regardless of request time", () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date("2030-01-01T12:00:00Z"));
    for (const lang of ["en", "es"] as const) {
      const descriptions = ["2026-11-04-1", "2026-11-04-2", "2026-11-06-1"].map(
        (id) =>
          marketDescription({
            lang,
            slug: "market-" + id,
            publishedAt: id.slice(0, 10) + "T12:00:00Z",
          }),
      );
      expect(new Set(descriptions).size).toBe(3);
      expect(descriptions[0]).toContain("2026-11-04");
      expect(descriptions.every((d) => !d.includes("2030"))).toBe(true);
      expect(descriptions[0]).toContain(
        lang === "en" ? "not live quotes" : "No son cotizaciones en vivo",
      );
    }
  } finally {
    vi.useRealTimers();
  }
});
