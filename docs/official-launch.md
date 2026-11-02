# EconoFlux: official launch and operating guide

For the current ten-minute news cadence and confirmed/rumor/leak policy, see [reporting-automation.md](reporting-automation.md). It supersedes older source-selection and poll-frequency statements here.

Current scope supersedes the preview-only and panel-era notes. Main site: **https://econoflux.com/en/** and **https://econoflux.com/es/**. Existing Pages/GitHub, Worker and D1 are retained. No new paid plan, service or billing setting was activated.

## Domain and indexing

The existing active Cloudflare zone was checked before changes; it contained no DNS records. Only two proxied CNAME records were created, `econoflux.com` and `www.econoflux.com`, both targeting `econoflux.pages.dev`. No email or unrelated records were changed. Both custom domains have active Pages HTTPS validation and were tested by a real Chromium browser without disabling certificate checks.

Production uses `PUBLIC_LAUNCH=true`. Public official-host HTML is indexable. www and the stable pages.dev hostname redirect permanently to the official host. Deployment/branch previews remain noindex. Search, errors and private/API operations remain excluded. Canonical and reciprocal hreflang use the official domain. The sitemap queries real visible D1 articles and changes without rebuilding, with both languages, real last-modified values and alternate-language links. Robots advertises this sitemap. The full article and social metadata are in the initial server-rendered HTML.

## Reporting and publication

The original five events were expanded in place, not republished as new events. IDs, slugs and original publication timestamps were preserved; actual content revisions have updated timestamps. Sources were reread, including accessible official announcements, the SEC complaint and Robinhood's report. Research snapshots retain provenance privately. Both translations passed independent review in the real Worker before its public URL checks completed.

Targets are 900–1600 words for well-supported important news and 1500–2200 for justified analysis; urgent/thin evidence permits shorter accounts. No minimum-word quota, invented background or filler is allowed. Source extraction, structured fact/SEO planning, English writing, Spanish writing, independent bilingual review and public URL confirmation are persistent phases. Keywords/search intent are explicitly editorial inference; no search volumes are invented. Existing relevant IDs may provide internal links. Reading time and schema wordCount derive from real text, lists and tables. Authors identify AI assistance honestly.

One existing minute dispatcher resumes saved work; **news reviews are due every 60 minutes**. Normally one story, exceptionally up to three distinct highly important verified stories, and none when evidence is insufficient. The initial five cannot run twice. Updates do not consume new-story slots. Independent price/image tasks cannot create another news schedule. The existing shared model expenditure ceiling remains **$3/day**, including conservative/unknown reservations; it is not a spending goal. Daily accounting uses America/New_York. No reader visit calls a paid writing or news provider.

Pause news using `UPDATE automation_control SET paused=1 WHERE id=1;` in Cloudflare D1, or ask the assistant “Pausa EconoFlux”. Public administrative routes remain disabled.

## Images and rights

Five original subject-specific 3D illustrations are live, shared by their EN/ES pair. WebP main images are 1280×853, approximately 118–146 KB; 768px thumbnails are available. Separate JPEG social crops are 1200×630, approximately 149–176 KB. Initial files and provenance: `src/content/editorial-assets.json`. Captions distinguish conceptual AI illustrations from event photographs.

`src/content/licensed-assets.json` records two individually checked archive portraits: Donald Trump (2017, official US-government photograph identified as public domain on its Commons page) and Elon Musk (2018, Debbie Rowe, CC BY-SA 3.0). Their original sources, creator, license URL and resizing/letterboxing are recorded. The Musk adaptation is distributed under the same CC BY-SA 3.0 license. These are archive portraits, never current-event photos. Only ready assets with verified rights and a matching subject are eligible; an asset is reserved to one event and reused only for its language pair. Unknown websites and news API photos are not presumed licensed. This is a curated rights registry, not unrestricted web image scraping.

Paid image generation was explicitly authorized by the owner on 2026-11-02. The real Worker generated three distinct subject-specific WebP illustrations with `gpt-image-1-mini`, medium, 1536×1024. `image_control.enabled=1` and `approved_at` record that authorization. This uses the existing OpenAI secret, shared $3/day cap and D1 storage; no new service, key or plan. News with `IMAGES_REQUIRED=true` reserves a single eligible news slot, obtains its own approved illustration, then publishes both languages atomically. Unused verified archive photos can be assigned to a matching subject once. A ready image is required; repeated generic images are not a publication fallback.

Durable pending claims and a unique image-content fingerprint prevent repeated billable requests and identical generated assets. Generation records actual token usage with conservative price flooring, or retains the $0.03 reservation if usage is uncertain. Budget exhaustion defers until the next America/New_York editorial day. Explicit temporary rate/server rejections back off 15 minutes; authorization/billing failures stop image calls without stopping hourly source checks. Existing complete news stays visible.

Official output-price estimate for **gpt-image-1-mini, medium, 1536×1024**:

| Images/day | Image output estimate/day |
| --- | --- |
| 24 | $0.36 |
| 48 | $0.72 |
| 72 | $1.08 |

Approximately **$0.015/image output**, plus text input. These are estimates, not measured image invoices. They share the $3/day ceiling with article research/writing/review. A conservative $0.03/request reservation is configured; unknown image cost stays reserved. Model access alone does not prove generation authorization or image quality. Source checked: https://developers.openai.com/api/docs/guides/image-generation (legacy model output-price table). The owner has authorized this model and cost; actual usage varies with prompt length. No more expensive image model was activated.

## Crypto Prices (Beta)

Official endpoint: `https://cryptonews-api.com/api/v1/ticker-price`, tickers BTC,ETH,SOL. A real Worker request returned HTTP 200 on the existing plan. `price_usd`, `price_change_percent_24h` and `last_updated` are used; dollar change is not mistaken for percent change. Prices are fetched from the Worker only, at approximately 15-minute intervals and stored in shared D1. Visitors read stored data. Failed refreshes preserve the last valid complete quote set and timestamp; missing values are not invented. The UI shows USD, signed/color-coded 24h change, UTC time and the provider delay notice, including a stale state.

This normally uses **96 price requests/day**, plus approximately 24 news reviews/day; the separate price safety limit is 100/day. The price task does not consume the local 32/day news-request ceiling. Endpoint access was proven, but items/request does not establish the subscription's monthly allowance. No provider plan was upgraded. Raw credential URLs and secrets are never logged or returned.

## Sharing and social cards

Every article uses the shared component near its title and after its body. WhatsApp, Facebook, X, Telegram, LinkedIn and copy-link targets use the official article URL in the selected language. Supported browsers expose Web Share; alternatives remain available. No social account posting or third-party sharing SDK is involved.

Open Graph and Twitter metadata come from the stored article in initial HTML, including its own title, description, image, language URL, type and dates. Current social images are real public 1200×630 HTTPS JPEGs. Live tests checked all ten pages at desktop/mobile widths, links for all five platforms, actual clipboard copying, a simulated native-share capability/payload, sitemap, robots, aliases and price data. JavaScript-disabled requests with Facebook, Twitter, LinkedIn and WhatsApp user agents returned the correct initial metadata. This proves delivery to a crawler-like client; it is not proof of a post rendered inside each social network or a guarantee that a network will invalidate a previously cached preview immediately.

## Google Search Console: owner action

1. Sign in at https://search.google.com/search-console/ with the Google account that should own the property.
2. Add a **Domain property** for `econoflux.com`. Use Cloudflare's verification option if offered, or add the exact TXT verification value supplied by Google. The value cannot be invented by this project.
3. After ownership is verified, submit **https://econoflux.com/sitemap.xml** and inspect a real EN/ES article URL.

No Google account credential is configured here, so Search Console ownership/submission is not claimed complete. Allowing indexing is not a promise of immediate Google indexing or search rankings.

## AdSense

The owner-provided AdSense script is included once in the shared HTML head on the official site, in EN and ES. Preview hosts do not load it. `/ads.txt` lists the supplied publisher as a direct Google seller. Existing manual ad placements were not moved or invented; new ad-unit IDs and Auto Ads settings were not configured. Advertising delivery, site approval and applicable consent messaging remain controlled in the owner’s Google AdSense account. Privacy disclosures in both languages now describe Google advertising and link to its partner-sites policy. This integration does not create a paid Google Ads campaign.
