-- Opt-in evidence-based explanations; existing prices and schedules are unchanged.
ALTER TABLE market_editorial_control ADD COLUMN analysis_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_editorial_control ADD COLUMN upgrade_existing INTEGER NOT NULL DEFAULT 0;
CREATE TABLE market_context_jobs(id TEXT PRIMARY KEY REFERENCES market_editions(id),phase TEXT NOT NULL DEFAULT 'sources',payload TEXT NOT NULL DEFAULT '{}',attempts INTEGER NOT NULL DEFAULT 0,next_attempt TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL,last_error TEXT);
