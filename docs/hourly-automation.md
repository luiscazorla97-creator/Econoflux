# EconoFlux: current hourly automation (supersedes the panel/daily-target scope)

Owner instruction 2026-11-02 authorizes the first genuine batch and subsequent hourly publishing after a real end-to-end check. No per-article approval or Access login is required. No new paid service or plan is authorized.

## Runtime and publication

Reuse `econoflux-editorial`, its existing D1 database and the existing Git-integrated Pages project. Astro now renders article/list/search routes from D1 on the server using the existing layouts and images. Both languages are written in one D1 transaction. A visitor reads stored content only: no news/AI request is triggered. Code deployments still use GitHub, but publishing a story uses **zero Pages builds and no GitHub token**.

`public_articles` is the only editorial table read by the public frontend. Private sources, candidates and drafts remain outside it. Full article content, language links, canonical and metadata are in the first HTML response. Server responses disable stale caches. The site remains in preview/noindex mode until a separate public-domain/indexation launch decision.

## One effective schedule, no panel

There is one existing stable minute trigger. It checks persistent due times; provider reviews are due every **60 minutes**, not every minute. Intermediate ticks only resume bounded pending work or verify a staged pair. The legacy daily-target engine is no longer used by `scheduled`. Administrative operations are unconditionally closed unless explicitly reconfigured by code; `ADMIN_DISABLED=true` is deployed. Existing Access resources are preserved but are not a scheduler dependency.

Migration `0002_hourly.sql` is additive: it retains existing data, adds cycles, initial-batch progress and dynamic public content, removes old five-per-day/extra-three settings from the active configuration, and keeps daily consumption/budget limits. Initial batch is `initial-once`, target five distinct events; its progress persists. A restart never creates another initial batch. After five verified publications it marks the initial cycle complete and sets the next regular review 60 minutes later. If fewer topics qualify, it keeps the remaining initial slots and checks again on the next due review without filler.

Each normal cycle has a hard maximum of **three new events**. The first needs normal verified relevance; subsequent stories require exceptional verified importance (score at least 85/100 plus an evidence-based explanation). Relevance is assigned after consulting sources, not from sensational title words. Updates use separate event records linked to the original translation ID and preserve original dates/slugs. URL/provider ID, title similarity, canonical-event keys and known-event context prevent repeated events. Similar headlines add alternative sources to an existing event rather than discarding corroboration. Semantic matching is conservative, not infallible; uncertain cases remain pending.

## Quality and state

A missing/inaccessible primary source prevents drafting. Original articles can yield links to explicitly trusted official domains; up to five sources are consulted with bounded responses/timeouts. There is no paywall bypass. High-risk allegations, incidents, regulatory decisions and material figures require corroboration from independent groups; syndication is not independent corroboration. External text is data, not instructions. Both drafts must pass factual-source, structural, numeric and language checks. A failed language retains the other. A bad topic never blocks another eligible candidate.

Approved complete pairs become `live_pending` when stored. They count as published only after the Worker has read both final URLs and found their ID/revision/language markers. A failed URL check retains the pair/progress and retries verification rather than regenerating the story. Local tests demonstrated a live D1 insert appearing in both initial article HTML responses, home, category and search **without rebuilding**. Test fixtures were never deployed.

## Real runtime credentials and spending

Configure only these encrypted Worker secrets in **Cloudflare → Workers & Pages → econoflux-editorial → Settings → Variables and Secrets**:

- `CRYPTONEWS_API_KEY`.
- `ECONOFLUX_OPENAI_API_KEY` (existing authorized OpenAI API project/credit, not a ChatGPT subscription).

A Codex network-secret placeholder is not a Worker credential. Secret presence is checked through names only; a one-shot preflight runs from the actual Worker and tests the real provider/model/public site. It records a safe result in D1 and publishes nothing. No diagnostic endpoint is exposed.

Safety limits remain **$1/day** of reserved+known AI cost, with 90 AI calls/day and 32 news calls/day. The increased call ceiling accommodates hourly work but does not raise the dollar cap. Unknown costs remain reserved on transport failures. No retry loop spends beyond those bounds. A typical baseline is 24 news queries/day (720/30-day month), plus explicitly bounded diagnostics/retries; a 100-item limit does not establish a subscription's monthly quota. No paid plan was activated.

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

Source discovery for the initial review added only official URLs linked in the original reporting (SEC, KuCoin, Robinhood, Binance). Source fetching, model verification, bilingual generation and public URL confirmation remain required inside the Worker. Larger publisher HTML documents are bounded to 2 MB and the reader isolates article text before evidence assessment. Candidate selection prioritizes already-verified relevance, then available corroboration, then recency; source count never substitutes for verified importance.
