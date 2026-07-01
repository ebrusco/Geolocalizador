-- Persistent API usage tracking (replaces in-memory RAM store)
CREATE TABLE IF NOT EXISTS api_usage (
    id         SERIAL PRIMARY KEY,
    search_id  INT REFERENCES searches(id) ON DELETE SET NULL,
    cost_usd   NUMERIC(6,4) NOT NULL DEFAULT 0.04,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_created
    ON api_usage (created_at DESC);
