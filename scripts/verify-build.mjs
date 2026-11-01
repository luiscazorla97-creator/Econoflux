import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const published = JSON.parse(
  await readFile("src/content/published.json", "utf8"),
);
const production = process.argv.includes("--production");
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory() ? files(`${dir}/${e.name}`) : `${dir}/${e.name}`,
      ),
    )
  ).flat();
}
const paths = await files("dist");
const html = paths.filter((p) => p.endsWith(".html"));
const articles = html.filter((p) => p.includes("/articles/"));
assert.equal(
  articles.length,
  published.length + (production ? 0 : 6),
  "Demo article route isolation",
);
for (const path of html) {
  const text = await readFile(path, "utf8");
  if (!production) assert.match(text, /noindex/);
  if (production)
    assert.doesNotMatch(
      text,
      /Inside the Bitcoin ecosystem|Dentro del ecosistema Bitcoin/,
    );
}
const sitemap = await readFile("dist/sitemap.xml", "utf8");
assert.equal(sitemap.includes("<loc>"), production);
const headers = await readFile("dist/_headers", "utf8");
assert.equal(headers.includes("X-Robots-Tag: noindex"), !production);
for (const lang of ["en", "es"]) {
  const search = await readFile(`dist/${lang}/search/index.html`, "utf8");
  assert.match(search, /noindex/);
  if (production) assert.doesNotMatch(search, /what-is-bitcoin|que-es-bitcoin/);
}
console.log(
  `Verified ${html.length} HTML pages; ${articles.length} demo article routes; ${production ? "production exclusion" : "preview noindex"} passed.`,
);
