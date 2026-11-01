# Crypto News API — manual review, 2026-11-01

## Verified outcome

`CRYPTONEWS_API_KEY` is configured as a network secret in the managed cloud environment, scoped to `cryptonews-api.com`. The runtime reported it ready and the actual server process could use it. Its value was never printed or committed. This operator job runs in that cloud environment; it does not run in the reader's browser, in Astro builds, or in Pages Functions. Cloudflare Pages does not need this secret for the current workflow.

The official documentation was read at <https://cryptonews-api.com/documentation>. Confirmed endpoint: `/api/v1/category`, `section=general`, required `items`, `type=article`, query-token authentication. Results are newest first. Pagination is unavailable on trial accounts; the documented `datetimerange=DATE+TIME-DATE+TIME` filter can select an earlier interval.

The initial `items=5` calls returned HTTP 403. Diagnosis confirmed the provider message: trial plans allow at most three items per call. Four requests were rejected during diagnosis; whether rejected calls count against billing/quota was not verified. No claim of a bad key or expired subscription is supported by that error.

Two successful, bounded requests (three items and two items before the oldest result, excluding its timestamp) retrieved **five distinct recent news items**. No pagination, automatic retries, or additional news queries were used after the dataset was obtained. Successful results were checked for required fields, parseable timestamps, freshness, uniqueness and the second batch's time cutoff. The user subsequently reported activating a plan allowing 100 items; that new limit has not been tested and no 100-item request was made.

Only title, source, date and original URL are returned by the job. Private cache: `.local/editorial/cryptonews/latest.json`. Its timestamps retain the provider offset; the returned news dates were in UTC−05:00. Public site content remains in preview/noindex mode.

## Draft for review

Selected item: Blockonomi, “Binance Warns Users of Fake $150 Rewards as Withdrawals Resume”, 2026-11-01 15:33:43−05:00.

Original URL: <https://blockonomi.com/binance-warns-users-of-fake-150-rewards-as-withdrawals-resume/>

The original article returned HTTP 403. Two alternative source checks were also unavailable. The draft therefore attributes only the headline received from the API; it does **not** claim independent confirmation of Binance's warning, mechanism, timing or scope. The original primary notice was not verified. This limitation is stated in both languages.

Private review files (ignored by Git and not served by Astro):

- `.local/editorial/cryptonews/REVIEW.md`: English and Spanish texts together.
- `.local/editorial/cryptonews/draft-6cd61e21cd0aaadf0895.json`: shared translation ID, source metadata, both versions, explicit verification limits, `status: draft`, `indexable: false`, `publicationEnabled: false`.

No real news has been added to `src/content/articles.ts`, the website, search or sitemap. No scheduled publishing process is enabled.

## Run and limits

From `/workspace/Econoflux`: `npm run news:fetch`. It reads the secret in the executing process before making any request. The implementation conservatively supports trial limits with two batches (3+2), also usable on a larger plan. One attempt per UTC day is guarded with a local lock; successful results are cached and reused. `--retry-failed` allows one explicit, diagnosed retry after a failed job, never automatic. Diagnostic attempts during this task were separately bounded and recorded privately. Limits are local to this machine, not distributed.

Credentials are sent only to the fixed HTTPS API endpoint through the configured proxy with TLS verification. Proxy-held secret references are preserved for injection; ordinary key values are URL encoded. Redirects are rejected. Authenticated URLs, response error bodies and original exceptions are not logged. Requests have a timeout and response-size cap. HTTP 401/403/429 and invalid responses stop the job.

`npm run test:news` exercises eight tests with fixtures, no API consumption: missing keys, batch sizes, errors, proxy reference encoding, uniqueness/date validation, caching, bounded retry and private draft numeric parity. Passing fixtures do not establish a live provider connection; that was established separately by the two successful requests described above.

## Daily automation remains pending

- Deploy a Cloudflare Worker with Cron Trigger and durable storage (for example D1) for sources, drafts, idempotency, quota accounting and run state. Neither is deployed for this integration yet.
- Configure `CRYPTONEWS_API_KEY` as a **secret of that Worker**, then test availability and authentication in that actual runtime. This environment's secret does not automatically transfer to Cloudflare.
- Implement source verification, content rights checks, bilingual drafting, factual consistency checks, and an explicit approval gate before publication. Integrate the existing editorial pipeline and atomic Pages rebuild/deploy. The current importer never invokes `runPipeline`, which can publish if called.
- Unattended original writing/translation may require a model provider, another key and usage fees. This manually prepared bilingual draft used no additional paid API.
- Crypto News API has its own subscription and quota. Confirm the commercial-use terms of the activated plan. Worker, D1 and Pages have plan-dependent allowances and possible usage costs; eligibility and billing for this account have not been verified. No extra paid service has been activated by this task.
