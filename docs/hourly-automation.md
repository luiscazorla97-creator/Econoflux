> **Current launch:** see [official-launch.md](official-launch.md) for the official domain, live prices, images, sharing and indexation. Preview-only statements below describe the earlier deployment stage.

# EconoFlux: current hourly automation (supersedes the panel/daily-target scope)

Owner instruction 2026-11-02 authorizes the first genuine batch and subsequent hourly publishing after a real end-to-end check. No per-article approval or Access login is required. No new paid service or plan is authorized.

## Runtime and publication

Reuse `econoflux-editorial`, its existing D1 database and the existing Git-integrated Pages project. Astro now renders article/list/search routes from D1 on the server using the existing layouts and images. Both languages are written in one D1 transaction. A visitor reads stored content only: no news/AI request is triggered. Code deployments still use GitHub, but publishing a story uses **zero Pages builds and no GitHub token**.

`public_articles` is the only editorial table read by the public frontend. Private sources, candidates and drafts remain outside it. Full article content, language links, canonical and metadata are in the first HTML response. Server responses disable stale caches. The site remains in preview/noindex mode until a separate public-domain/indexation launch decision.

## One effective schedule, no panel

There is one existing stable minute trigger. It checks persistent due times; provider reviews are due every **60 minutes**, not every minute. Intermediate ticks only resume bounded pending work or verify a staged pair. A new-story ingestion and each model phase are separate invocations: verification, English, Spanish, then independent bilingual review. Valid phases persist before yielding; continuation does not increment failure attempts. The legacy daily-target engine is no longer used by `scheduled`. Administrative operations are unconditionally closed unless explicitly reconfigured by code; `ADMIN_DISABLED=true` is deployed. Existing Access resources are preserved but are not a scheduler dependency.

Migration `0002_hourly.sql` is additive: it retains existing data, adds cycles, initial-batch progress and dynamic public content, removes old five-per-day/extra-three settings from the active configuration, and keeps daily consumption/budget limits. Initial batch is `initial-once`, target five distinct events; its progress persists. A restart never creates another initial batch. After five verified publications it marks the initial cycle complete and sets the next regular review 60 minutes later. If fewer topics qualify, it keeps the remaining initial slots and checks again on the next due review without filler.

Each normal cycle has a hard maximum of **three new events**. The first needs normal verified relevance; subsequent stories require exceptional verified importance (score at least 85/100 plus an evidence-based explanation). Relevance is assigned after consulting sources, not from sensational title words. Updates use separate event records linked to the original translation ID and preserve original dates/slugs. URL/provider ID, title similarity, canonical-event keys and known-event context prevent repeated events. Similar headlines add alternative sources to an existing event rather than discarding corroboration. Semantic matching is conservative, not infallible; uncertain cases remain pending.

## Quality and state

A missing/inaccessible primary source prevents drafting. Original articles can yield links to explicitly trusted official domains; up to five sources are consulted with bounded responses/timeouts. There is no paywall bypass. High-risk allegations, incidents, regulatory decisions and material figures require corroboration from independent groups; syndication is not independent corroboration. External text is data, not instructions. Both drafts must pass factual-source, structural, numeric and language checks, including an independent model review against the verified essential facts. Its successful result is cached by a fingerprint of facts and both drafts; failures invalidate only affected versions. A failed language retains the other. A bad topic never blocks another eligible candidate.

Approved complete pairs become `live_pending` when stored. They count as published only after the Worker has read both final URLs and found their ID/revision/language markers. A failed URL check retains the pair/progress and retries verification rather than regenerating the story. Local tests demonstrated a live D1 insert appearing in both initial article HTML responses, home, category and search **without rebuilding**. Test fixtures were never deployed.

## Real runtime credentials and spending

Configure only these encrypted Worker secrets in **Cloudflare → Workers & Pages → econoflux-editorial → Settings → Variables and Secrets**:

- `CRYPTONEWS_API_KEY`.
- `ECONOFLUX_OPENAI_API_KEY` (existing authorized OpenAI API project/credit, not a ChatGPT subscription).

A Codex network-secret placeholder is not a Worker credential. Secret presence is checked through names only; a one-shot preflight runs from the actual Worker and tests the real provider/model/public site. It records a safe result in D1 and publishes nothing. No diagnostic endpoint is exposed.

Following the owner’s explicit later instruction, the current model cap is **$3/day** of reserved+known AI cost, with 160 AI calls/day and 32 news calls/day. The call safety ceiling was adapted for a fourth, independent bilingual review: 24 qualifying baseline stories need 96 calls, leaving bounded room for checks, corrections and exceptional stories. The increased call ceiling accommodates hourly work while preserving the currently authorized dollar cap. Unknown costs remain reserved on transport failures. No retry loop spends beyond those bounds. A typical baseline is 24 news queries/day (720/30-day month), plus explicitly bounded diagnostics/retries; a 100-item limit does not establish a subscription's monthly quota. No paid plan was activated.

An enabled job needs existing provider access and credit within the authorized spending cap. If these fail, the error is recorded and publication must not be declared active end-to-end. The activation below is authorized by the owner and does not require another general approval, but must follow the real preflight and first successful bilingual URL check.

## Controls without a panel

All controls use the account's authenticated D1 interface or `wrangler d1 execute`; no public admin/run URL exists.

Stop immediately (prevents new provider/publication work):

```sql
UPDATE automation_control SET paused=1 WHERE id=1;
```

Fully disable:

```sql
UPDATE automation_control SET enabled=0,paused=1 WHERE id=1;
```

Request exactly one real connectivity preflight, without publishing:

```sql
UPDATE automation_control SET preflight_requested=1 WHERE id=1;
```

After successful runtime preflight, activate the authorized initial real publication test:

```sql
UPDATE automation_control SET enabled=1,paused=0 WHERE id=1 AND preflight_passed_at IS NOT NULL AND preflight_error IS NULL;
```

The initial cycle must complete before the routine hourly cycle begins. Inspect actual state instead of assuming a cron exists means success:

```sql
SELECT enabled,paused,last_review,next_review,initial_completed_at,preflight_passed_at,preflight_error,last_error FROM automation_control;
SELECT cycle_id,kind,state,count(*) FROM cycle_items GROUP BY cycle_id,kind,state;
SELECT state,last_error,count(*) FROM events GROUP BY state,last_error;
```

Ask the assistant “Pausa EconoFlux” to apply the stop, or run the first statement in Cloudflare D1. If a pair was already committed to public storage when paused, it may already be visible; pausing does not delete valid content or roll back a completed event.

## Tests and proof boundary

`npm run test:editorial` covers D1 atomic reservations, initial uniqueness across restarts, maximum three/hour, preservation of pending work, bilingual URL completion, credential absence, pause and disabled administrative routes, in addition to the retained historical tests. `npm run test:dynamic` proves the public SSR/D1 flow locally. Existing browser tests cover both languages, search, categories and mobile.

Live API/model and published-article results are reported separately from those simulations. The previous headline-only draft and demo articles are not eligible for automatic selection; only provider-origin events pass through this workflow. DNS and the final custom domain are not changed.

## Actual runtime check, 2026-11-02 UTC

Both required names are present as encrypted secrets on the actual Worker. Crypto News API successfully returned 20 recent candidates. An earlier OpenAI request returned HTTP 429 `insufficient_quota`; after the owner funded the existing API account, the one-shot preflight **passed at 00:28:28 UTC** and a completed Responses API call was recorded. No subscription or billing setting was changed by the agent.

The authorized initial batch started after that preflight. Publication results and the next due time must be read from D1; a running trigger or a connectivity test alone does not prove a published article. Sources lacking accessible primary evidence remain pending without drafting. The public site was checked at desktop/mobile sizes in both languages and excludes demo articles.

Source discovery for the initial review added only official URLs linked in the original reporting (SEC, KuCoin, Robinhood, Binance). The initial batch included explicitly logged standard-public-HTTP evidence snapshots from the managed cloud environment where an official site blocked Worker access. Original CoinDesk reporting of an attributed Google interview was classified as primary for those company statements, rather than classifying all CoinDesk pages as primary. Initial copy edits fixed untranslated fields and removed an unsupported derived residual percentage. These edits were not manual approvals: the Worker still had to run independent model review and public URL confirmation. Future source collection runs in the Worker and leaves blocked/incomplete stories pending; it does not depend on Codex. Larger publisher HTML documents are bounded to 2 MB and the reader isolates article text before evidence assessment. Candidate selection prioritizes already-verified relevance, then available corroboration, then recency; source count never substitutes for verified importance. The existing 100-item news subscription is sampled with at most 10 unseen reports ingested per invocation. Known URLs do not requeue already failed sources without new evidence.

## Completed initial batch and current activation

At **2026-11-02 00:59:28 UTC**, D1 recorded `initial_completed_at`, `enabled=1`, `paused=0`, five distinct `cycle_items` published, and ten public language pages. All five events have `draftReview.passed=true`, state `published` and no final error. The Worker confirmed both public ID/revision/language markers for every pair. The first regular provider review is due **2026-11-02 01:59:28 UTC**, then reviews recur every 60 minutes from the actual due execution. The minute dispatcher remains the only trigger.

Published paths under `https://econoflux.pages.dev`:

| Event | EN | ES |
| --- | --- | --- |
| Binance withdrawals | `/en/articles/binance-resumes-withdrawals-2026-11-01/` | `/es/articles/binance-reanuda-retiros-2026-11-01/` |
| SEC / BG Wealth / DSJ | `/en/articles/sec-alleges-130m-fraud-bg-wealth-dsj-exchange/` | `/es/articles/sec-alleges-130m-fraud-bg-wealth-dsj-exchange/` |
| Robinhood results | `/en/articles/robinhood-q3-2026-1-42b-total-revenue-crypto-120m-down-55/` | `/es/articles/robinhood-q3-2026-1-42b-total-revenue-crypto-120m-down-55/` |
| KuCoin exit | `/en/articles/kucoin-discontinues-services-russia-belarus/` | `/es/articles/kucoin-suspende-servicios-russia-belarus/` |
| Google MPC | `/en/articles/google-multi-party-compute-preview-early-2027/` | `/es/articles/google-multi-party-compute-preview-early-2027/` |

Current activation is observed state, not a claim that every future hour will have a publishable event or that a full daily unattended cycle has already elapsed. Quality, source accessibility, deduplication and the monetary cap can produce no publication in an hour, as authorized. Previously completed initial events cannot create a second initial batch; revisions retain existing paths and dates, do not open new publication slots, and must pass their own final review before the initial cycle completes.

Owner budget update, 2026-11-02: the maximum OpenAI expenditure is now **$3/day**, replacing $1/day. It is a reserved-plus-known-cost safety ceiling, not a spending target. The persisted D1 setting `dailyBudgetMicrousd=3000000` was read back after saving. No service or plan changed.
