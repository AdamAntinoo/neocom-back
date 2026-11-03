-- Schema owned by neocom-back (INFRA-053 / BASSE-012).
CREATE TABLE IF NOT EXISTS processed_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_key VARCHAR(256) NOT NULL,
  node_id VARCHAR(128) NOT NULL,
  simplified JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated JSONB NOT NULL DEFAULT '{}'::jsonb,
  ready BOOLEAN NOT NULL DEFAULT FALSE,
  stale_after TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope_key, node_id)
);

CREATE INDEX IF NOT EXISTS idx_processed_nodes_scope ON processed_nodes (scope_key);
CREATE INDEX IF NOT EXISTS idx_processed_nodes_incomplete
  ON processed_nodes (scope_key)
  WHERE ready = FALSE;
