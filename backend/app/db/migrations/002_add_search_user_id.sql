-- Track which user created each search, for ownership checks
ALTER TABLE searches ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_searches_user ON searches (user_id);
