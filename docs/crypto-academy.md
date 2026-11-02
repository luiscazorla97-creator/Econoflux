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
- The owner-authorized launch on **2026-11-02** permits a total library of ten
  specified topics today, including the three already published. Migration
  `0012_academy_launch.sql` defines this dated exception, disabled until explicitly
  activated in D1. It expires at 2026-11-03 00:00 UTC or ends once all ten are
  published; it cannot admit unrelated topics or duplicate existing guides.
  Later routine publication remains three per week, with the next full regular
  cycle beginning **2026-11-09 10:00 UTC**. Failed or budget-deferred launch
  topics remain private/pending and can take future regular slots.
- Guides have independent tables/slots and never consume news cycle reservations.
- News executes first. During the dated launch, a guide may use the turn after a
  completed routine news phase; outside the launch Academy yields when news used
  that phase. Urgent articles, the general pause and insufficient shared budget
  still defer guide generation. Separate D1 leases prevent concurrent Academy
  jobs. The news scheduler, ten-minute API reviews and hourly publication quotas
  are unchanged. Private tick outcomes make actual progress observable.
- Existing `gpt-5-mini` rates/model are unchanged. All model requests reserve and
  settle against the same atomic daily usage row and **US$3 total daily cap**.
  The technical daily call ceiling is 240 (previously 160), giving the authorized
  launch room without consuming the original news allowance or raising the $3 cap.
  Academy additionally leaves $0.50 and 24 calls of headroom for news, and defers
  when remaining capacity cannot support a complete guide. Already-audited
  publication and HTTPS confirmation can finish without another model request.
  Visitors trigger no AI.
- Persisted phases: sources → SEO/fact plan → EN → ES → independent factual and
  bilingual audit anchored to exact quoted passages → atomic D1 pair → real HTTPS confirmation. Failed phases do
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
use the actual topic cluster plus explicit introductory curriculum connections;
only published guides in the selected language become links. Recent-news
recommendations have a 45-day window.

Each topic receives an original EconoFlux vector diagram and a corresponding
1200×630 PNG for social crawlers, stored in D1 and served by Pages over HTTPS.
The launch adds topic-specific Bitcoin ledger, Ethereum comparison, validator,
Layer 2, DeFi pool and exchange-network diagrams. These are conceptual
illustrations, not photographs of events. Assets use no
third-party photographs, proprietary fonts or external image service. **Academy diagrams do not call a paid image API.** News illustrations use the
separately owner-authorized OpenAI Images workflow, within the same $3/day cap. No new service or paid plan is needed.

## Operation

Migration `0008_academy.sql` is additive. Seed specifications live in
`automation/src/academy-topics.ts`; the deployed D1 catalog is persistent. Academy
control is `academy_control.enabled/paused`; the dated batch has independent
`academy_launch.enabled` and a fixed topic list. Turning it off does not disable news.
General editorial pause also prevents further guide work. The admin endpoint stays
closed behind the pre-existing Access policy; no public manual generation endpoint
or secret was introduced. Never put API keys into topic data, public JSON or logs.

Checks: `npm run check`, `npm run check:editorial`, `npm run test:editorial`,
`npm run build:production`, `npm run test:dynamic`. The Academy unit suite covers
UTC scheduling, weekly quota, news priority/budget deferral, atomic bilingual
publication, revision URL/date preservation, route localization and relevance.
Deployment continues through the existing Git-connected Pages project `econoflux`.

## Published initial guides (2026-11-02)

- Scam prevention: `/en/academy/guides/protect-crypto-from-scams/`,
  `/es/academia/guias/proteger-criptomonedas-estafas/`.
- Cold wallets: `/en/academy/guides/cold-wallet-how-it-works-risks/`,
  `/es/academia/guias/wallet-fria-como-funciona-riesgos/`.
- Ethereum gas: `/en/academy/guides/ethereum-gas-fees-explained/`,
  `/es/academia/guias/comisiones-gas-ethereum/`.

All six pages, sixteen category pages and fourteen editorial/transparency pages
were checked on the real domain. EN/ES guide checks cover desktop 1440px and
mobile 390px, original images/social PNGs, server HTML/schema, canonical/hreflang,
sharing/copy links and sitemap membership. `scripts/verify-academy.mjs` repeats
these checks (default requires at least three topics). The initial three consume
the week’s ordinary quota; the subsequently authorized ten-topic launch is the
dated exception described above. The next ordinary slot is 2026-11-09 10:00 UTC,
05:00 America/New_York. News reviews run every ten minutes throughout, with
separate hourly publication windows.

The first guide received a targeted safety correction; the cold-wallet guide
received a bilingual cleanup and recovery clarification. Both preserve their
original slugs and publication dates and show genuine modification dates and
correction notices. The generation prompt and validation now reject drafting
artifacts; factual findings require a passage that actually exists in the guide.
Rejected drafts receive limited targeted patches rather than full rewrites.
