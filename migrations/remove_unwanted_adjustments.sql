-- Remove unwanted adjustments (keep only if you added them intentionally)
-- This will delete adjustments for IDBI RTGS and DODDA RAJESWARI

DELETE FROM bank_account_adjustments
WHERE bank_account_id IN (
  SELECT id FROM bank_accounts 
  WHERE account_name ILIKE '%IDBI%' 
     OR account_name ILIKE '%RAJESWARI%'
);

-- Verify remaining adjustments
SELECT 
  ba.account_name,
  baa.adjustment_amount,
  baa.notes
FROM bank_account_adjustments baa
JOIN bank_accounts ba ON ba.id = baa.bank_account_id
ORDER BY ba.account_name;
