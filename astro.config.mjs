import { defineConfig } from "astro/config";
import { writeFile } from "node:fs/promises";
export default defineConfig({
  site:
    process.env.SITE_MODE !== "production" && process.env.CF_PAGES_URL
      ? process.env.CF_PAGES_URL
      : "https://econoflux.com",
  output: "static",
  devToolbar: { enabled: false },
  trailingSlash: "always",
  integrations: [
    {
      name: "deployment-headers",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const preview = process.env.SITE_MODE !== "production";
          await writeFile(
            new URL("_headers", dir),
            `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n${preview ? "  X-Robots-Tag: noindex, nofollow\n" : ""}/images/*\n  Cache-Control: public, max-age=86400\n`,
          );
        },
      },
    },
  ],
});
