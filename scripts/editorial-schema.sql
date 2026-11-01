-- Proposed Cloudflare D1 schema; not deployed or connected.
CREATE TABLE IF NOT EXISTS publication_jobs (
  topic_key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN ('claimed','published')),
  lease_expires_at TEXT,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS published_articles (
  id TEXT PRIMARY KEY,
  translation_id TEXT NOT NULL,
  language TEXT NOT NULL CHECK(language IN ('en','es')),
  slug TEXT NOT NULL,
  content_json TEXT NOT NULL,
  published_at TEXT NOT NULL,
  UNIQUE(translation_id,language),
  UNIQUE(language,slug)
);
CREATE TABLE IF NOT EXISTS article_sources (
  translation_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  source_json TEXT NOT NULL,
  PRIMARY KEY(translation_id,canonical_url)
);
