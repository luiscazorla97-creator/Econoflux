-- Additive migration: preserve every existing candidate, source, draft and audit row.
CREATE TABLE public_articles(translation_id TEXT NOT NULL,lang TEXT NOT NULL CHECK(lang IN ('en','es')),slug TEXT NOT NULL,revision INTEGER NOT NULL,value TEXT NOT NULL,visible INTEGER NOT NULL DEFAULT 1,published_at TEXT NOT NULL,updated_at TEXT,PRIMARY KEY(translation_id,lang),UNIQUE(lang,slug));
CREATE TABLE hourly_cycles(id TEXT PRIMARY KEY,kind TEXT NOT NULL CHECK(kind IN ('initial','hourly')),started_at TEXT NOT NULL,limit_count INTEGER NOT NULL,state TEXT NOT NULL DEFAULT 'open',completed_at TEXT,reason TEXT);
CREATE TABLE cycle_items(event_id TEXT PRIMARY KEY REFERENCES events(id),cycle_id TEXT NOT NULL REFERENCES hourly_cycles(id),kind TEXT NOT NULL CHECK(kind IN ('new','update')),state TEXT NOT NULL DEFAULT 'reserved',reserved_at TEXT NOT NULL,published_at TEXT);
CREATE INDEX cycle_items_cycle ON cycle_items(cycle_id,state);
CREATE TABLE automation_control(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 1,initial_target INTEGER NOT NULL DEFAULT 5,interval_minutes INTEGER NOT NULL DEFAULT 60,max_per_cycle INTEGER NOT NULL DEFAULT 3,auto_approve INTEGER NOT NULL DEFAULT 1,next_review TEXT,last_review TEXT,activation_authorized INTEGER NOT NULL DEFAULT 1,initial_completed_at TEXT,last_error TEXT);
INSERT INTO automation_control(id) VALUES(1);
ALTER TABLE events ADD COLUMN importance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN importance_reason TEXT;
INSERT INTO hourly_cycles(id,kind,started_at,limit_count) VALUES('initial-once','initial',strftime('%Y-%m-%dT%H:%M:%fZ','now'),5);
UPDATE settings SET value=json_remove(value,'$.dailyTarget','$.extraQuota','$.breakingEnabled','$.minimumGapMinutes','$.dailyBuilds'),version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=1;
-- Do not enable provider calls or publication during provisioning.
UPDATE settings SET value=json_set(value,'$.enabled',json('false'),'$.paused',json('true'),'$.intervalMinutes',60,'$.autoApprove',json('true')) WHERE id=1;

UPDATE settings SET value=json_set(value,'$.executionMode','hourly','$.dailyNewsCalls',32,'$.dailyAICalls',90) WHERE id=1;
ALTER TABLE automation_control ADD COLUMN preflight_requested INTEGER NOT NULL DEFAULT 0;
ALTER TABLE automation_control ADD COLUMN preflight_passed_at TEXT;
ALTER TABLE automation_control ADD COLUMN preflight_error TEXT;
