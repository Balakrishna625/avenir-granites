-- Migration script to create line polish reports table
-- This table will store daily production line polish data

-- Create line polish reports table
CREATE TABLE IF NOT EXISTS line_polish_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('MORNING', 'NIGHT')),
  activity TEXT NOT NULL CHECK (activity IN ('GRINDING', 'POLISHING')),
  no_of_workers INTEGER NOT NULL DEFAULT 3,
  number_of_slabs INTEGER NOT NULL DEFAULT 0,
  total_sqft NUMERIC NOT NULL DEFAULT 0,
  no_of_hours NUMERIC NOT NULL DEFAULT 0,
  rate_per_hour NUMERIC NOT NULL DEFAULT 250,
  debit_amount NUMERIC NOT NULL DEFAULT 0, -- calculated as no_of_hours * rate_per_hour
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create separate line polish payments table
CREATE TABLE IF NOT EXISTS line_polish_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI')),
  reference_number TEXT, -- for bank transfers, cheque numbers, UPI transaction IDs
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS line_polish_reports_date_idx ON line_polish_reports(date);
CREATE INDEX IF NOT EXISTS line_polish_reports_shift_idx ON line_polish_reports(shift);
CREATE INDEX IF NOT EXISTS line_polish_reports_activity_idx ON line_polish_reports(activity);
CREATE INDEX IF NOT EXISTS line_polish_reports_date_shift_activity_idx ON line_polish_reports(date, shift, activity);

-- Create indexes for payments table
CREATE INDEX IF NOT EXISTS line_polish_payments_date_idx ON line_polish_payments(payment_date);
CREATE INDEX IF NOT EXISTS line_polish_payments_amount_idx ON line_polish_payments(amount);

-- Create monthly balance tracking table for carrying forward previous month balances
CREATE TABLE IF NOT EXISTS line_polish_monthly_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  opening_balance NUMERIC NOT NULL DEFAULT 0,
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  closing_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, month)
);

-- Create index for monthly balances
CREATE INDEX IF NOT EXISTS line_polish_monthly_balances_year_month_idx ON line_polish_monthly_balances(year, month);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist and recreate them
DROP TRIGGER IF EXISTS update_line_polish_reports_updated_at ON line_polish_reports;
CREATE TRIGGER update_line_polish_reports_updated_at
  BEFORE UPDATE ON line_polish_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_line_polish_payments_updated_at ON line_polish_payments;
CREATE TRIGGER update_line_polish_payments_updated_at
  BEFORE UPDATE ON line_polish_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_line_polish_monthly_balances_updated_at ON line_polish_monthly_balances;
CREATE TRIGGER update_line_polish_monthly_balances_updated_at
  BEFORE UPDATE ON line_polish_monthly_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE line_polish_reports IS 'Daily line polish production reports with shift-wise activity tracking';
COMMENT ON COLUMN line_polish_reports.shift IS 'Work shift: MORNING (A shift) or NIGHT (B shift)';
COMMENT ON COLUMN line_polish_reports.activity IS 'Type of work: GRINDING or POLISHING';
COMMENT ON COLUMN line_polish_reports.debit_amount IS 'Amount to be paid (no_of_hours * rate_per_hour)';
COMMENT ON COLUMN line_polish_reports.no_of_workers IS 'Number of workers - defaults to 3';
COMMENT ON COLUMN line_polish_reports.rate_per_hour IS 'Rate per hour - defaults to ₹250';

COMMENT ON TABLE line_polish_payments IS 'Payment records for line polish workers';
COMMENT ON COLUMN line_polish_payments.payment_date IS 'Date when payment was made';
COMMENT ON COLUMN line_polish_payments.amount IS 'Amount paid to workers';
COMMENT ON COLUMN line_polish_payments.payment_method IS 'Method of payment: CASH, BANK_TRANSFER, CHEQUE, UPI';
COMMENT ON COLUMN line_polish_payments.reference_number IS 'Transaction reference for non-cash payments';

COMMENT ON TABLE line_polish_monthly_balances IS 'Monthly balance tracking for line polish payments';
COMMENT ON COLUMN line_polish_monthly_balances.opening_balance IS 'Balance carried forward from previous month';
COMMENT ON COLUMN line_polish_monthly_balances.closing_balance IS 'Balance to carry forward to next month';