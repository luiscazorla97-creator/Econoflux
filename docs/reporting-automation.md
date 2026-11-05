# Ten-minute reviews and evidence tiers

Current owner-authorized publication quotas are documented in [daily-mix.md](daily-mix.md); they supersede the historical volume limits below when `editorialDailyPlan=true`.

This document supersedes the mandatory-primary and hourly-poll rules in older launch notes. The existing `econoflux-editorial` Worker, D1 and single minute dispatcher remain; no second scheduler or service was created.

## Cadence and consumption

Migration `0011_reporting_policy.sql` adds durable poll claims, origin links and report follow-ups. Runtime `settings.reportingPolicy=2`, `intervalMinutes=10`, `dailyNewsCalls=150` and `automation_control.poll_interval_minutes=10` enable this policy. Enable/pause flags are preserved. On 2026-11-02 the owner raised the shared monetary ceiling from **$3/day to $6/day**, covering all AI text and news images, with a proportionate technical safety ceiling of 480 AI requests/day. Previously consumed and reserved costs remain counted. Academy has its own one-guide-per-day schedule and never consumes a news publication slot. Polls align to ten-minute UTC boundaries; actual requests are recorded in `news_polls`. Unique slot claims prevent concurrent calls for one interval. Provider limits honor bounded Retry-After backoff; authorization failures back off rather than retrying every minute. Credentials are never recorded in diagnostics.

Each wall-clock hour has one publication window despite its six reviews. Normal new stories require relevance >=60, normally one per hour. Extras require exceptional relevance >=85 or verified urgency. The owner authorized up to **five distinct new stories per hour** on 2026-11-04; `automation_control.max_per_cycle` configures the ceiling, bounded to five in code. Existing cycles retain their recorded limit unless explicitly increased without resetting used slots. Supported urgent work can publish between routine slots; pending rumors cannot acquire confirmed urgency. Reservations and pending images carry forward using the actual destination cycle limit without creating extra quota. Publication requires sufficient evidence, both translations, review, a rights-recorded image and remaining budget. Updates retain the translation ID, existing URLs and original publication date.

Uninterrupted news polling uses **144 requests/day, 4,320 per 30-day month or 4,464 per 31-day month**. Existing shared prices add up to 96/day: combined monthly estimates are **7,200 or 7,440** if the provider counts both endpoints together. Diagnostics, backoff and provider caching affect actual consumption. A 100-item response limit does not establish monthly plan allowance; no plan was upgraded. Visitors never trigger provider calls. Ingestion is capped at ten unseen reports per poll. Candidate jobs resume with cached source text, verification, translations and review fingerprints; AI limits cover news, images and Academy together.

## Evidence categories

- **Confirmed / Confirmada:** ordinary supported facts may rely on an accessible primary source, genuinely independent journalism, or original reporting with identifiable on-record evidence. An official release is not universally required.
- **Rumor:** an identifiable source reports an unconfirmed claim; attribution is established, the underlying claim is not presented as true.
- **Leak / Filtración:** unofficial information or purported materials have identifiable provenance, with authenticity limits and unknowns stated explicitly.

Verification records the status, exact source quotations, original origin URLs, established facts and unconfirmed claims. Code checks quotations against retrieved text and restricts sources and origin URLs to actually supplied documents/links. Independent draft review receives consulted documents. Pending rumor/leak headlines and SEO titles mark uncertainty explicitly. Damaging allegations require primary evidence and independent corroboration; unsupported accusations are withheld rather than published as rumors. Predictions remain attributed speculation. Word count never overrides evidence.

Wire attribution, common origin links and near-identical prose collapse to one origin. Known URLs are not re-ingested. Related titles, canonical events and the published-story registry prevent duplicate events. Material confirmations or denials update the existing bilingual article, preserve initial provenance and remain in the rumors archive as resolved reports. New API results are compared with published stories. Pending original reports also receive bounded six-hour source-edit checks in reserved slots after polls and during idle queue slots; unchanged content changes no public date and triggers no drafting. Inaccessible reports remain pending.

## Public UI and verification

`/en/rumors-and-leaks/` and `/es/rumores-y-filtraciones/` are the bilingual archives. Status labels appear on cards and articles in initial HTML. Articles distinguish established facts, unconfirmed claims and original-report links. Historic articles that passed the prior stricter checks display Confirmed and retain all existing content and paths. No test rumor or leak is inserted in production.

`automation/tests/reporting.test.ts` covers journalism without an official primary, pending rumors/leaks, unsupported quotes/allegations, shared origins, API deduplication, six reviews within one hourly publication window, Retry-After and unchanged follow-ups. `npm run test:dynamic` uses temporary local D1 fixtures for all three tiers, a subsequent denial, original-source retention, stable URLs and bilingual initial HTML, without provider calls. Real execution is verified from `news_polls`, rather than cron configuration alone.
