import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const remoteURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = remoteURL || "http://localhost:4321";
const proxy =
  remoteURL && process.env.HTTPS_PROXY
    ? { server: process.env.HTTPS_PROXY }
    : undefined;
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL,
    proxy,
    headless: true,
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox"],
    },
  },
  webServer: remoteURL
    ? undefined
    : {
        command: "npm run build:review && npm run preview -- --port 4321",
        url: baseURL,
        reuseExistingServer: false,
      },
  reporter: "list",
});
