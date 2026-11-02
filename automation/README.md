> **Historical panel-era record, superseded.** The owner replaced this scope with [hourly publishing without a panel](../docs/hourly-automation.md). The current Worker has `ADMIN_DISABLED=true`, the first five bilingual stories are published, automatic scheduling is active, and the authorized model cap is $3/day. Historical pause, approval and panel-login instructions below do not describe the active deployment.

# EconoFlux editorial service

Status: Worker and real D1 are deployed; Cloudflare Access is configured for the sole administrator. Live unauthenticated browser requests reach the email-code login page. Scheduled preparation/publication remains disabled and paused. Local policy/browser tests use simulated paid services; the owner's email-code login and live model/publishing checks remain separate. See [current deployment record](DEPLOYMENT.md).

## Components

- `src/index.ts`: private panel/API, strict same-origin JSON mutations, signed Cloudflare Access identity and administrator allowlist. No client-side password or bypass mode.
- `src/engine.ts`: one stable minute cron reads persistent due times and settings. Detection, source verification, bilingual preparation, approval, Git publication and final URL reconciliation are separate phases.
- `src/store.ts`, `migrations/`: persistent settings/version, candidates, provenance, draft revisions, history, reservations, usage and expiring scheduler lock. Reservation SQL reads current settings and is atomic. In-flight reservations remain held across midnight; finished stories from yesterday do not create a new target today.
- `src/providers.ts`: news provider, bounded source fetching and OpenAI Responses adapter. No reader request reaches these providers. An inaccessible primary source blocks generation. Accessible original articles are checked for links to configured official domains; no access controls are bypassed. Syndicated reports do not count as independent corroboration. AI output is untrusted and structurally validated, with source-ID/domain, numeric, language and pair checks.
- `src/publish.ts`: one GitHub Contents commit adds both languages to `src/content/published.json`, then a Git-origin Pages build is triggered/observed. Build-time validation rejects partial pairs. A story is completed only after **both final URLs** expose the expected editorial ID, revision and language. Failed deployments retain capacity to avoid accidental overpublication. A failed language keeps the valid language, with bounded backoff for the missing work.
- Existing Astro components render the published JSON together with demo data only in preview; production excludes demos. Content is complete in initial HTML. Images are existing EconoFlux-owned generated illustrations, labelled as illustrations, not API photos. SEO fields, real dates, canonical and reciprocal hreflang are preserved.

The interactive Codex task is the development tool, not the scheduled runtime. The Worker runs without a computer or Codex session. OpenAI API supplies scheduled verification/writing; ChatGPT/Codex subscriptions do not supply that external API credential or its usage allowance. Pages publishes committed stored articles, not on-demand AI output.

## Defaults and panel operations

Defaults after tests: **5 original stories/day → 10 language pages; 10-minute review; breaking enabled; 3 extra stories; scheduler disabled; paused; test mode; automatic approval off.**

All settings persist in D1 and apply without code changes or new crons. Positive integer daily target is editable (1–1000 technical input limit, not a capacity promise). Extra quota accepts 0–1000; interval accepts whole minutes 1–1440. The minute cron is the supported scheduling resolution; executions may be late or overlap, so the lease skips overlaps and runtime state shows actual due/last times.

Default safety limits are 160 news calls/day, 30 AI calls/day, $1/day reserved+actual AI budget, eight builds/day and a 20-minute minimum gap for routine publications. A target above these limits is accepted but the panel shows why it cannot be met. Targets are goals, never a requirement to fabricate filler. The system does not carry an unmet target into a new day. A raise recomputes future spacing; a decrease does not delete published content. Urgent verified work uses a routine slot first, then the separate extra quota, and obeys pause, quota and budget.

Panel actions: save settings, pause, manual test without publishing, review both languages/sources/reasons, approve/reject with reasons, request corrections, add an official source, reverify and link a material update to an existing published article. Updates retain original dates/slugs and are counted separately. Newly prepared work defaults to human approval. Setting automatic approval requires an explicit administrative setting; verification is never bypassed.

A pause prevents new jobs/commits/deploy requests. A build already submitted to Cloudflare can still finish externally; the system retains and reconciles its reservation instead of claiming it was canceled. Unknown paid-call costs on network errors keep a conservative reservation and require operator reconciliation rather than silently undercounting. No partial publication is counted as a completed story.

## Actual verification and limitations

Tests use a local D1 instance with the real migration, authenticated RS256 JWT fixtures, browser desktop/mobile and mocks for GitHub, OpenAI and Cloudflare deployment endpoints. They cover 5→17→3, reload persistence, arbitrary integer inputs, interval changes, capacity limits, one story/two languages, routine and urgent capacity before/after target, exhaustion/zero extras, rumor rejection, updates, concurrency, locks, retries, missing translation, failed build/URL, pause, budgets, New York midnight and spring/fall DST, access protection, signature/audience/email/origin checks and safe defaults. They do not claim live model quality or a production D1 deployment.

Similarity is lexical Jaccard plus normalized URL/provider ID and a verified canonical-event key. It is not a perfect semantic duplication classifier. Related events need editorial review, especially material updates. Primary domain settings need careful curation; a domain allowlist and model assessment alone cannot guarantee factual correctness. Default approval remains manual. The source collector conservatively skips missing primary evidence instead of generating from an inaccessible headline.

The news endpoint is date-sorted general article news (`items=20`, no pagination). No provider cache-bypass parameters are added. Official documentation specifies one-hour caches for event/top-mentioned/sentiment endpoints; they are **not used** here. Provider article timestamps are not treated as proof of a new event. Repeated URLs/fingerprints and unchanged candidates do not trigger re-generation. News polling is at most one request per due review; retries are bounded and budgeted. The subscribed 100-item limit was reported by the owner, not load-tested; the earlier live proof retrieved five distinct items. This delivery makes no additional paid news/model calls.

No live end-to-end automated publication has been tested, because permissions and credentials below are still missing. No paid plans were activated.

## Provisioning and administrator access (completed; historical setup instructions)

Access initialization is now complete. The existing token was extended with the documented organization/identity-provider permission; the organization, one-time PIN identity provider, application and exact-email policy were created and verified. **No further permission is currently required for panel entry.** The steps below remain a reference for another deployment; do not recreate existing resources.

Do not paste tokens in chat. Use Cloudflare's token editor and the existing secure environment binding. Setup/deployment permissions are separate from the narrow Pages-only token that the runtime publisher should use.

From the checkout:

```sh
npm ci
npm run test:editorial
npm run check:editorial
npx wrangler d1 create econoflux-editorial
```

The existing database UUID is already saved in `automation/wrangler.jsonc`. Reuse this database; do not create a duplicate or rerun the initial import unnecessarily. The commands above document provisioning for a new environment.

```sh
npx wrangler d1 migrations apply econoflux-editorial --remote --config automation/wrangler.jsonc
```

Create a self-hosted Cloudflare Access application for the eventual Worker hostname. Protect the **entire hostname**, panel and API included, allow only **luiscazorla97@gmail.com**, and configure a supported identity provider (Cloudflare's one-time email PIN is sufficient when available). In the Worker settings add:

- `CF_ACCESS_TEAM_DOMAIN`: your actual `<team>.cloudflareaccess.com` domain.
- `CF_ACCESS_AUD`: the Access application's actual Audience tag.
- `ADMIN_EMAILS`: `luiscazorla97@gmail.com`.

The server validates the Access JWT signature, issuer, audience, expiry and allowed email. It rejects a forged email header, unsigned JWT, wrong administrator, missing configuration and cross-origin mutations. Missing administrator setup keeps panel/assets/API closed. Access login and signed identity delivery still require a real deployed test; local tests use fixture keys.

Runtime secrets must be entered under **Workers & Pages → econoflux-editorial → Settings → Variables and Secrets** (type Secret), or interactively with `wrangler secret put <NAME> --config automation/wrangler.jsonc`:

- `CRYPTONEWS_API_KEY`: the real provider key. The network proxy placeholder inside Codex must **not** be copied into the Worker.
- `ECONOFLUX_OPENAI_API_KEY`: a separate OpenAI API project key with a provider-side spending limit.
- `GITHUB_TOKEN`: fine-grained token limited to `luiscazorla97-creator/Econoflux`, Contents read/write, for committing the published bilingual JSON. No broad account token is necessary. Repository branch protections must allow this integration or an approved merge workflow must replace direct writes.
- `CLOUDFLARE_API_TOKEN`: narrow account Pages Edit token for this project.
- `CLOUDFLARE_ACCOUNT_ID`: non-secret runtime account selector.

The current Codex-bound news/Cloudflare secrets are **not automatically available to deployed Workers**. Presence and live operations must be verified in that runtime. Do not copy them into frontend variables, Git, logs, screenshots or saved commands.

Deploy only after D1 and Access are configured:

```sh
npx wrangler deploy --config automation/wrangler.jsonc
```

The one-minute trigger then exists but does no provider work while settings are disabled/paused. `wrangler.closed.jsonc` remains a separate fail-closed bootstrap with no cron or D1. The current deployment uses `wrangler.jsonc`, a real D1 binding and the stable minute trigger; settings remain disabled/paused, so the trigger does no provider work. Access is now configured in the operational deployment; unauthenticated requests reach its login page. The independent server JWT checks still reject invalid identities.

## First verified bilingual draft

Private file: `.local/editorial/automation/REVIEW.md`, structured record `bitcoin-core-32-1-draft.json`. Subject: Bitcoin Core 32.1, GitHub publication timestamp **2026-10-28T14:23:53Z**, checked against the official release API and accessible release notes. Both sources belong to the same project; they are not labelled as independent corroboration. No price claim or security allegation is made. This is a manually prepared, AI-assisted review draft, not a successful scheduled OpenAI API run. It is not the earlier headline-only Binance draft and is not in public content.

To import into the private database after provisioning: `npm run editorial:import-draft -- --remote` (requires D1 permissions). By default that command only prepares the SQL in a private local file; inspect it before the explicit remote import. Do not add the draft to `src/content/published.json` to review it.

## Exact later activation procedure — only after owner's express approval

1. Correct the setup token, create/migrate D1, configure Access for the stated administrator and bind the runtime secrets.
2. Deploy the Worker in the disabled/paused defaults. Verify unauthorized requests fail; log in as the administrator and verify the allowlist and same-origin controls on the real service.
3. Import/review the genuine draft in both languages and run **manual test**, with publication prohibited. Verify a bounded live news call and model call from the Worker runtime and inspect source provenance/quotas. This check is still pending.
4. Test a controlled deployment with explicit owner approval, verify both public URLs and revision markers, and inspect failure recovery. Keep Pages in `SITE_MODE=preview` and noindex until launch is separately approved.
5. Only after explicit approval, set desired targets/limits in the panel; choose active mode, decide human or automatic approval, enable the scheduler, clear pause, and type `ACTIVAR PUBLICACIÓN REAL`. Missing runtime prerequisites block activation. Default values to start: 5/10/3.
6. Monitor observed last/next review, errors, reservations, quota and budget. **Pausar todo** stops new work. To fully deactivate, clear the scheduler-enabled field; the stable cron can remain installed and idle.

Activation is not performed by this delivery. Domain `econoflux.com` and DNS are unchanged.
