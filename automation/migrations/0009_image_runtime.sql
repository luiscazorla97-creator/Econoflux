ALTER TABLE image_control ADD COLUMN next_attempt TEXT NOT NULL DEFAULT '';
ALTER TABLE image_control ADD COLUMN last_success_at TEXT;
ALTER TABLE image_control ADD COLUMN last_cost_microusd INTEGER;
