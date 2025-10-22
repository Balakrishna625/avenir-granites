-- Sample electricity bills data for testing
-- Run this in Supabase SQL Editor AFTER running the main migration

INSERT INTO electricity_bills (
  bill_number, bill_month, bill_date, consumer_number,
  contracted_demand, voltage_level, category,
  kwh_consumption, kva_demand, power_factor,
  demand_charges_amount, energy_charges_amount, tod_charges,
  total_amount_payable, bill_due_date
) VALUES
-- October 2025
('OCT-2025-001', 'OCT-2025', '2025-10-15', '123456789',
 500.00, '11 KV', '3A',
 57134.00, 520.50, 0.93,
 125000.00, 850000.00, 235000.00,
 1210000.00, '2025-10-30'),

-- September 2025
('SEP-2025-001', 'SEP-2025', '2025-09-15', '123456789',
 500.00, '11 KV', '3A',
 54200.00, 498.30, 0.91,
 120000.00, 820000.00, 240000.00,
 1180000.00, '2025-09-30'),

-- August 2025
('AUG-2025-001', 'AUG-2025', '2025-08-15', '123456789',
 500.00, '11 KV', '3A',
 59800.00, 535.20, 0.89,
 130000.00, 895000.00, 255000.00,
 1280000.00, '2025-08-30'),

-- July 2025
('JUL-2025-001', 'JUL-2025', '2025-07-15', '123456789',
 500.00, '11 KV', '3A',
 52100.00, 485.60, 0.94,
 118000.00, 780000.00, 220000.00,
 1118000.00, '2025-07-30'),

-- June 2025
('JUN-2025-001', 'JUN-2025', '2025-06-15', '123456789',
 500.00, '11 KV', '3A',
 55600.00, 510.40, 0.92,
 122000.00, 840000.00, 238000.00,
 1200000.00, '2025-06-30'),

-- May 2025
('MAY-2025-001', 'MAY-2025', '2025-05-15', '123456789',
 500.00, '11 KV', '3A',
 58900.00, 528.70, 0.90,
 128000.00, 885000.00, 250000.00,
 1263000.00, '2025-05-30');

-- Verify data
SELECT 
  bill_month,
  kwh_consumption,
  power_factor,
  total_amount_payable,
  cost_per_kwh
FROM electricity_bills
ORDER BY bill_date DESC;
