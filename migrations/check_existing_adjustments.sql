-- Check all existing adjustments in the database
SELECT 
  ba.account_name,
  baa.adjustment_amount,
  baa.notes,
  baa.effective_date,
  baa.created_at,
  baa.updated_at
FROM bank_account_adjustments baa
JOIN bank_accounts ba ON ba.id = baa.bank_account_id
ORDER BY ba.account_name;
