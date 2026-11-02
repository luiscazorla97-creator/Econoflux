# Crypto Academy

> **Owner-authorized update (2026-11-02):** one new bilingual guide every day,
> up to seven distinct topics per week. News retains ten-minute reviews and
> independent hourly publication windows. The shared AI ceiling is now US$6/day,
> covering news writing, news images and Academy; no additional service is used.

Academy extends the existing Astro/Cloudflare Pages publication and D1 database.
The news tables, event quotas, APIs, domain, ads and original article URLs remain
in use. There is still **one** Worker cron, `* * * * *`.

Public routes are `/en/academy/`, `/es/academia/`, their eight category pages, and
`/en/academy/guides/{slug}/`, `/es/academia/guias/{slug}/`. All content, sources,
canonical/hreflang, Article JSON-LD, OG/Twitter and sharing links render on the
server, including newly inserted D1 guides without a rebuild.

## Calendar and safeguards

- New topics: **every day at 10:00 UTC**, maximum one distinct guide per UTC day
  and seven per Monday–Sunday UTC week. Both complete languages count as one
  topic. Actual publication follows completed checks;
  this is not a promise to publish unverified material at exactly 10:00.
- The owner-authorized launch on **2026-11-02** permits a total library of ten
  specified topics today, including the three already published. Migration
  `0012_academy_launch.sql` defines this dated exception, disabled until explicitly
  activated in D1. It expires at 2026-11-03 00:00 UTC or ends once all ten are
  published; it cannot admit unrelated topics or duplicate existing guides.
  Named topics actually published within an activated launch window do not consume
  the ordinary weekly allowance. They still fill their actual UTC publication day,
  preventing another ordinary guide on launch day. With the daily update deployed
  on November 2, the next ordinary turn is **2026-11-03 10:00 UTC**. Failed or
  budget-deferred topics remain private/pending and can take future daily slots.
- Publication rechecks the daily and weekly allowance after all quality checks.
  Delayed work uses the actual publication day's slot; missed days do not create
  catch-up bursts. A quota deferral preserves audited work and retries at the next
  allowed turn without consuming another quality retry or making a model request.
  Revisions retain the original publication date and do not count as new topics.
- Guides have independent tables/slots and never consume news cycle reservations.
- News executes first. During the dated launch, a guide may use the turn after a
  completed routine news phase; outside the launch Academy yields when news used
  that phase. Urgent articles, the general pause and insufficient shared budget
  still defer guide generation. Separate D1 leases prevent concurrent Academy
  jobs. The news scheduler, ten-minute API reviews and hourly publication quotas
  are unchanged. Private tick outcomes make actual progress observable.
- Existing `gpt-5-mini` rates/model are unchanged. All model requests reserve and
  settle against the same atomic daily usage row and **US$6 total daily cap**.
  The technical daily call ceiling is 480 (previously 240), proportionate to the
  owner-authorized increase from US$3 to US$6. Existing expenditure and uncertain
  reservations remain counted when the ceiling changes; usage is never reset.
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

The expanded launch also used explicitly recorded public-HTTPS research from the
managed cloud environment for BIP39 recovery terminology, optimistic-rollup
operator risks and current issuer network directories. Retrieval provenance and
evidence remain in the private job payloads. The curated source registry includes
these official documents for subsequent Worker maintenance. In particular, a
legacy-chain list in Tether's introductory page does not establish current issuer
support: the comparison checks its supported/deprecated-protocol directory and
Circle's official contract directory.

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
separately owner-authorized OpenAI Images workflow, within the same $6/day cap. No new service or paid plan is needed.

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
these checks (default requires at least three topics). The initial three and the
subsequently completed ten-topic launch are historical batches. The daily
policy above supersedes their earlier three-per-week calendar; their existing
URLs, content and dates are retained. News reviews run every ten minutes
throughout, with separate hourly publication windows.

The first guide received a targeted safety correction; the cold-wallet guide
received a bilingual cleanup and recovery clarification. Both preserve their
original slugs and publication dates and show genuine modification dates and
correction notices. The generation prompt and validation now reject drafting
artifacts; factual findings require a passage that actually exists in the guide.
Rejected drafts receive limited targeted patches rather than full rewrites.

## Completed expanded launch — 2026-11-02

The library contains ten distinct guides and twenty complete EN/ES pages. Seven topics were added; the three existing guides retained their URLs and content. All pairs passed independent review and live HTTPS confirmation. Ten original illustrations have distinct pixel content and matching 1200×630 social PNGs.

| Topic               | English                                                                             | Español                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Bitcoin             | [EN](https://econoflux.com/en/academy/guides/what-is-bitcoin-how-it-works/)         | [ES](https://econoflux.com/es/academia/guias/que-es-bitcoin-como-funciona/)                            |
| Ethereum vs Bitcoin | [EN](https://econoflux.com/en/academy/guides/what-is-ethereum-bitcoin-differences/) | [ES](https://econoflux.com/es/academia/guias/que-es-ethereum-diferencias-bitcoin/)                     |
| Cold wallets        | [EN](https://econoflux.com/en/academy/guides/cold-wallet-how-it-works-risks/)       | [ES](https://econoflux.com/es/academia/guias/wallet-fria-como-funciona-riesgos/)                       |
| Scam prevention     | [EN](https://econoflux.com/en/academy/guides/protect-crypto-from-scams/)            | [ES](https://econoflux.com/es/academia/guias/proteger-criptomonedas-estafas/)                          |
| USDT vs USDC        | [EN](https://econoflux.com/en/academy/guides/usdt-usdc-differences/)                | [ES](https://econoflux.com/es/academia/guias/usdt-usdc-diferencias/)                                   |
| DeFi                | [EN](https://econoflux.com/en/academy/guides/defi-beginner-risks/)                  | [ES](https://econoflux.com/es/academia/guias/defi-principiantes-riesgos/)                              |
| Ethereum gas        | [EN](https://econoflux.com/en/academy/guides/ethereum-gas-fees-explained/)          | [ES](https://econoflux.com/es/academia/guias/comisiones-gas-ethereum/)                                 |
| Staking             | [EN](https://econoflux.com/en/academy/guides/crypto-staking-how-it-works-risks/)    | [ES](https://econoflux.com/es/academia/guias/staking-criptomonedas-como-funciona-riesgos/)             |
| Layer 2             | [EN](https://econoflux.com/en/academy/guides/layer-2-networks-risks/)               | [ES](https://econoflux.com/es/academia/guias/redes-layer-2-riesgos/)                                   |
| CEX and DEX         | [EN](https://econoflux.com/en/academy/guides/centralized-decentralized-exchanges/)  | [ES](https://econoflux.com/es/academia/guias/exchanges-centralizados-descentralizados-como-funcionan/) |

Live verification covered all twenty pages at desktop/mobile sizes, individual server-rendered SEO/social metadata, images, translations, sharing/copy, category navigation and sitemap. The dated launch is complete and disabled; ordinary Academy scheduling remains enabled.

The public byline is now EconoFlux Editorial / Redacción EconoFlux, with the publication represented as an Organization in structured data. Methodology pages retain the actual process description. The price ticker occupies one line; delay/update details are available through its information button, with horizontal scrolling on smaller screens. These are presentation changes; source feeds, shared caching and news scheduling are retained.
