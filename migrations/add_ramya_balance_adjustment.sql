-- Add balance adjustment for Ramya's account
-- This adjusts the displayed balance from -7,00,378 to +1,70,410
-- Adjustment amount: +8,70,788

-- Insert adjustment record for Ramya's account
INSERT INTO bank_account_adjustments (bank_account_id, adjustment_amount, notes)
VALUES (
  (SELECT id FROM bank_accounts WHERE account_name ILIKE '%RAMYA%' LIMIT 1),
  870788,
  'Balance correction: Adjusting from -700378 to +170410 to account for missed credits'
)
ON CONFLICT (bank_account_id) DO UPDATE
SET 
  adjustment_amount = EXCLUDED.adjustment_amount,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Verify the adjustment
SELECT 
  ba.account_name,
  baa.adjustment_amount,
  baa.notes,
  baa.created_at,
  baa.updated_at
FROM bank_account_adjustments baa
JOIN bank_accounts ba ON ba.id = baa.bank_account_id
WHERE ba.account_name ILIKE '%RAMYA%';
