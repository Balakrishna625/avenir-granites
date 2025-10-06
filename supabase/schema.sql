-- Granite Ledger schema (safe, relational)

create extension if not exists pgcrypto; -- for gen_random_uuid on some Postgres versions

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists consignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date date not null,
  total numeric not null,
  rtgs_expected numeric not null default 0,
  cash_expected numeric not null default 0,
  remarks text
);
create index if not exists consignments_cust_date_idx on consignments(customer_id, date);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date date not null,
  mode text not null check (mode in ('RTGS','CASH')),
  account_id uuid not null references bank_accounts(id),
  amount numeric not null,
  note text
);
create index if not exists transactions_cust_date_idx on transactions(customer_id, date);

-- Expense Management Tables

create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  color text default '#6B7280',
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  gst_number text,
  vendor_code text unique,
  payment_terms text,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists expense_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  account_type text not null check (account_type in ('CASH', 'BANK', 'CREDIT_CARD', 'PETTY_CASH')),
  account_number text,
  bank_name text,
  current_balance numeric default 0,
  is_active boolean default true,
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text unique not null,
  date date not null,
  category_id uuid not null references expense_categories(id),
  vendor_id uuid references vendors(id),
  account_id uuid not null references expense_accounts(id),
  amount numeric not null,
  tax_amount numeric default 0,
  total_amount numeric not null,
  description text not null,
  invoice_number text,
  payment_method text not null check (payment_method in ('CASH', 'CHEQUE', 'RTGS', 'UPI', 'CREDIT_CARD')),
  payment_status text not null default 'PAID' check (payment_status in ('PAID', 'PENDING', 'CANCELLED')),
  receipt_url text,
  notes text,
  tags text[],
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on expenses(date);
create index if not exists expenses_category_idx on expenses(category_id);
create index if not exists expenses_vendor_idx on expenses(vendor_id);
create index if not exists expenses_account_idx on expenses(account_id);

-- Expense line items for detailed breakdown
create table if not exists expense_items (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  item_name text not null,
  quantity numeric default 1,
  unit_price numeric not null,
  total_price numeric not null,
  unit text default 'pcs',
  created_at timestamptz not null default now()
);

-- seed banks (idempotent)
insert into bank_accounts(name)
select x.name from (values ('Avenir A/C'),('Galaxy A/C'),('Counter')) as x(name)
where not exists (select 1 from bank_accounts b where b.name = x.name);

-- seed expense categories (idempotent)
insert into expense_categories(name, description, color)
select x.name, x.description, x.color from (values 
  ('Raw Materials', 'Granite blocks, stones, and raw materials', '#EF4444'),
  ('Machinery & Equipment', 'Cutting machines, polishing equipment, tools', '#3B82F6'),
  ('Consumables', 'Oils, grease, segments, blades, abrasives', '#F59E0B'),
  ('Transportation', 'Vehicle fuel, maintenance, transportation costs', '#10B981'),
  ('Utilities', 'Electricity, water, internet, phone bills', '#8B5CF6'),
  ('Office Expenses', 'Stationery, office supplies, software', '#6B7280'),
  ('Employee Benefits', 'Salaries, bonuses, medical, insurance', '#EC4899'),
  ('Maintenance & Repairs', 'Equipment repair, facility maintenance', '#F97316'),
  ('Marketing & Sales', 'Advertising, promotional materials, client entertainment', '#14B8A6'),
  ('Professional Services', 'Legal, accounting, consulting fees', '#84CC16'),
  ('Insurance', 'Equipment, vehicle, business insurance', '#A855F7'),
  ('Miscellaneous', 'Other business expenses', '#64748B')
) as x(name, description, color)
where not exists (select 1 from expense_categories ec where ec.name = x.name);

-- seed expense accounts (idempotent)
insert into expense_accounts(name, account_type, current_balance)
select x.name, x.account_type, x.balance from (values 
  ('Petty Cash', 'PETTY_CASH', 50000),
  ('Main Bank Account', 'BANK', 1000000),
  ('Business Credit Card', 'CREDIT_CARD', 0),
  ('Cash Counter', 'CASH', 25000)
) as x(name, account_type, balance)
where not exists (select 1 from expense_accounts ea where ea.name = x.name);

-- Function to generate expense number
create or replace function generate_expense_number()
returns text as $$
declare
  next_num integer;
  expense_num text;
begin
  select coalesce(max(cast(substring(expense_number from 4) as integer)), 0) + 1 
  into next_num
  from expenses 
  where expense_number like 'EXP%';
  
  expense_num := 'EXP' || lpad(next_num::text, 6, '0');
  return expense_num;
end;
$$ language plpgsql;

-- Function to update account balance
create or replace function update_account_balance(account_id uuid, amount numeric)
returns void as $$
begin
  update expense_accounts 
  set current_balance = current_balance + amount
  where id = account_id;
end;
$$ language plpgsql;

-- Granite Processing Tables

-- Suppliers/Quarries table
create table if not exists granite_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_person text,
  phone text,
  address text,
  created_at timestamptz not null default now()
);

-- Granite Consignments (batches from quarry)
create table if not exists granite_consignments (
  id uuid primary key default gen_random_uuid(),
  consignment_number text not null unique,
  supplier_id uuid not null references granite_suppliers(id),
  arrival_date date not null,
  total_blocks integer default 0,
  total_net_measurement numeric default 0,
  total_gross_measurement numeric default 0,
  total_elavance numeric default 0,
  payment_cash numeric default 0,
  payment_upi numeric default 0,
  transport_cost numeric default 0,
  total_expenditure numeric default 0,
  status text default 'ACTIVE' check (status in ('ACTIVE', 'COMPLETED', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now()
);

-- Individual Granite Blocks
create table if not exists granite_blocks (
  id uuid primary key default gen_random_uuid(),
  consignment_id uuid not null references granite_consignments(id) on delete cascade,
  block_no text not null,
  grade text,
  gross_measurement numeric not null,
  net_measurement numeric not null,
  elavance numeric generated always as (gross_measurement - net_measurement) stored,
  total_sqft numeric default 0,
  total_slabs integer default 0,
  raw_material_rate_per_sqft numeric default 0,
  production_cost_per_sqft numeric default 40,
  total_cost_per_sqft numeric default 0,
  status text default 'RAW' check (status in ('RAW', 'CUTTING', 'CUT', 'SOLD')),
  created_at timestamptz not null default now(),
  unique(consignment_id, block_no)
);

-- Block Parts (A, B, C sections after cutting)
create table if not exists granite_block_parts (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references granite_blocks(id) on delete cascade,
  part_name text not null check (part_name in ('A', 'B', 'C', 'D')),
  slabs_count integer not null default 0,
  sqft numeric not null default 0,
  thickness numeric default 20, -- mm
  status text default 'PRODUCED' check (status in ('PRODUCED', 'READY', 'SOLD', 'DEFECTIVE')),
  is_sold boolean default false,
  sold_sqft numeric default 0,
  remaining_sqft numeric generated always as (sqft - sold_sqft) stored,
  created_at timestamptz not null default now(),
  unique(block_id, part_name)
);

-- Granite Sales
create table if not exists granite_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique,
  block_part_id uuid not null references granite_block_parts(id),
  buyer_name text not null,
  sale_date date not null,
  sqft_sold numeric not null,
  rate_per_sqft numeric not null,
  total_selling_price numeric generated always as (sqft_sold * rate_per_sqft) stored,
  profit_per_sqft numeric default 0,
  total_profit numeric generated always as (sqft_sold * profit_per_sqft) stored,
  payment_mode text default 'PENDING' check (payment_mode in ('CASH', 'UPI', 'RTGS', 'PENDING')),
  notes text,
  created_at timestamptz not null default now()
);

-- Indexes for granite tables
create index if not exists granite_consignments_supplier_date_idx on granite_consignments(supplier_id, arrival_date);
create index if not exists granite_blocks_consignment_idx on granite_blocks(consignment_id);
create index if not exists granite_block_parts_block_idx on granite_block_parts(block_id);
create index if not exists granite_block_parts_status_idx on granite_block_parts(status);
create index if not exists granite_sales_buyer_date_idx on granite_sales(buyer_name, sale_date);

-- Seed granite suppliers
insert into granite_suppliers(name, contact_person)
select x.name, x.contact from (values 
  ('Rising Sun Exports', 'Manager'),
  ('Bargandy Quarry', 'Sales Head'),
  ('Local Granite Quarry', 'Owner')
) as x(name, contact)
where not exists (select 1 from granite_suppliers gs where gs.name = x.name);

-- Functions for granite calculations

-- Function to update block totals when parts are added/updated
create or replace function update_block_totals()
returns trigger as $$
begin
  update granite_blocks 
  set 
    total_sqft = (
      select coalesce(sum(sqft), 0) 
      from granite_block_parts 
      where block_id = coalesce(NEW.block_id, OLD.block_id)
    ),
    total_slabs = (
      select coalesce(sum(slabs_count), 0) 
      from granite_block_parts 
      where block_id = coalesce(NEW.block_id, OLD.block_id)
    )
  where id = coalesce(NEW.block_id, OLD.block_id);
  
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

-- Trigger to update block totals
drop trigger if exists trigger_update_block_totals on granite_block_parts;
create trigger trigger_update_block_totals
  after insert or update or delete on granite_block_parts
  for each row execute function update_block_totals();

-- Function to update consignment totals
create or replace function update_consignment_totals()
returns trigger as $$
begin
  update granite_consignments 
  set 
    total_blocks = (
      select count(*) 
      from granite_blocks 
      where consignment_id = coalesce(NEW.consignment_id, OLD.consignment_id)
    ),
    total_net_measurement = (
      select coalesce(sum(net_measurement), 0) 
      from granite_blocks 
      where consignment_id = coalesce(NEW.consignment_id, OLD.consignment_id)
    ),
    total_gross_measurement = (
      select coalesce(sum(gross_measurement), 0) 
      from granite_blocks 
      where consignment_id = coalesce(NEW.consignment_id, OLD.consignment_id)
    ),
    total_elavance = (
      select coalesce(sum(elavance), 0) 
      from granite_blocks 
      where consignment_id = coalesce(NEW.consignment_id, OLD.consignment_id)
    )
  where id = coalesce(NEW.consignment_id, OLD.consignment_id);
  
  return coalesce(NEW, OLD);
end;
$$ language plpgsql;

-- Trigger to update consignment totals
drop trigger if exists trigger_update_consignment_totals on granite_blocks;
create trigger trigger_update_consignment_totals
  after insert or update or delete on granite_blocks
  for each row execute function update_consignment_totals();

-- Function to generate sale number
create or replace function generate_sale_number()
returns text as $$
declare
  next_num integer;
  sale_num text;
begin
  select coalesce(max(cast(substring(sale_number from 4) as integer)), 0) + 1 
  into next_num
  from granite_sales 
  where sale_number like 'GS-%';
  
  sale_num := 'GS-' || lpad(next_num::text, 6, '0');
  return sale_num;
end;
$$ language plpgsql;
