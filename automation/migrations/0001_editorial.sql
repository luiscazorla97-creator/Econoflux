PRAGMA foreign_keys = ON;
CREATE TABLE settings(id INTEGER PRIMARY KEY CHECK(id=1), version INTEGER NOT NULL DEFAULT 1, value TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE runs(id TEXT PRIMARY KEY, started_at TEXT NOT NULL, ended_at TEXT, mode TEXT NOT NULL, result TEXT, error TEXT);
CREATE TABLE events(id TEXT PRIMARY KEY, provider_id TEXT, fingerprint TEXT NOT NULL UNIQUE, title TEXT NOT NULL, url TEXT NOT NULL UNIQUE, detected_at TEXT NOT NULL, event_at TEXT, category TEXT NOT NULL DEFAULT 'bitcoin', state TEXT NOT NULL DEFAULT 'detected', urgent INTEGER NOT NULL DEFAULT 0, selection_reason TEXT NOT NULL, urgent_reason TEXT, canonical_event TEXT, related_id TEXT, rejection_reason TEXT, verified_at TEXT, verification TEXT, approved_by TEXT, approved_revision INTEGER, revision INTEGER NOT NULL DEFAULT 1, prepared_at TEXT, published_at TEXT, updated_at TEXT, commit_sha TEXT, deployment_id TEXT, lease_until TEXT, attempts INTEGER NOT NULL DEFAULT 0, retry_at TEXT, last_error TEXT);
CREATE UNIQUE INDEX event_canonical ON events(canonical_event) WHERE canonical_event IS NOT NULL AND related_id IS NULL;
CREATE TABLE sources(id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES events(id), url TEXT NOT NULL, publisher TEXT, published_at TEXT, fetched_at TEXT, accessible INTEGER NOT NULL DEFAULT 0, primary_source INTEGER NOT NULL DEFAULT 0, independence_group TEXT, excerpt TEXT, facts TEXT, error TEXT, UNIQUE(event_id,url));
CREATE TABLE drafts(event_id TEXT NOT NULL REFERENCES events(id), lang TEXT NOT NULL CHECK(lang IN ('en','es')), revision INTEGER NOT NULL, value TEXT NOT NULL, valid INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY(event_id,lang));
CREATE TABLE history(id INTEGER PRIMARY KEY AUTOINCREMENT, event_id TEXT, at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL);
CREATE TABLE reservations(event_id TEXT PRIMARY KEY REFERENCES events(id), day TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('regular','extra','update')), state TEXT NOT NULL CHECK(state IN ('reserved','published','released')), expires_at TEXT NOT NULL);
CREATE INDEX reservations_day ON reservations(day,state,kind);
CREATE TABLE usage(day TEXT PRIMARY KEY, news_calls INTEGER NOT NULL DEFAULT 0, ai_calls INTEGER NOT NULL DEFAULT 0, ai_reserved INTEGER NOT NULL DEFAULT 0, ai_actual INTEGER NOT NULL DEFAULT 0, builds INTEGER NOT NULL DEFAULT 0);
CREATE TABLE locks(name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE runtime(id INTEGER PRIMARY KEY CHECK(id=1), last_check TEXT, next_check TEXT, next_regular TEXT, last_error TEXT, status TEXT NOT NULL DEFAULT 'disabled');
INSERT INTO runtime(id,status) VALUES(1,'disabled');
INSERT INTO settings(id,value,updated_at) VALUES(1,'{"dailyTarget":5,"intervalMinutes":10,"breakingEnabled":true,"extraQuota":3,"enabled":false,"paused":true,"mode":"test","dailyNewsCalls":160,"dailyAICalls":30,"dailyBudgetMicrousd":1000000,"dailyBuilds":8,"maxConcurrent":1,"minimumGapMinutes":20,"autoApprove":false,"primaryHosts":["sec.gov","federalreserve.gov","ecb.europa.eu","ethereum.org","bitcoin.org","bitcoincore.org"],"inputUSDPerMillion":0.25,"outputUSDPerMillion":2}',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

CREATE UNIQUE INDEX provider_unique ON events(provider_id) WHERE provider_id IS NOT NULL;
