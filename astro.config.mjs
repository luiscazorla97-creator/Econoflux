import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import { writeFile } from "node:fs/promises";
export default defineConfig({
  site: "https://econoflux.com",
  output: "server",
  adapter: cloudflare({ imageService: "passthrough" }),
  session: { driver: "memory" },
  devToolbar: { enabled: false },
  trailingSlash: "always",
  integrations: [
    {
      name: "deployment-headers",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          await writeFile(
            new URL("_headers", dir),
            `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/images/*\n  Cache-Control: public, max-age=86400\n`,
          );
        },
      },
    },
  ],
});
