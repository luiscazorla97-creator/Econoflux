-- Additional editorial goal; existing news/Academy controls and quotas stay intact.
CREATE TABLE report_editorial_control(id INTEGER PRIMARY KEY CHECK(id=1),enabled INTEGER NOT NULL DEFAULT 0,paused INTEGER NOT NULL DEFAULT 0,daily_target INTEGER NOT NULL DEFAULT 2 CHECK(daily_target BETWEEN 1 AND 2),last_check TEXT,published_today INTEGER NOT NULL DEFAULT 0,reserved INTEGER NOT NULL DEFAULT 0);
INSERT INTO report_editorial_control(id) VALUES(1);
