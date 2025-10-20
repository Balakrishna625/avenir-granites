-- Performance Optimization for Customer Queries
-- This migration adds indexes and materialized views for faster customer data loading

-- Add composite indexes for faster filtering
create index if not exists consignments_customer_period_idx on consignments(customer_id, period_id) where period_id is not null;
create index if not exists transactions_customer_period_idx on transactions(customer_id, period_id) where period_id is not null;
create index if not exists waived_transactions_customer_idx on waived_transactions(customer_id);

-- Add index for faster customer lookups
create index if not exists customers_name_idx on customers(name);

-- Optimized function to get customer summary (replaces multiple API calls)
create or replace function get_customer_summary_optimized(
  p_customer_id uuid,
  p_from_date date default null,
  p_to_date date default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_result jsonb;
  v_period_id uuid;
  v_total_invoiced numeric := 0;
  v_total_received numeric := 0;
  v_total_waived numeric := 0;
  v_old_due numeric := 0;
  v_consignment_count int := 0;
  v_transaction_count int := 0;
  v_last_payment_date date;
  v_last_invoice_date date;
begin
  -- Get active period
  select id into v_period_id
  from customer_account_periods
  where customer_id = p_customer_id and is_active = true
  limit 1;
  
  -- Get old due amount
  select coalesce(old_due_amount, 0) into v_old_due
  from customers
  where id = p_customer_id;
  
  -- Calculate totals with optional date filtering
  select 
    coalesce(sum(c.total), 0),
    count(c.id),
    max(c.date)
  into v_total_invoiced, v_consignment_count, v_last_invoice_date
  from consignments c
  where c.customer_id = p_customer_id
    and c.period_id = v_period_id
    and (p_from_date is null or c.date >= p_from_date)
    and (p_to_date is null or c.date <= p_to_date);
  
  select 
    coalesce(sum(t.amount), 0),
    count(t.id),
    max(t.date)
  into v_total_received, v_transaction_count, v_last_payment_date
  from transactions t
  where t.customer_id = p_customer_id
    and t.period_id = v_period_id
    and (p_from_date is null or t.date >= p_from_date)
    and (p_to_date is null or t.date <= p_to_date);
  
  -- Get total waived amount (no date filter - lifetime waived)
  select coalesce(sum(amount), 0) into v_total_waived
  from waived_transactions
  where customer_id = p_customer_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'total_invoiced', v_total_invoiced,
    'total_received', v_total_received,
    'total_pending', v_total_invoiced - v_total_received,
    'old_due_amount', v_old_due,
    'waived_amount', v_total_waived,
    'total_receivables', v_total_invoiced + v_old_due - v_total_received - v_total_waived,
    'consignment_count', v_consignment_count,
    'transaction_count', v_transaction_count,
    'last_payment_date', v_last_payment_date,
    'last_invoice_date', v_last_invoice_date,
    'period_id', v_period_id
  );
  
  return v_result;
end;
$$;

-- Optimized function to get all customer summaries at once
create or replace function get_all_customer_summaries(
  p_from_date date default null,
  p_to_date date default null
)
returns table (
  id uuid,
  name text,
  total_invoiced numeric,
  total_received numeric,
  total_pending numeric,
  old_due_amount numeric,
  waived_amount numeric,
  total_receivables numeric,
  consignment_count bigint,
  transaction_count bigint,
  last_payment_date date,
  last_invoice_date date,
  collection_efficiency numeric,
  avg_payment_delay numeric
)
language plpgsql
stable
as $$
begin
  return query
  with customer_data as (
    select 
      c.id,
      c.name,
      c.old_due_amount,
      cap.id as period_id
    from customers c
    left join customer_account_periods cap 
      on cap.customer_id = c.id and cap.is_active = true
  ),
  consignment_agg as (
    select 
      cd.id as customer_id,
      coalesce(sum(co.total), 0) as total_invoiced,
      count(co.id) as consignment_count,
      max(co.date) as last_invoice_date,
      avg(extract(epoch from co.date)) as avg_invoice_timestamp
    from customer_data cd
    left join consignments co 
      on co.customer_id = cd.id 
      and co.period_id = cd.period_id
      and (p_from_date is null or co.date >= p_from_date)
      and (p_to_date is null or co.date <= p_to_date)
    group by cd.id
  ),
  transaction_agg as (
    select 
      cd.id as customer_id,
      coalesce(sum(t.amount), 0) as total_received,
      count(t.id) as transaction_count,
      max(t.date) as last_payment_date,
      avg(extract(epoch from t.date)) as avg_transaction_timestamp
    from customer_data cd
    left join transactions t 
      on t.customer_id = cd.id 
      and t.period_id = cd.period_id
      and (p_from_date is null or t.date >= p_from_date)
      and (p_to_date is null or t.date <= p_to_date)
    group by cd.id
  ),
  waived_agg as (
    select 
      customer_id,
      coalesce(sum(amount), 0) as total_waived
    from waived_transactions
    group by customer_id
  )
  select 
    cd.id,
    cd.name,
    ca.total_invoiced,
    ta.total_received,
    ca.total_invoiced - ta.total_received as total_pending,
    coalesce(cd.old_due_amount, 0) as old_due_amount,
    coalesce(wa.total_waived, 0) as waived_amount,
    ca.total_invoiced + coalesce(cd.old_due_amount, 0) - ta.total_received - coalesce(wa.total_waived, 0) as total_receivables,
    ca.consignment_count,
    ta.transaction_count,
    ta.last_payment_date,
    ca.last_invoice_date,
    case 
      when ca.total_invoiced > 0 then round((ta.total_received / ca.total_invoiced * 100)::numeric, 1)
      else 0
    end as collection_efficiency,
    case 
      when ca.avg_invoice_timestamp is not null and ta.avg_transaction_timestamp is not null then
        round(((ta.avg_transaction_timestamp - ca.avg_invoice_timestamp) / 86400)::numeric, 1)
      else 0
    end as avg_payment_delay
  from customer_data cd
  left join consignment_agg ca on ca.customer_id = cd.id
  left join transaction_agg ta on ta.customer_id = cd.id
  left join waived_agg wa on wa.customer_id = cd.id
  order by ca.total_invoiced desc nulls last;
end;
$$;

-- Grant permissions
grant execute on function get_customer_summary_optimized to authenticated;
grant execute on function get_all_customer_summaries to authenticated;

-- Add helpful comment
comment on function get_customer_summary_optimized is 'Optimized function to get customer summary with single query instead of multiple API calls';
comment on function get_all_customer_summaries is 'Optimized function to get all customer summaries with aggregated data in single query';
