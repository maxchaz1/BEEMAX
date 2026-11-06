-- Additive registry for validated, staff-managed operational UI entities.
CREATE TABLE IF NOT EXISTS entity_registry (
  entity_id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  ui_binding TEXT NOT NULL CHECK (json_valid(ui_binding)),
  state_payload TEXT NOT NULL CHECK (json_valid(state_payload)),
  telemetry_stream TEXT NOT NULL CHECK (json_valid(telemetry_stream)),
  controls TEXT NOT NULL CHECK (json_valid(controls)),
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_entity_registry_category
  ON entity_registry(category);
