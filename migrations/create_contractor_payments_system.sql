-- ============================================================================
-- CONTRACTOR PAYMENTS TRACKING SYSTEM
-- ============================================================================
-- Creates tables to track monthly payments for internal contractors
-- (Contractor Dinesh and Contractor LinePolish)
-- 
-- Features:
-- - Track monthly payable amounts
-- - Record multiple payment transactions per month
-- - Automatic carry forward from previous month
-- - Month-by-month history tracking
-- ============================================================================

-- Table: contractor_payments
-- Stores monthly payment summary for each contractor
CREATE TABLE IF NOT EXISTS contractor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name TEXT NOT NULL CHECK (contractor_name IN ('Contractor Dinesh', 'Contractor LinePolish')),
  month TEXT NOT NULL, -- Format: YYYY-MM
  total_payable NUMERIC DEFAULT 0, -- Amount owed for work done this month
  carry_forward NUMERIC DEFAULT 0, -- Amount carried forward from previous month
  balance NUMERIC DEFAULT 0, -- Current balance (carry_forward + total_payable - total_paid)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contractor_name, month)
);

-- Table: contractor_payment_transactions
-- Stores individual payment transactions
CREATE TABLE IF NOT EXISTS contractor_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_payment_id UUID NOT NULL REFERENCES contractor_payments(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_mode TEXT NOT NULL CHECK (payment_mode IN ('Cash', 'UPI', 'Bank Transfer', 'Cheque')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_contractor_payments_name_month 
  ON contractor_payments(contractor_name, month DESC);

CREATE INDEX IF NOT EXISTS idx_contractor_payment_transactions_payment_id 
  ON contractor_payment_transactions(contractor_payment_id);

CREATE INDEX IF NOT EXISTS idx_contractor_payment_transactions_date 
  ON contractor_payment_transactions(payment_date DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contractor_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_contractor_payments_updated_at ON contractor_payments;
CREATE TRIGGER trigger_update_contractor_payments_updated_at
  BEFORE UPDATE ON contractor_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_contractor_payments_updated_at();

-- Grant permissions
GRANT ALL ON contractor_payments TO authenticated;
GRANT ALL ON contractor_payment_transactions TO authenticated;

-- Comments
COMMENT ON TABLE contractor_payments IS 'Monthly payment summary for internal contractors';
COMMENT ON TABLE contractor_payment_transactions IS 'Individual payment transactions for contractors';
COMMENT ON COLUMN contractor_payments.month IS 'Format: YYYY-MM (e.g., 2026-03 for March 2026)';
COMMENT ON COLUMN contractor_payments.total_payable IS 'Total amount owed for work done in this month';
COMMENT ON COLUMN contractor_payments.carry_forward IS 'Unpaid balance carried forward from previous month';
COMMENT ON COLUMN contractor_payments.balance IS 'Current balance = carry_forward + total_payable - total_paid';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('contractor_payments', 'contractor_payment_transactions');

-- Check columns in contractor_payments
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contractor_payments' 
ORDER BY ordinal_position;

-- Check columns in contractor_payment_transactions
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'contractor_payment_transactions' 
ORDER BY ordinal_position;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Initialize current month records for both contractors
-- INSERT INTO contractor_payments (contractor_name, month, total_payable, carry_forward)
-- VALUES 
--   ('Contractor Dinesh', '2026-03', 0, 0),
--   ('Contractor LinePolish', '2026-03', 0, 0)
-- ON CONFLICT (contractor_name, month) DO NOTHING;
