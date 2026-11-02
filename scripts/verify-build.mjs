import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
assert(
  (await stat("dist/_worker.js/index.js")).isFile(),
  "Cloudflare SSR entry missing",
);
for (const image of ["hero", "bitcoin", "ethereum", "defi"])
  assert((await stat(`dist/images/${image}.webp`)).size > 1000);
const headers = await readFile("dist/_headers", "utf8");
assert(
  !headers.includes("X-Robots-Tag"),
  "Indexation is controlled per host by SSR middleware",
);
console.log(
  "SSR bundle, images and headers verified; indexation needs host-aware runtime checks.",
);
