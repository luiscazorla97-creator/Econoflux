import { it, expect, vi, afterEach } from "vitest";
import { consultSource } from "../src/providers";
import type { Settings } from "../src/types";

afterEach(() => vi.unstubAllGlobals());
const settings = { primaryHosts: ["official.example.org"] } as Settings;

it("reads the main story instead of unrelated sidebar article cards", async () => {
  const fact = "Verified main announcement and its precise scope. ";
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          `<article>Unrelated sidebar teaser.</article><div class="entry-content"><div>${fact.repeat(20)}</div><a href="https://official.example.org/notice">Notice</a></div><footer>Unrelated footer</footer>`,
          { headers: { "content-type": "text/html" } },
        ),
    ),
  );
  const source = await consultSource(
    "https://publisher.example.org/story",
    settings,
  );
  expect(source.accessible).toBe(1);
  expect(source.excerpt).toContain(fact.trim());
  expect(source.excerpt).not.toContain("Unrelated sidebar");
  expect(source.primaryLinks).toEqual(["https://official.example.org/notice"]);
});

it("ignores large application bundles while retaining the actual article", async () => {
  const fact = "Official release body with confirmed facts. ";
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          `<script>${"x".repeat(400000)}</script><article>${fact.repeat(25)}</article>`,
          { headers: { "content-type": "text/html" } },
        ),
    ),
  );
  const source = await consultSource(
    "https://official.example.org/notice",
    settings,
  );
  expect(source.accessible).toBe(1);
  expect(source.primary_source).toBe(1);
  expect(source.excerpt).toContain(fact.trim());
  expect(source.excerpt).not.toContain("xxxxxxxx");
});

it("never treats an unread binary PDF as verified source text", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response("%PDF-1.7".repeat(100), {
          headers: { "content-type": "application/pdf" },
        }),
    ),
  );
  const source = await consultSource(
    "https://official.example.org/notice.pdf",
    settings,
  );
  expect(source.accessible).toBe(0);
  expect(source.excerpt).toBeNull();
});
