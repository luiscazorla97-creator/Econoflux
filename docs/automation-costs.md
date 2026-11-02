# Current operating costs and limits

The [hourly workflow](hourly-automation.md) replaces the old daily quota and per-article build design. No paid service, subscription upgrade or billing setting was activated.

| Resource | Current behavior / safety limit |
| --- | --- |
| OpenAI | Existing `gpt-5-mini` API key and funded project. Adapter rates: $0.25/M input tokens, $2/M output tokens. **$1/day** hard reserved-plus-known-cost cap, unchanged. |
| AI requests | **160/day** safety ceiling. A qualifying new story normally uses verification + English + Spanish + independent bilingual review: four calls. 24 baseline stories need 96 calls; the remainder allows bounded rejected candidates, corrections and exceptional stories, still subject to the dollar cap. |
| Crypto News API | Existing plan, up to 100 results per request; ingest at most 12 unseen reports each turn. Normally 24 requests/day (720 in a 30-day month), hard local ceiling 32/day. Results per request do not establish the provider's monthly request allowance. |
| Cloudflare schedule | One stable minute trigger dispatches persistent work; provider reviews are due every 60 minutes. Intermediate turns resume a saved phase or read idle state. No login or Codex session required. |
| Pages builds | **Zero builds per story.** Code changes use the existing GitHub integration. Stored bilingual articles are served from D1 through Pages Functions with full initial HTML. |
| Public traffic | Uses existing Pages Functions/D1 request and row allowances. It never invokes the news or model APIs. No plan upgrade was made. |

The model cap is not a publication target or invoice estimate. Unknown costs remain reserved after transport failures; completed calls settle using returned token counts. Failed sources consume no generation. Valid translations and successful final reviews are cached; retries do not regenerate completed phases. Daily accounting uses America/New_York.

A normal cycle publishes one verified relevant story, exceptionally up to three, and none when evidence, novelty or budget is insufficient. First-batch copy editing and source snapshots were explicitly recorded as initial assistance; unattended future cycles must obtain their own usable evidence. Blocked official sources remain pending without bypassing access controls.

See official [OpenAI pricing](https://openai.com/api/pricing/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) and [Pages limits](https://developers.cloudflare.com/pages/platform/limits/) for account-dependent terms. The configured dollar cap does not include charges of an already-contracted news subscription or any Cloudflare account billing. No additional service was contracted for this implementation.
