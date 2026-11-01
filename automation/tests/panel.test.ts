import { it, expect } from "vitest";
import { Miniflare } from "miniflare";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { handle } from "../src/index";
import type { Env } from "../src/types";
it("authenticated desktop/mobile panel persists 5→17→3, interval and quota changes without deploy, restores safe defaults", async () => {
  const mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("fixture")}}',
    compatibilityDate: "2026-08-01",
    d1Databases: { DB: "panel-test" },
  });
  const db = await mf.getD1Database("DB");
  for (const sql of readFileSync(
    "automation/migrations/0001_editorial.sql",
    "utf8",
  )
    .split(";")
    .map((x) => x.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  const key = await generateKeyPair("RS256", { extractable: true });
  const jwk = await exportJWK(key.publicKey);
  jwk.kid = "panel-key";
  const token = await new SignJWT({ email: "owner@example.org" })
    .setProtectedHeader({ alg: "RS256", kid: "panel-key" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .setSubject("panel-owner")
    .setIssuer("https://paneltest.cloudflareaccess.com")
    .setAudience("panel")
    .sign(key.privateKey);
  const env: Env = {
    DB: db as any,
    CF_ACCESS_TEAM_DOMAIN: "paneltest.cloudflareaccess.com",
    CF_ACCESS_AUD: "panel",
    ADMIN_EMAILS: "owner@example.org",
    SITE_URL: "https://example.org",
    GITHUB_REPOSITORY: "fixture/repo",
    GITHUB_BRANCH: "main",
    PAGES_PROJECT: "fixture",
    AI_MODEL: "gpt-5-mini",
  };
  const actualFetch = globalThis.fetch;
  globalThis.fetch = (async (input: any, init?: any) =>
    String(input).includes("/cdn-cgi/access/certs")
      ? Response.json({ keys: [jwk] })
      : actualFetch(input, init)) as any;
  const server = createServer(async (req, res) => {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = Buffer.concat(chunks);
      const request = new Request(
        "http://127.0.0.1:" + (server.address() as any).port + req.url,
        {
          method: req.method,
          headers: req.headers as any,
          ...(req.method === "POST" ? { body } : {}),
        },
      );
      const response = await handle(request, env);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
      res.writeHead(500);
      res.end("Fixture server error");
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + (server.address() as any).port;
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  try {
    expect((await actualFetch(origin + "/admin")).status).toBe(403);
    const context = await browser.newContext({
      extraHTTPHeaders: { "Cf-Access-Jwt-Assertion": token },
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    await page.goto(origin + "/admin");
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>("[name=dailyTarget]")
          ?.value === "5",
    );
    for (const target of ["17", "3"]) {
      await page.locator("[name=dailyTarget]").fill(target);
      await page.getByRole("button", { name: "Guardar configuración" }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Configuración guardada" })
        .waitFor();
      await page.reload();
      await page.waitForFunction(
        (value) =>
          document.querySelector<HTMLInputElement>("[name=dailyTarget]")
            ?.value === value,
        target,
      );
    }
    await page.locator("[name=intervalMinutes]").fill("7");
    await page.locator("[name=extraQuota]").fill("0");
    await page.getByRole("button", { name: "Guardar configuración" }).click();
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>("[name=intervalMinutes]")
          ?.value === "7",
    );
    expect(await page.locator("[name=extraQuota]").inputValue()).toBe("0");
    await page.locator("[name=dailyTarget]").fill("5");
    await page.locator("[name=intervalMinutes]").fill("10");
    await page.locator("[name=extraQuota]").fill("3");
    await page.getByRole("button", { name: "Guardar configuración" }).click();
    await page.waitForTimeout(200);
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>("[name=dailyTarget]")
          ?.value === "5",
    );
    await page.screenshot({
      path: "test-results/admin-desktop.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "test-results/admin-mobile.png",
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(await page.locator("[name=enabled]").isChecked()).toBe(false);
    expect(await page.locator("[name=paused]").isChecked()).toBe(true);
    await context.close();
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    globalThis.fetch = actualFetch;
    await mf.dispose();
  }
}, 60000);
