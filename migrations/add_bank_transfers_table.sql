-- Create bank_transfers table for tracking internal bank-to-bank transfers
-- These are NOT customer payments or expenses, just internal transfers between accounts

CREATE TABLE IF NOT EXISTS bank_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  from_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  to_description TEXT NOT NULL, -- Text field for destination (can be another bank or description)
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_bank_transfers_date ON bank_transfers(date);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_from_account ON bank_transfers(from_account_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_bank_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bank_transfers_updated_at
  BEFORE UPDATE ON bank_transfers
  FOR EACH ROW
  EXECUTE FUNCTION update_bank_transfers_updated_at();

COMMENT ON TABLE bank_transfers IS 'Internal bank transfers - NOT customer payments or expenses';
COMMENT ON COLUMN bank_transfers.to_description IS 'Destination bank/account (text field, not FK)';
