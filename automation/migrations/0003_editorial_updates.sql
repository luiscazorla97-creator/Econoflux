CREATE TABLE IF NOT EXISTS editorial_updates (
 event_id TEXT PRIMARY KEY REFERENCES events(id),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','working','complete','failed')),
 requested_at TEXT NOT NULL,
 completed_at TEXT,
 request_reason TEXT NOT NULL,
 previous_revision INTEGER NOT NULL,
 last_error TEXT
);
