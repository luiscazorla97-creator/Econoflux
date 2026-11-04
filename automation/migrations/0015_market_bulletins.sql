-- Independent market editions. Never change news/Academy flags, slots or budget.
CREATE TABLE market_editorial_control(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 0,activation_at TEXT,last_tick TEXT,last_error TEXT);
INSERT INTO market_editorial_control(id) VALUES(1);
CREATE TABLE market_editions(id TEXT PRIMARY KEY,day TEXT NOT NULL,edition INTEGER NOT NULL CHECK(edition BETWEEN 1 AND 3),due_at TEXT NOT NULL,state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','published','expired')),snapshot TEXT,snapshot_hash TEXT,published_at TEXT,reason TEXT,UNIQUE(day,edition));
CREATE INDEX market_editions_due ON market_editions(state,due_at);
CREATE TABLE market_edition_assets(id TEXT PRIMARY KEY REFERENCES market_editions(id),svg TEXT NOT NULL,png BLOB NOT NULL,created_at TEXT NOT NULL);
