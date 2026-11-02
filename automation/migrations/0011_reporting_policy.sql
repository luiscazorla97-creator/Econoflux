ALTER TABLE automation_control ADD COLUMN poll_interval_minutes INTEGER NOT NULL DEFAULT 10;
ALTER TABLE events ADD COLUMN related_hint TEXT;
ALTER TABLE sources ADD COLUMN origin_links TEXT;
CREATE TABLE news_polls(slot TEXT PRIMARY KEY,started_at TEXT NOT NULL,completed_at TEXT,result TEXT NOT NULL DEFAULT 'running',candidates INTEGER NOT NULL DEFAULT 0,error TEXT);
CREATE TABLE report_followups(translation_id TEXT PRIMARY KEY,signature TEXT NOT NULL,next_check TEXT NOT NULL,last_checked_at TEXT,pending_event_id TEXT,last_error TEXT,source_event_id TEXT);
-- Financial limits and current enable/pause flags are preserved.
UPDATE settings SET value=json_set(value,'$.dailyNewsCalls',150) WHERE id=1;
