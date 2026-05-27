-- Custom slab grades (user-defined grades beyond the built-in defaults)
CREATE TABLE IF NOT EXISTS slab_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
