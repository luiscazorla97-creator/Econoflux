# Current private-panel deployment

Deployed 2026-11-01, using the already configured Cloudflare token. No paid plan was activated, no DNS was changed and no news was published.

- Worker: `econoflux-editorial`.
- Entry URL: **https://econoflux-editorial.luiscazorla97.workers.dev/admin**.
- Worker version: `bcbab093-ec55-43a0-ac40-b67dff5c949a`.
- Database: `econoflux-editorial`, UUID `70a247b6-ec51-46dc-a644-a8f9c40c1204`.
- Migration `0001_editorial.sql` applied successfully.
- Database verified: target **5**, interval **10**, extra quota **3**, `enabled=false`, `paused=true`, no completed publications. One private genuine draft with EN/ES translations imported. It is neither approved nor published.
- Administrator allowlist: **luiscazorla97@gmail.com**.
- The stable minute trigger is installed, but the disabled/paused database settings stop provider and publication work. No news, AI or GitHub runtime secret has been bound to this Worker.

## Remaining login prerequisite

Account-level Cloudflare Access is not enabled. The Access applications, organization and identity-provider API calls return HTTP 403 with `access.api.error.not_enabled` and instruct the owner to click **Enable Access** in the Cloudflare dashboard. This is different from a missing token scope; do not request or grant broad extra token permissions on this evidence.

The official organization creation API was attempted without billing/subscription parameters. It returned HTTP 403 `Authentication error`. Its [official accepted permission](https://developers.cloudflare.com/api/resources/zero_trust/subresources/organizations/methods/create/) is **Access: Organizations, Identity Providers, and Groups Write**, displayed in the token editor as **Account → Access: Organizations, Identity Providers, and Groups → Edit**. This is the specific remaining permission needed to initialize the Access organization and configure a login identity provider by API. No general account permission or user-token management permission is requested.

The owner can either add that specific permission to the already configured token (retain the same account scope), or enable Access using the free option from **Cloudflare → Zero Trust / Access** (https://one.dash.cloudflare.com/). If the interface requires a paid subscription, do not proceed without separate authorization. No paid subscription is selected by this task.

After account activation, the existing authorization covers completing these steps:

1. Read the existing Access organization/team domain and available identity providers. Reuse a supported provider, or configure one-time email PIN if needed and permitted.
2. Create a self-hosted Access application protecting the entire Worker hostname, `econoflux-editorial.luiscazorla97.workers.dev` (including `/admin`, `/api/*` and assets). No custom-domain or DNS changes are needed.
3. Add an Allow policy whose only included identity is email `luiscazorla97@gmail.com`. Do not add Everyone, Bypass, broad domains or service-token access to the admin panel.
4. Configure the Worker's actual `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` from the created application; retain `ADMIN_EMAILS` as the stated address. Redeploy the Worker with these non-secret selectors and the existing D1 binding. Do not change the disabled/paused settings.
5. Verify unsigned, forged-email, wrong-audience and unapproved-user requests remain denied. The owner then opens the panel URL, enters the allowed email in Access and completes the configured login (email code if one-time PIN is used).

A real Chromium browser verified `/health` returns 200 and `/admin` returns the application’s deliberate HTTP 403 with `X-Robots-Tag: noindex, nofollow`. The URL serves this closure, **not** an Access login page yet. It is deployed and closed, but signing in is not possible until the account prerequisite and application configuration are completed. JWT signature/audience/issuer/expiry/email checks are enforced server-side; hiding the URL or noindex is not the security control.

## Separate later automation prerequisites

Only after panel access works: bind actual runtime provider/publisher secrets and perform the previously documented live checks. The platform-held proxy secret in the development task must not be copied into the Worker as if it were the underlying API key. All scheduled publishing stays disabled until express owner approval.
