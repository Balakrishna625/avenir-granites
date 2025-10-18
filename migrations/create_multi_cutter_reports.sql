-- Multi Cutter Production Reports Schema
-- Tracks daily production from 3 multi-cutter machines
-- Each machine can process multiple blocks per day with different materials

CREATE TABLE IF NOT EXISTS multi_cutter_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  machine VARCHAR(20) NOT NULL CHECK (machine IN ('Machine-1', 'Machine-2', 'Machine-3')),
  
  -- JSONB array to store multiple blocks processed by this machine on this date
  -- Structure: [{"block_name": "AVG-16B", "material_type": "S/G", "slabs": 26, "sqft": 721}, ...]
  blocks JSONB DEFAULT '[]'::jsonb NOT NULL,
  
  -- Aggregated totals for this machine on this date
  total_slabs INTEGER DEFAULT 0,
  total_sqft NUMERIC DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  
  -- Ensure one entry per machine per date
  UNIQUE(date, machine)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS multi_cutter_reports_date_idx ON multi_cutter_reports(date DESC);
CREATE INDEX IF NOT EXISTS multi_cutter_reports_machine_idx ON multi_cutter_reports(machine);
CREATE INDEX IF NOT EXISTS multi_cutter_reports_blocks_idx ON multi_cutter_reports USING gin(blocks);

-- Comments for documentation
COMMENT ON TABLE multi_cutter_reports IS 
  'Daily production tracking for 3 multi-cutter machines. Each machine can process multiple granite blocks per day.';

COMMENT ON COLUMN multi_cutter_reports.machine IS 
  'Machine identifier: Machine-1, Machine-2, or Machine-3';

COMMENT ON COLUMN multi_cutter_reports.blocks IS 
  'JSONB array of blocks processed. Each block contains: {block_name: string, material_type: string (S/G, B/P, etc.), slabs: number, sqft: number}. 
   Example: [{"block_name":"AVG-16B","material_type":"S/G","slabs":26,"sqft":721},{"block_name":"AVG-01A","material_type":"S/G","slabs":45,"sqft":1282}]';

COMMENT ON COLUMN multi_cutter_reports.total_slabs IS 
  'Total number of slabs produced by this machine on this date (sum of all blocks)';

COMMENT ON COLUMN multi_cutter_reports.total_sqft IS 
  'Total square footage produced by this machine on this date (sum of all blocks)';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_multi_cutter_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_multi_cutter_reports_timestamp
  BEFORE UPDATE ON multi_cutter_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_multi_cutter_reports_updated_at();
