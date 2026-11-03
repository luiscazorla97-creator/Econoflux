-- Read-path optimization and private observations only. No editorial settings,
-- publication limits, content, dates, pauses or cron schedules are changed.
CREATE INDEX IF NOT EXISTS public_articles_discovery ON public_articles(visible,published_at DESC,translation_id,lang);
CREATE INDEX IF NOT EXISTS public_articles_category_discovery ON public_articles(visible,lang,json_extract(value,'$.category'),published_at DESC);
CREATE INDEX IF NOT EXISTS public_guides_discovery ON public_guides(visible,lang,published_at DESC,translation_id);
CREATE TABLE IF NOT EXISTS seo_http_observations(
  url TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status INTEGER,
  final_url TEXT,
  checked_at TEXT NOT NULL,
  error TEXT,
  CHECK(status IS NULL OR status BETWEEN 100 AND 599)
);
