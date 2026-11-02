CREATE TABLE IF NOT EXISTS market_cache(id INTEGER PRIMARY KEY CHECK(id=1), value TEXT, updated_at TEXT, next_attempt TEXT NOT NULL DEFAULT '', last_error TEXT, diagnostic TEXT);
INSERT OR IGNORE INTO market_cache(id) VALUES(1);
CREATE TABLE IF NOT EXISTS market_usage(day TEXT PRIMARY KEY,calls INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS image_control(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,approved_at TEXT,model TEXT NOT NULL DEFAULT 'gpt-image-1-mini',quality TEXT NOT NULL DEFAULT 'medium',size TEXT NOT NULL DEFAULT '1536x1024',preflight_requested INTEGER NOT NULL DEFAULT 0,preflight_at TEXT,preflight_error TEXT);
INSERT OR IGNORE INTO image_control(id) VALUES(1);
CREATE TABLE IF NOT EXISTS editorial_assets(id TEXT PRIMARY KEY,event_id TEXT UNIQUE,kind TEXT NOT NULL,public_path TEXT NOT NULL,source_url TEXT,license TEXT NOT NULL,creator TEXT NOT NULL,credit_en TEXT NOT NULL,credit_es TEXT NOT NULL,alt_en TEXT NOT NULL,alt_es TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,mime TEXT NOT NULL DEFAULT 'image/webp',body BLOB,ready INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL);
