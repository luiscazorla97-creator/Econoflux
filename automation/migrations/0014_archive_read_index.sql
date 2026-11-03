-- Keep language archives fast as content grows. No publication settings change.
CREATE INDEX IF NOT EXISTS public_articles_language_discovery ON public_articles(visible,lang,json_extract(value,'$.status'),json_extract(value,'$.demo'),published_at DESC,translation_id);
