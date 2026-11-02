ALTER TABLE editorial_assets ADD COLUMN content_hash TEXT;
CREATE UNIQUE INDEX editorial_assets_content_hash ON editorial_assets(content_hash) WHERE content_hash IS NOT NULL;
