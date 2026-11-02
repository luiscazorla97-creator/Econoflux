-- Independent guide quotas. Existing news, settings, secrets and cron are untouched.
CREATE TABLE academy_control(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 0,bootstrap_target INTEGER NOT NULL DEFAULT 3,last_tick TEXT,last_error TEXT,news_watermark TEXT);
INSERT INTO academy_control(id) VALUES(1);
CREATE TABLE academy_topics(id TEXT PRIMARY KEY,intent_key TEXT NOT NULL UNIQUE,category TEXT NOT NULL,cluster TEXT NOT NULL,spec TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',published_at TEXT,last_checked_at TEXT,next_review_at TEXT,source_hash TEXT,revision INTEGER NOT NULL DEFAULT 0);
CREATE TABLE academy_jobs(id TEXT PRIMARY KEY,topic_id TEXT NOT NULL REFERENCES academy_topics(id),kind TEXT NOT NULL CHECK(kind IN ('new','review')),revision INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'pending',phase TEXT NOT NULL DEFAULT 'sources',payload TEXT NOT NULL DEFAULT '{}',attempts INTEGER NOT NULL DEFAULT 0,next_attempt TEXT NOT NULL,created_at TEXT NOT NULL,completed_at TEXT,ai_cost INTEGER NOT NULL DEFAULT 0,ai_reserved INTEGER NOT NULL DEFAULT 0,last_error TEXT,UNIQUE(topic_id,revision));
CREATE INDEX academy_jobs_due ON academy_jobs(state,next_attempt);
CREATE TABLE public_guides(translation_id TEXT NOT NULL REFERENCES academy_topics(id),lang TEXT NOT NULL CHECK(lang IN ('en','es')),slug TEXT NOT NULL,revision INTEGER NOT NULL,value TEXT NOT NULL,visible INTEGER NOT NULL DEFAULT 1,published_at TEXT NOT NULL,updated_at TEXT,PRIMARY KEY(translation_id,lang),UNIQUE(lang,slug));
CREATE TABLE academy_assets(id TEXT PRIMARY KEY REFERENCES academy_topics(id),svg TEXT NOT NULL,png BLOB NOT NULL,created_at TEXT NOT NULL,rights TEXT NOT NULL);
CREATE TABLE academy_slots(id TEXT PRIMARY KEY,topic_id TEXT REFERENCES academy_topics(id),state TEXT NOT NULL DEFAULT 'reserved',created_at TEXT NOT NULL);
CREATE TABLE academy_news_checks(event_id TEXT PRIMARY KEY,checked_at TEXT NOT NULL);
