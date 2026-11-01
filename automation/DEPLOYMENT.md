# Current private-panel deployment

Access setup completed 2026-11-01 using the existing configured token. No paid plan was selected, no DNS was changed and no news was published.

## Entry and administrator

**https://econoflux-editorial.luiscazorla97.workers.dev/admin**

Open the URL, enter **luiscazorla97@gmail.com**, select **Send login code**, and enter the code delivered by Cloudflare Access. No password or code should be pasted into the development chat. Only the configured email is allowed; there is no Everyone or Bypass policy.

The organization was created through the official API after the narrowly required permission was added. Team domain: `econoflux-luiscazorla97.cloudflareaccess.com`. A one-time PIN identity provider and a self-hosted application protect the entire Worker hostname, including the private API and panel assets. The application has one Allow policy containing only the administrator's exact email. Sessions last eight hours. The Worker independently verifies JWT signature, issuer, audience, expiry and email.

- Worker: `econoflux-editorial`.
- Current Worker version: `a07f4603-eda0-42ba-a59f-e3ebed9684f9`.
- D1: `econoflux-editorial`, UUID `70a247b6-ec51-46dc-a644-a8f9c40c1204`.
- Migration `0001_editorial.sql` applied.
- Access application ID: `e96b46f8-0dd1-4f3e-b0eb-16f5854627f5`.
- Policy ID: `8ec4f180-8076-4c51-a276-a5499f077df3`.
- Identity provider: one-time email PIN. Its configuration requires no additional provider credential.

## Actual verification

A fresh Chromium browser requesting `/admin` or `/api/status` without a session reaches the Access-hosted login page, with no editorial content or settings exposed. Before enabling Access, live checks also confirmed the application itself denied unsigned/spoofed-email access. The actual Access application and policy were read back through the API and verified to allow only the stated email and only the configured one-time PIN provider.

The owner's completed email-code login has **not** been performed by the agent; that final interactive check requires the owner. No code was requested or email triggered by the test browser.

D1 was read back after deployment: daily target 5, review interval 10 minutes, extraordinary quota 3, enabled=false, paused=true, zero completed publications. The private Bitcoin Core 32.1 draft has both languages, is not approved and is not published. The stable minute trigger exists but stops before provider or publication work while settings are disabled/paused. No actual news, model or publishing credentials have been bound to this Worker.

## Separate later automation prerequisites

Panel login needs no further API key. For future automated preparation/publication, configure the actual runtime provider/publisher secrets and perform the live checks documented in README.md. The proxy secret inside the development task is not the underlying API key and must not be copied into the Worker. Do not enable publishing before express owner approval. Leave enabled=false and paused=true during panel review.
