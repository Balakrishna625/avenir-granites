-- Create waived_transactions table to track waived amounts with date and notes
-- This allows tracking when amounts were waived and why, with full history

CREATE TABLE IF NOT EXISTS waived_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL CHECK (amount >= 0),
  waived_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_waived_transactions_customer_id ON waived_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_waived_transactions_waived_date ON waived_transactions(waived_date);

-- Add comments
COMMENT ON TABLE waived_transactions IS 'Tracks amounts waived/purged from customer bills with date and notes';
COMMENT ON COLUMN waived_transactions.customer_id IS 'Reference to the customer who had amount waived';
COMMENT ON COLUMN waived_transactions.amount IS 'Amount that was waived/negotiated off the bill';
COMMENT ON COLUMN waived_transactions.waived_date IS 'Date when the amount was waived';
COMMENT ON COLUMN waived_transactions.notes IS 'Optional notes explaining why amount was waived';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waived_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_waived_transactions_updated_at
  BEFORE UPDATE ON waived_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_waived_transactions_updated_at();
