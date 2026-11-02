# EconoFlux: estimated costs and capacity

**Architecture update:** the current [hourly workflow](hourly-automation.md) serves stored articles directly from D1 through Astro/Pages. New stories require **zero builds**; the historical per-story Pages build table below no longer applies. Public requests now consume Pages Functions/D1 usage, subject to the account’s actual free/paid limits. No plan was upgraded. The existing model dollar cap remains $1/day; this is a safety ceiling, not a billing guarantee.

Sources checked 2026-11-01; USD before taxes. Estimates are assumptions, not measured invoices or promises of unlimited capacity.

## News provider

Existing Crypto News API subscription is paid/configured by the owner; its exact plan price, renewal and monthly quota are not exposed to this task. Do not invent a cost or infer a quota from a 100-item response limit. Check [pricing](https://cryptonews-api.com/pricing) and the account's Key & Details page. The provider's public FAQ distinguishes commercial-use plans from the Basic non-commercial plan.

A ten-minute schedule requires **144 news requests/day, approximately 4,320 per 30-day month**, independent of whether the daily publishing goal is 5, 10 or 20. One call returns up to 20 recent article candidates; there is no pagination or extra event endpoint in the initial adapter. Provider-side caches and publication timestamps do not prove an event is new. Retries, additional source discovery or later endpoint choices can increase usage. The default local safety budget is 160 provider calls/day, not a contractual provider allowance.

## Scheduled writing and verification

Chosen adapter: OpenAI Responses API, **gpt-5-mini**, with no paid web-search/image tools. Official [model pricing](https://developers.openai.com/api/docs/models/gpt-5-mini): **$0.25/1M input tokens, $2.00/1M output tokens**, standard non-batch rates. Cached discounts are not assumed. A separate OpenAI API project key/billing entitlement is needed; a ChatGPT subscription is not an API credit allowance. No model API calls were made in this implementation task.

Assume three model calls per completed story: source-evidence verification, English drafting, Spanish drafting from the verified facts and English version. Across these calls assume **14,000 input and 6,000 billable output tokens/story**, including both languages and any billed reasoning output. Estimated cost/story: `14000×0.25/1e6 + 6000×2/1e6 = $0.0155`.

| Target, original stories/day | Language pages/day | Stories/30 days | Estimated model cost/month | With 25% retry/extra-verification allowance |
| --- | --- | --- | --- | --- |
| 5 | 10 | 150 | $2.33 | $2.91 |
| 10 | 20 | 300 | $4.65 | $5.81 |
| 20 | 40 | 600 | $9.30 | $11.63 |

Three extraordinary stories on every day add 90/month: **about $1.40** model cost, or $1.74 with the illustrative 25% allowance. Unpublished candidates that undergo verification, a long article, repeated corrections, source checks, failed translations and reasoning output can increase cost beyond this table. Shorter actual output can reduce it. The code reserves a conservative request maximum before calling the model and settles only known usage; unknown failure costs stay reserved.

Safety defaults: **$1/day** model budget and **30 calls/day** (at least three calls per normal story, with variation/retries). A 20/day goal needs more calls than this default, so the panel reports a capacity limit rather than silently raising it. Model/rate changes require updating the priced adapter; the panel cannot accept an arbitrary unpriced model.

## Images

**$0 of new image-generation API calls** in this architecture. Reuse the existing EconoFlux-generated illustrations, with honest illustration labels and alt text. No assumption that provider image links carry republication rights. Any later paid image service needs separate approval and pricing.

## Execution and storage

Official [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/) was verified through the [official documentation repository](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/workers/platform/pricing.mdx). Free includes 100,000 requests/day but only **10 ms CPU/invocation**; eligibility and measured CPU for this JWT/AI/SQL workload are not verified. A minute trigger means about 43,200 scheduled invocations/month before panel traffic, not 43,200 news API calls. Paid Workers starts at **$5/account/month**, includes 10M requests/month and 30M CPU-ms/month, then usage charges. **Do not upgrade or activate billing without owner authorization.** Network waiting and CPU are different metrics; this table does not guarantee the free plan can execute this workload.

Official [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [pricing source](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/partials/workers/d1-pricing.mdx): Free allowances **5M rows read/day, 100k rows written/day, 5GB total**. Paid includes 25B reads/month, 50M writes/month, 5GB, then $0.001/M extra reads, $1/M extra writes, $0.75/GB-month. Actual queries/indexes count rows, not just requests. Expected editorial volume is modest, but measured production storage/CPU and the account plan are pending. Logs/history need an operator-reviewed retention/archive policy as volume grows; nothing silently deletes published history.

Cloudflare Access requires account setup and an allowed administrator. Current account eligibility/seat pricing is not verified; no paid Access plan is activated here.

## Compilation and deployment

One new story uses one Git commit containing both languages and ordinarily one Pages build. Updates, retries and code pushes add builds. Automatic Git triggers plus explicit deployment reconciliation may race, so the publisher reuses an existing deployment for the same commit when observed; budget headroom is necessary for a provider-side trigger race.

Official [Pages limits](https://developers.cloudflare.com/pages/platform/limits/), [source](https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/docs/pages/platform/limits.mdx): Free **500 builds/month**, Pro 5,000, Business 20,000.

| Stories/day | Base builds/30 days | With all 3 extraordinary stories/day | Free allowance implication |
| --- | --- | --- | --- |
| 5 | 150 | 240 | Headroom remains before updates/retries/code pushes |
| 10 | 300 | 390 | Limited headroom with heavy updates/retries |
| 20 | 600 | 690 | Exceeds Free 500 even before updates/retries |

The code defaults to eight build attempts/day, so a target above eight already reports an operational limit. Raising that cap does not increase the provider's monthly allowance. At 20/day, a higher Pages allowance, an approved batched-release design, or a separately authorized dynamic-content migration would be necessary. No paid Pages plan or architectural migration has been activated. Domain/DNS and launch indexation remain separate steps.
