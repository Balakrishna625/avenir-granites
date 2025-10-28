-- Check Church Party's SETTLED period (period 1)
SELECT 
  cap.period_number,
  cap.is_active,
  cap.start_date,
  cap.end_date,
  cap.settlement_date,
  cap.total_invoiced,
  cap.total_received,
  cap.settlement_amount,  -- ← How much was paid at settlement?
  cap.waived_amount,      -- ← How much was waived?
  cap.total_pending,      -- ← Should be 0 if fully settled
  cap.old_due_amount,
  cap.settlement_mode,
  cap.settlement_reference,
  cap.settlement_notes
FROM customer_account_periods cap
JOIN customers c ON c.id = cap.customer_id
WHERE c.name ILIKE '%church%'
  AND cap.is_active = false  -- Look at the SETTLED period
ORDER BY cap.period_number DESC
LIMIT 1;
