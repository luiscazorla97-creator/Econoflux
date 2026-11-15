# Academy editorial batch — 2026-11-15 UTC

Owner-authorized one-off publication of ten new topics in English and Spanish.
This is additive content, not a change to automated news publication or budgets.

## Research and intent selection

Public search research covered English and Spanish educational queries, official
product documentation, all 15 existing Academy topics (30 pages), the queued
Academy intent catalog and 186 visible news pages at the initial snapshot.
Selection is qualitative editorial prioritization, not measured Google keyword
volume, ranking difficulty or a claim that these are the absolute ten largest
queries. No Search Console or Keyword Planner dataset was available.

The final topics prioritize recurring user questions and distinct worked examples:

| Topic | Distinct task and added value |
| --- | --- |
| Halving | Calculate subsidy boundaries; separate issuance from price predictions |
| Mining costs | Calculate power, energy, pool costs, depreciation and break-even |
| Lightning | Understand directional liquidity and inspect payment requests |
| DCA | Reproduce weighted acquisition costs and fair lump-sum comparisons |
| Order types | Follow order-book fills, limits, triggers and partial execution |
| Slippage | Separate own price impact from quote-to-execution movement |
| Impermanent loss | Compare LP value with the original holding benchmark |
| Liquidations | Calculate weighted collateral buffers under explicit assumptions |
| APR/APY | Normalize rates and distinguish token income from cash return |
| NFT ownership | Inspect token, metadata, media and external rights separately |

An initial FDV draft was excluded after finding the existing bilingual news
explainer. It was not published or committed; the existing explainer is linked
from DCA. Existing pillar definitions are only supporting context; each new page
solves the narrower task above. No existing article body or publication date is
edited. New topic scopes also distinguish all queued intents.

## Sources, authorship and validation

`topics.json` contains localized SEO, scope, internal destinations and citations.
`evidence/retrieval.json` records 30 official source URLs, retrieval dates and
content hashes. Raw retrievals and prepublication database snapshots remain in
private `.local/academy-batch-2026-11/`; they are not deployed or committed.
Sources include Bitcoin documentation, Lightning Labs/BOLTs, Investor.gov,
FINRA, Coinbase/Kraken order rules, Uniswap, Aave, Ethereum EIPs and IPFS.

The prose is original AI-assisted editorial work with authored hypothetical
examples. Factual/bilingual review was performed in this task; no independent
human reviewer or paid AI audit is claimed. `validate.py` independently recomputes
worked arithmetic, enforces 1,500–2,500 words and validates source/link coverage.
The existing site's editorial byline, disclosure and correction links remain.

`images.py` creates twenty distinct localized educational diagrams in 1200px and
640px WebP, plus 1200×630 PNG social images. Alt text explains the actual chart.
No paid image service or publication-generation API was used.

## Publication and preservation

`publication.py stage` inserts only new topic IDs and hidden bilingual rows. It
refuses existing IDs/slugs. `publication.py publish` checks exact staged content
and deployed assets, then exposes all twenty rows in one database statement.
It never writes news tables, controls, quotas, secrets, Worker code or cron.
The ordinary Academy review date is set about 90 days after source review.
The explicit batch is outside the ordinary daily production workflow; the
existing scheduler and quota implementation are not modified.

The sole rendering addition is optional internal links for guide sections. Old
articles have no such field and keep their existing output. Canonical, hreflang,
Article, BreadcrumbList, localized routes and dynamic sitemaps reuse the existing
server rendering. No redirects, old URL changes or destructive migrations.

Run `python editorial/academy-2026-11-15/validate.py` for content checks. The
validation helper uses this task's private initial snapshot; for future audits,
replace it with a fresh read-only catalog snapshot before using that comparison.
`node scripts/verify-academy-batch.mjs` checks the twenty live pages at 390px and
1440px, server HTML, language links, schema, image loading and sitemap membership.
Local preview uses `ACADEMY_VERIFY_ORIGIN=http://127.0.0.1:4330`.

Indexability is verified technically; Google indexing, impressions and ranking
improvements cannot be established at publication time and are not promised.
