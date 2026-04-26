-- Add after_row_index to line_polish_tool_usage
-- after_row_index: -1 = tool installed at start of shift (before any activity row)
--                   0 = installed after activity row 0 (1st row)
--                   N = installed after activity row N
ALTER TABLE line_polish_tool_usage
  ADD COLUMN IF NOT EXISTS after_row_index INTEGER NOT NULL DEFAULT -1;
