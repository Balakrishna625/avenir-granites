-- Create electricity_bills table to track monthly power consumption and costs
CREATE TABLE IF NOT EXISTS electricity_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bill Identification
  bill_number VARCHAR(50) UNIQUE NOT NULL,
  bill_month VARCHAR(20) NOT NULL, -- e.g., "OCT-2025"
  bill_date DATE NOT NULL,
  consumer_number VARCHAR(50) NOT NULL,
  
  -- Connection Details
  contracted_demand DECIMAL(10,2), -- in KVA/MD
  voltage_level VARCHAR(50), -- e.g., "11 KV (COMM-FEEDER)"
  category VARCHAR(10), -- e.g., "3A"
  
  -- Meter Readings
  reading_date_previous DATE,
  reading_date_current DATE,
  kwh_previous DECIMAL(12,2),
  kwh_current DECIMAL(12,2),
  kwh_consumption DECIMAL(12,2) NOT NULL, -- Difference
  
  kvah_previous DECIMAL(12,2),
  kvah_current DECIMAL(12,2),
  kvah_consumption DECIMAL(12,2),
  
  kva_demand DECIMAL(10,2), -- Maximum demand recorded
  power_factor DECIMAL(5,3), -- e.g., 0.93
  
  -- Charges Breakdown
  demand_charges_rate DECIMAL(10,2),
  demand_charges_amount DECIMAL(12,2),
  
  energy_charges_rate DECIMAL(10,4),
  energy_charges_amount DECIMAL(12,2),
  
  tod_charges DECIMAL(12,2), -- Time of Day charges
  electricity_duty DECIMAL(12,2),
  
  -- FPPCA (Fuel & Power Purchase Cost Adjustment)
  fppca_jan_2023 DECIMAL(12,2) DEFAULT 0,
  fppca_aug_2023 DECIMAL(12,2) DEFAULT 0,
  fppca_aug_2025 DECIMAL(12,2) DEFAULT 0,
  
  -- Additional Charges
  customer_charges DECIMAL(10,2) DEFAULT 0,
  late_payment_charges DECIMAL(10,2) DEFAULT 0,
  interest_on_edd DECIMAL(10,2) DEFAULT 0,
  voltage_surcharge DECIMAL(10,2) DEFAULT 0,
  wheeling_charges DECIMAL(10,2) DEFAULT 0,
  transformer_hire_charge DECIMAL(10,2) DEFAULT 0,
  acd_surcharge DECIMAL(10,2) DEFAULT 0,
  
  -- Arrears
  arrears_cc_charge DECIMAL(12,2) DEFAULT 0,
  arrears_surcharge DECIMAL(12,2) DEFAULT 0,
  arrears_court_cases DECIMAL(12,2) DEFAULT 0,
  arrears_others DECIMAL(12,2) DEFAULT 0,
  arrears_total DECIMAL(12,2) DEFAULT 0,
  
  last_paid_amount DECIMAL(12,2),
  last_paid_date DATE,
  
  -- Totals
  current_charges_subtotal DECIMAL(12,2),
  current_year_arrears DECIMAL(12,2),
  net_bill_amount DECIMAL(12,2) NOT NULL,
  total_amount_payable DECIMAL(12,2) NOT NULL,
  
  due_date DATE NOT NULL,
  disconnection_date DATE,
  
  -- Business Analytics Fields
  cost_per_kwh DECIMAL(10,4) GENERATED ALWAYS AS (
    CASE 
      WHEN kwh_consumption > 0 THEN net_bill_amount / kwh_consumption
      ELSE 0
    END
  ) STORED,
  
  fixed_charges DECIMAL(12,2) GENERATED ALWAYS AS (
    demand_charges_amount + customer_charges
  ) STORED,
  
  variable_charges DECIMAL(12,2) GENERATED ALWAYS AS (
    energy_charges_amount + tod_charges + electricity_duty + 
    fppca_jan_2023 + fppca_aug_2023 + fppca_aug_2025
  ) STORED,
  
  -- Notes
  notes TEXT,
  bill_file_url TEXT, -- Store uploaded bill PDF/image
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX idx_electricity_bills_bill_date ON electricity_bills(bill_date DESC);
CREATE INDEX idx_electricity_bills_bill_month ON electricity_bills(bill_month);
CREATE INDEX idx_electricity_bills_consumer ON electricity_bills(consumer_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_electricity_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER electricity_bills_updated_at
  BEFORE UPDATE ON electricity_bills
  FOR EACH ROW
  EXECUTE FUNCTION update_electricity_bills_updated_at();

-- Create view for monthly electricity analytics
CREATE OR REPLACE VIEW electricity_monthly_summary AS
SELECT 
  bill_month,
  bill_date,
  kwh_consumption,
  kva_demand,
  power_factor,
  net_bill_amount,
  total_amount_payable,
  cost_per_kwh,
  fixed_charges,
  variable_charges,
  arrears_total,
  -- Calculate efficiency metrics
  (demand_charges_amount / NULLIF(kva_demand, 0)) as cost_per_kva,
  -- Power factor penalty indicator
  CASE 
    WHEN power_factor < 0.95 THEN 'Poor - Needs Improvement'
    WHEN power_factor >= 0.95 AND power_factor < 0.98 THEN 'Good'
    WHEN power_factor >= 0.98 THEN 'Excellent'
  END as power_factor_status
FROM electricity_bills
ORDER BY bill_date DESC;

-- Create view to correlate electricity with production
CREATE OR REPLACE VIEW electricity_production_correlation AS
SELECT 
  e.bill_month,
  e.bill_date,
  e.kwh_consumption,
  e.net_bill_amount,
  e.cost_per_kwh,
  e.kva_demand,
  e.power_factor,
  -- Production metrics from multi_cutter_reports
  COUNT(DISTINCT mc.id) as total_cutting_operations,
  COALESCE(SUM(mc.total_sqft), 0) as total_sqft_produced,
  -- Calculate efficiency
  CASE 
    WHEN SUM(mc.total_sqft) > 0 
    THEN e.kwh_consumption / SUM(mc.total_sqft)
    ELSE 0
  END as kwh_per_sqft,
  CASE 
    WHEN SUM(mc.total_sqft) > 0 
    THEN e.net_bill_amount / SUM(mc.total_sqft)
    ELSE 0
  END as electricity_cost_per_sqft
FROM electricity_bills e
LEFT JOIN multi_cutter_reports mc 
  ON TO_CHAR(mc.date, 'MON-YYYY') = e.bill_month
  OR (
    mc.date >= DATE_TRUNC('month', e.bill_date)
    AND mc.date < DATE_TRUNC('month', e.bill_date) + INTERVAL '1 month'
  )
GROUP BY 
  e.id,
  e.bill_month, 
  e.bill_date, 
  e.kwh_consumption, 
  e.net_bill_amount,
  e.cost_per_kwh,
  e.kva_demand,
  e.power_factor
ORDER BY e.bill_date DESC;

COMMENT ON TABLE electricity_bills IS 'Stores monthly electricity bill details for factory operations analysis';
COMMENT ON VIEW electricity_production_correlation IS 'Correlates electricity consumption with production output to calculate efficiency metrics';
