# Current daily editorial mix

Owner authorized this replacement for the high-volume hourly plan on 2026-11-04. Runtime `settings.editorialDailyPlan=true` activates the bounded daily mix. The shared AI ceiling remains US$8/day for every section together; existing spending and reservations are preserved.

- API news: aim for three worthwhile stories and at most a fourth with verified exceptional relevance (85/100). Selection windows open at 07/11/15/19 America/New_York with at least three hours between ordinary news publications. EN/ES count as one event. Counts exclude market reports and original rumor/leak stories, including later resolutions. Reservations prevent overbooking; old carried reservations cannot exceed the new actual daily cap. Corrections retain URLs and original dates and do not count as new stories.
- Rumors and leaks: one distinct sourced event/day, shared count between the two labels. The former exceptional-relevance exception is disabled under this plan. An API headline alone never authenticates a source or a claim.
- Academy: up to two audited, original bilingual guides/day, with UTC windows at 10:00 and 18:00, and a weekly ceiling of fourteen. No catch-up burst. Existing guide publication dates, URLs, official-source research, reviews and original diagrams are retained. Real news work keeps priority; an idle backlog blocked by the daily limit cannot permanently starve Academy.
- Markets: the existing three daily complete reports remain, following the owner's latest explicit answer to preserve them. Source-based context and independent audit remain required.

The single minute dispatcher, ten-minute API checks, current price refresh/cache, source verification, duplicate prevention, copyright controls and pause flags remain. The news hourly maximum is reduced to one; this is an additional ceiling rather than the daily publication objective. No second scheduler or paid service is added. Publication targets require evidence, complete EN/ES content, appropriate images and remaining shared budget. No unqualified stories are created to fill quotas.

The transition preserves already published work. If today's prior publications exceed a new cap, that section waits for its next publication day instead of deleting stories or resetting counters. API costs for writing, translation and auditing still apply; running on Cloudflare does not make OpenAI requests free.

## Owner-requested report batch

An explicit manual request can set `settings.manualReportDay` to one America/New_York date, allowing a target of two reports on that date only. The ordinary `report_editorial_control.daily_target` remains one. The override expires by date comparison, even if an operator session stops. A D1 selection reason beginning `owner-report-review:` prioritizes an identified candidate for research without changing its verification, approval, evidence requirements or publication label. Academy retains its two daily windows. Raw independent-audit verdicts are persisted privately while the job remains in audit, so an invalid quoted finding can be diagnosed without approving it or discarding a valid draft.
