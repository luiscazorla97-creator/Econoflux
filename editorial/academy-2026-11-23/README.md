# Three bilingual Academy guides

Owner-authorized addition of three new guides (six pages), requested directly in the conversation. Existing guides, news records, automation settings and Worker deployment are outside the write scope.

## Topic selection and overlap review

The production inventory was read before drafting: 50 existing guide pages (25 translation pairs), all 56 registered Academy topics including queued work, and the full news inventory. Searches in English checked recurring educational questions and primary documentation. Selection is qualitative editorial inference; no keyword-volume, Search Console or ranking measurements are claimed.

- **Proof of reserves:** interpreting scope, liabilities, inclusion proofs and professional reports. Existing exchange custody content addresses withdrawals; the existing Binance news article covers a dated announcement. This guide explains a reusable evaluation method and links to that report without upgrading its unconfirmed claims.
- **Price oracles:** the data path, units, update triggers and failure behavior. The existing smart-contract introduction only establishes the dependency; the liquidation guide handles loan mechanics. This guide investigates the input price and integration, not another liquidation or contract-verification tutorial.
- **Bitcoin full nodes:** planning independent verification, storage, synchronization and wallet integration. Separate from the Bitcoin overview, payment-confirmation guide and mining-cost guide. No automatic node-income promise and no hardcoded current hardware or version requirements.

## Content and source review

Six individually written and reviewed language versions, 1,749–1,930 words including summary and section headings. Natural Spanish and English metadata and descriptive URLs. Ten primary documents retrieved successfully; timestamps and SHA-256 evidence are in `evidence/retrieval.json`. Raw research snapshots and database baselines are private local working files, not deployment assets.

Sources include PCAOB investor-advocate and SEC educational publications, Ethereum developer documentation, Chainlink technical documentation, Bitcoin.org, Bitcoin developer documentation and official Bitcoin Core release-verification instructions. Kraken's page is explicitly labeled as provider methodology, not independent solvency evidence or endorsement. The U.S. audit references are jurisdictionally qualified. No current reserve ratios, prices, yields, disk-size figures or feed thresholds are asserted.

Author factual and bilingual review was performed; this is not represented as an independent human review. The source retrieval date is not passed off as a source publication date. `validate.py` separately recomputes reserve ratios, deviation percentages, decimal scaling, health factors and electricity costs from the example inputs.

## Images and SEO

Three original explanatory figures, each localized into both languages. Each has a 1,200-pixel and 640-pixel WebP plus a PNG social image, explicit dimensions and descriptive ALT. All examples are identified as hypothetical. Figures preserve their full aspect ratio and have the existing full-size viewing link.

Every page has a distinct localized SEO title, description, H1, structured H2/H3 sections, FAQ, contextual internal links and official sources. Existing server rendering supplies self-canonical, reciprocal en/es/x-default hreflang, Article and BreadcrumbList JSON-LD, social metadata and automatic sitemap discovery. No FAQ rich-result eligibility or Google ranking outcome is promised.

## Publication and checks

`publication.py stage` rejects existing IDs and slugs, stages only these six rows with visibility off, and records the owner-authorized provenance. After asset deployment, `publish` verifies exact staged content and public image availability before one atomic visibility update for all six pages. It does not write any news table or automation control.

Local production build and Astro checks passed (one existing deprecated-copy API hint). Browser checks cover each language at 390 and 1,440 pixels: response status, complete content length, titles, headings, localized metadata, canonical/hreflang, schema, WebP decoding, ALT, uncropped image dimensions, contextual links, social assets, no horizontal overflow and no uncaught JavaScript errors. Thirty pre-existing internal destinations return HTTP 200. A Spanish news slug mismatch was caught and corrected before publication.

Final live checks, deployed revision, sitemap inclusion, page URLs and preservation comparisons are recorded alongside this file after publication. Indexability is a technical state, not confirmation of Google indexing. Browser timing is a lab observation, not field Core Web Vitals.

## Published result

All six public URLs passed both viewport checks, including indexable robots directives, exact SEO titles, reciprocal language references and sitemap inclusion. Both Academy hubs expose the three new guides. Production comparisons confirm all 50 pre-existing guide rows and all 242 existing news rows remain identical, with news controls unchanged. The library now has 28 bilingual guides (56 pages). See `release.json`, `live-verification.json`, `preservation.json` and `published-urls.csv`.
