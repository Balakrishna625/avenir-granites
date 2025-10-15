-- Create table for storing previous dues carried forward to a month
-- This allows multiple previous month dues to be added to a single month

CREATE TABLE IF NOT EXISTS line_polish_previous_dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (the month to which due is carried forward)
  previous_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM (the original month of the due)
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries by current_month
CREATE INDEX IF NOT EXISTS idx_previous_dues_current_month 
ON line_polish_previous_dues(current_month);

-- Create index for faster queries by previous_month
CREATE INDEX IF NOT EXISTS idx_previous_dues_previous_month 
ON line_polish_previous_dues(previous_month);

-- Add comment to table
COMMENT ON TABLE line_polish_previous_dues IS 'Stores previous month dues carried forward to current month. Multiple entries can exist for same current_month.';

COMMENT ON COLUMN line_polish_previous_dues.current_month IS 'The month to which this due is carried forward (e.g., 2025-09)';
COMMENT ON COLUMN line_polish_previous_dues.previous_month IS 'The original month from which this due originated (e.g., 2025-08)';
COMMENT ON COLUMN line_polish_previous_dues.amount IS 'Amount of due carried forward';
