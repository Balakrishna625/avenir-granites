-- Migration: Create line_polish_tool_usage table
-- Purpose: Track consumable tool changes (Resin Bond, Lapotra, Iron) per shift
-- A tool change can happen at the start of a shift or any number of times mid-shift.
-- Each row = one tool installed / used during a shift, with the SFT produced while it was active.

CREATE TABLE IF NOT EXISTS line_polish_tool_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES line_polish_reports(id) ON DELETE CASCADE,
  shift TEXT NOT NULL CHECK (shift IN ('MORNING', 'NIGHT')),
  tool_type TEXT NOT NULL CHECK (tool_type IN ('resin_bond', 'lapotra', 'iron')),
  grade TEXT NOT NULL,        -- e.g. "400", "1500", "Final Lux", "60"
  brand TEXT,                 -- e.g. "Cherukuru" (free text, optional)
  sqft_produced NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_lp_tool_usage_report_id  ON line_polish_tool_usage(report_id);
CREATE INDEX IF NOT EXISTS idx_lp_tool_usage_tool_type  ON line_polish_tool_usage(tool_type);
CREATE INDEX IF NOT EXISTS idx_lp_tool_usage_grade       ON line_polish_tool_usage(grade);
