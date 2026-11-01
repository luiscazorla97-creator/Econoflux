import { jwtVerify, createLocalJWKSet } from "jose";
import type { Env } from "./types";
let cached: { domain: string; until: number; keys: any } | undefined;
export async function authorize(
  request: Request,
  env: Env,
): Promise<string | null> {
  if (!env.CF_ACCESS_TEAM_DOMAIN || !env.CF_ACCESS_AUD || !env.ADMIN_EMAILS)
    return null;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.CF_ACCESS_TEAM_DOMAIN))
    return null;
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || token.length > 16000) return null;
  try {
    if (
      !cached ||
      cached.domain !== env.CF_ACCESS_TEAM_DOMAIN ||
      cached.until < Date.now()
    ) {
      const r = await fetch(
        "https://" + env.CF_ACCESS_TEAM_DOMAIN + "/cdn-cgi/access/certs",
        { redirect: "error", signal: AbortSignal.timeout(10000) },
      );
      if (!r.ok) return null;
      const keys = await r.json();
      cached = {
        domain: env.CF_ACCESS_TEAM_DOMAIN,
        until: Date.now() + 300000,
        keys,
      };
    }
    const { payload } = await jwtVerify(token, createLocalJWKSet(cached.keys), {
      issuer: "https://" + env.CF_ACCESS_TEAM_DOMAIN,
      audience: env.CF_ACCESS_AUD,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat", "sub", "email"],
    });
    const email = String(payload.email).toLowerCase();
    return env.ADMIN_EMAILS.split(",")
      .map((s) => s.trim().toLowerCase())
      .includes(email)
      ? email
      : null;
  } catch {
    return null;
  }
}
export function validMutation(request: Request) {
  return (
    request.headers.get("origin") === new URL(request.url).origin &&
    request.headers.get("content-type")?.split(";")[0] === "application/json" &&
    (!request.headers.get("sec-fetch-site") ||
      request.headers.get("sec-fetch-site") === "same-origin")
  );
}
