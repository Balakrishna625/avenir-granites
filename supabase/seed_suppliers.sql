-- Insert sample suppliers if none exist
INSERT INTO granite_suppliers (id, name, contact_person, email, phone, address)
SELECT 
  gen_random_uuid(),
  'Rising Sun Exports',
  'Manager',
  'manager@risingsun.com',
  '+91-9876543210',
  'Quarry Road, Karnataka'
WHERE NOT EXISTS (SELECT 1 FROM granite_suppliers WHERE name = 'Rising Sun Exports');

INSERT INTO granite_suppliers (id, name, contact_person, email, phone, address)
SELECT 
  gen_random_uuid(),
  'Bargandy Quarry',
  'Sales Head',
  'sales@bargandy.com',
  '+91-9876543211',
  'Industrial Area, Rajasthan'
WHERE NOT EXISTS (SELECT 1 FROM granite_suppliers WHERE name = 'Bargandy Quarry');

INSERT INTO granite_suppliers (id, name, contact_person, email, phone, address)
SELECT 
  gen_random_uuid(),
  'Local Granite Quarry',
  'Owner',
  'owner@localquarry.com',
  '+91-9876543212',
  'Local Area, Tamil Nadu'
WHERE NOT EXISTS (SELECT 1 FROM granite_suppliers WHERE name = 'Local Granite Quarry');