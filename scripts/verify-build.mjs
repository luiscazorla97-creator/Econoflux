import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
const production = process.argv.includes("--production");
assert(
  (await stat("dist/_worker.js/index.js")).isFile(),
  "Cloudflare SSR entry missing",
);
for (const image of ["hero", "bitcoin", "ethereum", "defi"])
  assert((await stat(`dist/images/${image}.webp`)).size > 1000);
const headers = await readFile("dist/_headers", "utf8");
assert.equal(headers.includes("X-Robots-Tag: noindex"), !production);
const html = await readFile("dist/en/about/index.html", "utf8");
if (!production) assert(html.includes("noindex"));
console.log(
  "Cloudflare SSR bundle, existing images and preview headers verified. Dynamic routes require runtime tests; articles do not require a new build.",
);
