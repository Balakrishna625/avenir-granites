-- Migration: Create pending_expenses table for WhatsApp expense approval workflow
-- This table stores expenses parsed from WhatsApp messages before they are approved
-- Once approved, records are moved to the main expenses table
-- Zero impact on existing expenses table and functionality

-- Create pending_expenses table
CREATE TABLE IF NOT EXISTS pending_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Raw input data from WhatsApp
  message_text TEXT NOT NULL, -- Original WhatsApp message text
  image_url TEXT, -- URL to receipt image stored in Supabase Storage
  
  -- Editable expense fields (user can modify before approval)
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  payment_method TEXT DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'RTGS', 'CREDIT_CARD')),
  notes TEXT,
  
  -- OCR/Parser metadata (for transparency and debugging)
  ocr_amount DECIMAL(15, 2), -- Amount extracted from receipt image
  ocr_vendor TEXT, -- Vendor name from OCR
  ocr_date DATE, -- Date from receipt
  ocr_raw_text TEXT, -- Full OCR output for reference
  parsed_text_amount DECIMAL(15, 2), -- Amount from text caption
  
  -- Quality indicators
  confidence_score DECIMAL(3, 2) CHECK (confidence_score >= 0 AND confidence_score <= 1), -- 0.0 to 1.0
  has_conflict BOOLEAN DEFAULT false, -- True if OCR and text don't match
  conflict_details JSONB, -- Details about conflicts: {"amount": {"ocr": 6100, "text": 6000}}
  
  -- Workflow status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- User who created the pending expense
  approved_at TIMESTAMPTZ,
  approved_by UUID, -- User who approved/rejected
  approved_expense_id UUID -- Link to created expense after approval (for reference)
);

-- Indexes for performance
CREATE INDEX idx_pending_expenses_status ON pending_expenses(status) WHERE status = 'pending';
CREATE INDEX idx_pending_expenses_created_at ON pending_expenses(created_at DESC);
CREATE INDEX idx_pending_expenses_expense_date ON pending_expenses(expense_date DESC);
CREATE INDEX idx_pending_expenses_created_by ON pending_expenses(created_by);

-- Comments for documentation
COMMENT ON TABLE pending_expenses IS 'Temporary storage for expenses parsed from WhatsApp messages, awaiting user approval';
COMMENT ON COLUMN pending_expenses.message_text IS 'Original WhatsApp message text or caption';
COMMENT ON COLUMN pending_expenses.image_url IS 'URL to receipt/bill image in Supabase Storage';
COMMENT ON COLUMN pending_expenses.amount IS 'Final amount (editable by user before approval)';
COMMENT ON COLUMN pending_expenses.confidence_score IS 'Parser confidence (0.0-1.0), higher = more confident';
COMMENT ON COLUMN pending_expenses.has_conflict IS 'True if OCR amount differs from text amount';
COMMENT ON COLUMN pending_expenses.approved_expense_id IS 'UUID of expense record created after approval';

-- Grant permissions (match existing expense permissions)
GRANT SELECT, INSERT, UPDATE, DELETE ON pending_expenses TO authenticated;
