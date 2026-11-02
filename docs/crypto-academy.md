# Crypto Academy

Academy extends the existing Astro/Cloudflare Pages publication and D1 database.
The news tables, event quotas, APIs, domain, ads and original article URLs remain
in use. There is still **one** Worker cron, `* * * * *`.

Public routes are `/en/academy/`, `/es/academia/`, their eight category pages, and
`/en/academy/guides/{slug}/`, `/es/academia/guias/{slug}/`. All content, sources,
canonical/hreflang, Article JSON-LD, OG/Twitter and sharing links render on the
server, including newly inserted D1 guides without a rebuild.

## Calendar and safeguards

- New topics: Monday, Wednesday, Friday at **10:00 UTC**, maximum three distinct
  topics per Monday–Sunday UTC week. Actual publication follows completed checks;
  this is not a promise to publish unverified material at exactly 10:00.
- The three initial guides count in their actual publication week. No additional
  weekly topics are added to that week after the initial three are published.
- Guides have independent tables/slots and never consume news cycle reservations.
- News executes first; Academy yields to a working news phase, urgent pending
  articles, the general pause or insufficient shared budget. Separate D1 leases
  prevent concurrent Academy execution.
- Existing `gpt-5-mini` rates/model are unchanged. All model requests reserve and
  settle against the same atomic daily usage row and **US$3 total daily cap**.
  Academy additionally leaves $0.50 and 24 calls of headroom for news, and defers
  when remaining capacity cannot support a complete guide. Visitors trigger no AI.
- Persisted phases: sources → SEO/fact plan → EN → ES → independent factual and
  bilingual audit → atomic D1 pair → real HTTPS confirmation. Failed phases do
  not publish partial translations. Bounded retries end in a blocked private job.
- Intent keys and language/slugs are unique. Planning compares all existing scopes
  before drafting. A curated topic queue covers the initial library; when depleted,
  a bounded planning call proposes a distinct supporting intent using only the
  official document registry. Unsupported sources/intents remain unpublished.

## Research, maintenance and images

Official documents are fetched by the actual Worker. Curated official repository
Markdown is an explicit mirror for some Ethereum documentation; public citations
point to the corresponding official page. Consulted excerpts, hashes, fact/SEO
plans, audit results, phase checkpoints and per-guide AI costs stay in private D1.
Keyword choices are editorial inference; there are no invented volume/rank metrics.

Every published topic gets a source check after about 90 days. Relevant security,
protocol or regulatory developments in published news can bring that check forward.
Identical evidence hashes complete the check without modifying public content.
Changed documents require a material-change decision before rewriting and auditing.
Revisions preserve both URLs and publication dates; only actual revisions set
`updatedAt`. Legal/tax topics require a jurisdiction, current official evidence and
an explicit reference date; inaccessible/currently unclear rules are deferred.

Relevant news and guide cards are matched from the topic vocabulary on the server,
limited to the reader's language and published content. Guide-to-guide suggestions
use the actual topic cluster; recent-news recommendations have a 45-day window.

Each topic receives an original EconoFlux vector diagram and a corresponding
1200×630 PNG for social crawlers, stored in D1 and served by Pages over HTTPS.
These are conceptual illustrations, not photographs of events. Assets use no
third-party photographs, proprietary fonts or external image service. **Paid
OpenAI image generation remains disabled.** No new service or paid plan is needed.

## Operation

Migration `0008_academy.sql` is additive. Seed specifications live in
`automation/src/academy-topics.ts`; the deployed D1 catalog is persistent. Academy
control is `academy_control.enabled/paused`. Turning it off does not disable news.
General editorial pause also prevents further guide work. The admin endpoint stays
closed behind the pre-existing Access policy; no public manual generation endpoint
or secret was introduced. Never put API keys into topic data, public JSON or logs.

Checks: `npm run check`, `npm run check:editorial`, `npm run test:editorial`,
`npm run build:production`, `npm run test:dynamic`. The Academy unit suite covers
UTC scheduling, weekly quota, news priority/budget deferral, atomic bilingual
publication, revision URL/date preservation, route localization and relevance.
Deployment continues through the existing Git-connected Pages project `econoflux`.
