import { test, expect } from "@playwright/test";
import {
  runPipeline,
  topicKey,
  canonicalSource,
  type Adapters,
  type Draft,
} from "../scripts/editorial-pipeline";
const source = {
  url: "https://example.com/story?utm_source=news",
  title: "Source",
  text: "Verifiable reference",
  fetchedAt: "2026-11-01",
};
function setup() {
  const claimed = new Set<string>();
  const saved: Draft[][] = [];
  const adapters: Adapters = {
    fetchNews: async () => [source, source],
    selectTopics: async (items) => [items],
    draftBothLanguages: async (s, key) =>
      (["en", "es"] as const).map((language) => ({
        translationId: key,
        language,
        title: "Title",
        summary: "Summary",
        body: "Sourced explanation",
        sourceUrls: s.map((x) => x.url),
        demo: false,
        status: "draft",
      })),
    qualityGate: async () => true,
    store: {
      claim: async (key) => {
        if (claimed.has(key)) return false;
        claimed.add(key);
        return true;
      },
      commit: async (_, d) => {
        saved.push(d);
      },
      release: async (key) => {
        claimed.delete(key);
      },
    },
  };
  return { adapters, saved };
}
test("normalizes source URLs and publishes a bilingual topic only once", async () => {
  expect(canonicalSource(source.url)).toBe("https://example.com/story");
  expect(topicKey([source, source])).toBe(topicKey([source]));
  const { adapters, saved } = setup();
  expect(await runPipeline(adapters)).toEqual({ published: 1, skipped: 0 });
  expect(await runPipeline(adapters)).toEqual({ published: 0, skipped: 1 });
  expect(saved[0]).toHaveLength(2);
  expect(saved[0].every((a) => a.status === "published")).toBe(true);
});
test("rejects demos, releases claim and permits safe retry", async () => {
  const { adapters, saved } = setup();
  const original = adapters.draftBothLanguages;
  adapters.draftBothLanguages = async (s, k) =>
    (await original(s, k)).map((d) => ({ ...d, demo: true }));
  await expect(runPipeline(adapters)).rejects.toThrow(
    "Invalid editorial draft",
  );
  expect(saved).toHaveLength(0);
  adapters.draftBothLanguages = original;
  expect((await runPipeline(adapters)).published).toBe(1);
});
test("a failed quality gate never publishes", async () => {
  const { adapters, saved } = setup();
  adapters.qualityGate = async () => false;
  await expect(runPipeline(adapters)).rejects.toThrow("quality gate");
  expect(saved).toHaveLength(0);
});
