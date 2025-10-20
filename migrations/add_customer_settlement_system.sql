-- Customer Account Settlement System
-- This allows customers to settle their accounts and start fresh while preserving historical data

-- Table to track different account periods for each customer
create table if not exists customer_account_periods (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  period_number int not null, -- 1, 2, 3... for each settlement
  start_date date not null,
  end_date date, -- null means current active period
  
  -- Financial summary at time of settlement
  total_invoiced numeric not null default 0,
  total_received numeric not null default 0,
  total_pending numeric not null default 0,
  old_due_amount numeric not null default 0,
  waived_amount numeric not null default 0,
  settlement_amount numeric not null default 0, -- Final amount received at settlement
  
  -- Settlement details
  settlement_date date,
  settlement_mode text check (settlement_mode in ('RTGS', 'CASH', 'CHEQUE', 'UPI', 'PARTIAL_WAIVER', 'FULL_WAIVER')),
  settlement_reference text, -- Transaction reference number
  settlement_notes text,
  
  -- Metadata
  is_active boolean not null default true, -- Only one period can be active per customer
  created_at timestamptz not null default now(),
  settled_by text, -- User who performed settlement
  
  -- Ensure only one active period per customer
  unique(customer_id, period_number),
  constraint only_one_active_period_per_customer exclude using btree (customer_id with =) where (is_active = true)
);

create index if not exists customer_account_periods_customer_idx on customer_account_periods(customer_id);
create index if not exists customer_account_periods_active_idx on customer_account_periods(customer_id, is_active) where is_active = true;

-- Add period_id to consignments to track which account period they belong to
alter table consignments add column if not exists period_id uuid references customer_account_periods(id) on delete set null;
create index if not exists consignments_period_idx on consignments(period_id);

-- Add period_id to transactions to track which account period they belong to
alter table transactions add column if not exists period_id uuid references customer_account_periods(id) on delete set null;
create index if not exists transactions_period_idx on transactions(period_id);

-- Function to get or create active period for a customer
create or replace function get_or_create_active_period(p_customer_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_period_id uuid;
  v_next_period_number int;
begin
  -- Try to get existing active period
  select id into v_period_id
  from customer_account_periods
  where customer_id = p_customer_id
    and is_active = true
  limit 1;
  
  -- If no active period exists, create one
  if v_period_id is null then
    -- Get the next period number
    select coalesce(max(period_number), 0) + 1 into v_next_period_number
    from customer_account_periods
    where customer_id = p_customer_id;
    
    -- Create new active period
    insert into customer_account_periods (
      customer_id,
      period_number,
      start_date,
      is_active
    ) values (
      p_customer_id,
      v_next_period_number,
      current_date,
      true
    )
    returning id into v_period_id;
  end if;
  
  return v_period_id;
end;
$$;

-- Function to settle customer account
create or replace function settle_customer_account(
  p_customer_id uuid,
  p_settlement_amount numeric,
  p_settlement_mode text,
  p_settlement_reference text default null,
  p_settlement_notes text default null,
  p_waive_remaining boolean default false,
  p_settled_by text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_current_period_id uuid;
  v_total_invoiced numeric;
  v_total_received numeric;
  v_total_pending numeric;
  v_old_due numeric;
  v_waived numeric;
  v_result jsonb;
begin
  -- Get current active period
  select id into v_current_period_id
  from customer_account_periods
  where customer_id = p_customer_id
    and is_active = true
  limit 1;
  
  -- If no active period, create one first
  if v_current_period_id is null then
    v_current_period_id := get_or_create_active_period(p_customer_id);
  end if;
  
  -- Calculate current financials for this period
  select 
    coalesce(sum(c.total), 0) as total_invoiced,
    coalesce(sum(t.amount), 0) as total_received
  into v_total_invoiced, v_total_received
  from customer_account_periods cap
  left join consignments c on c.period_id = cap.id
  left join transactions t on t.period_id = cap.id
  where cap.id = v_current_period_id;
  
  -- Get old due and waived amount
  select 
    coalesce(old_due_amount, 0),
    coalesce(waived_amount, 0)
  into v_old_due, v_waived
  from customer_account_periods
  where id = v_current_period_id;
  
  v_total_pending := v_total_invoiced - v_total_received + v_old_due - v_waived;
  
  -- If waiving remaining balance
  if p_waive_remaining then
    v_waived := v_waived + v_total_pending;
    v_total_pending := 0;
  end if;
  
  -- Update current period with settlement details
  update customer_account_periods
  set 
    end_date = current_date,
    settlement_date = current_date,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received + p_settlement_amount,
    total_pending = greatest(v_total_pending - p_settlement_amount, 0),
    old_due_amount = v_old_due,
    waived_amount = v_waived,
    settlement_amount = p_settlement_amount,
    settlement_mode = p_settlement_mode,
    settlement_reference = p_settlement_reference,
    settlement_notes = p_settlement_notes,
    settled_by = p_settled_by,
    is_active = false
  where id = v_current_period_id;
  
  -- Create new active period
  insert into customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount
  )
  select 
    p_customer_id,
    max(period_number) + 1,
    current_date,
    true,
    case 
      when p_waive_remaining then 0
      else greatest(v_total_pending - p_settlement_amount, 0)
    end
  from customer_account_periods
  where customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'waived_amount', v_waived,
    'carried_forward', case when p_waive_remaining then 0 else greatest(v_total_pending - p_settlement_amount, 0) end
  );
  
  return v_result;
end;
$$;

-- View to get customer summary with current period
create or replace view customer_current_summary as
select 
  c.id,
  c.name,
  cap.id as current_period_id,
  cap.period_number,
  cap.start_date as period_start_date,
  coalesce(sum(con.total), 0) as total_invoiced,
  coalesce(sum(t.amount), 0) as total_received,
  coalesce(sum(con.total), 0) - coalesce(sum(t.amount), 0) + coalesce(cap.old_due_amount, 0) - coalesce(cap.waived_amount, 0) as total_pending,
  coalesce(cap.old_due_amount, 0) as old_due_amount,
  coalesce(cap.waived_amount, 0) as waived_amount,
  count(distinct con.id) as consignment_count,
  max(t.date) as last_payment_date
from customers c
left join customer_account_periods cap on cap.customer_id = c.id and cap.is_active = true
left join consignments con on con.period_id = cap.id
left join transactions t on t.period_id = cap.id
group by c.id, c.name, cap.id, cap.period_number, cap.start_date, cap.old_due_amount, cap.waived_amount;

-- View to get all historical periods for a customer
create or replace view customer_period_history as
select 
  cap.*,
  c.name as customer_name,
  count(distinct con.id) as consignment_count,
  count(distinct t.id) as transaction_count
from customer_account_periods cap
join customers c on c.id = cap.customer_id
left join consignments con on con.period_id = cap.id
left join transactions t on t.period_id = cap.id
group by cap.id, c.name
order by cap.customer_id, cap.period_number desc;

-- Trigger to auto-assign period_id to new consignments
create or replace function auto_assign_period_to_consignment()
returns trigger
language plpgsql
as $$
begin
  if new.period_id is null then
    new.period_id := get_or_create_active_period(new.customer_id);
  end if;
  return new;
end;
$$;

create trigger consignment_auto_period
  before insert on consignments
  for each row
  execute function auto_assign_period_to_consignment();

-- Trigger to auto-assign period_id to new transactions
create or replace function auto_assign_period_to_transaction()
returns trigger
language plpgsql
as $$
begin
  if new.period_id is null then
    new.period_id := get_or_create_active_period(new.customer_id);
  end if;
  return new;
end;
$$;

create trigger transaction_auto_period
  before insert on transactions
  for each row
  execute function auto_assign_period_to_transaction();

-- Initialize periods for existing customers
-- This will create a period for each existing customer with their current data
do $$
declare
  r record;
  v_period_id uuid;
begin
  for r in select id from customers loop
    -- Create initial active period
    insert into customer_account_periods (
      customer_id,
      period_number,
      start_date,
      is_active
    ) values (
      r.id,
      1,
      '2024-01-01', -- Adjust this to your business start date
      true
    )
    returning id into v_period_id;
    
    -- Assign existing consignments to this period
    update consignments
    set period_id = v_period_id
    where customer_id = r.id
      and period_id is null;
    
    -- Assign existing transactions to this period
    update transactions
    set period_id = v_period_id
    where customer_id = r.id
      and period_id is null;
  end loop;
end;
$$;

-- Grant permissions (adjust as needed for your RLS policies)
grant select, insert, update on customer_account_periods to authenticated;
grant execute on function get_or_create_active_period to authenticated;
grant execute on function settle_customer_account to authenticated;
grant select on customer_current_summary to authenticated;
grant select on customer_period_history to authenticated;
