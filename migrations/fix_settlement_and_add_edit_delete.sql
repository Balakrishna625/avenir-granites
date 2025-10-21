-- Fix Settlement System to Properly Reset Customer Balances
-- Add ability to edit and delete settlements

-- 1. Fix settle_customer_account function to update customers.old_due_amount
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
  v_carried_forward numeric;
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
  
  -- Get old due and waived amount from the period
  select 
    coalesce(old_due_amount, 0),
    coalesce(waived_amount, 0)
  into v_old_due, v_waived
  from customer_account_periods
  where id = v_current_period_id;
  
  v_total_pending := v_total_invoiced - v_total_received + v_old_due - v_waived;
  
  -- Calculate what's carried forward to next period
  if p_waive_remaining then
    -- Waiving everything remaining
    v_waived := v_waived + (v_total_pending - p_settlement_amount);
    v_carried_forward := 0;
  else
    -- Carrying forward any remaining balance
    v_carried_forward := greatest(v_total_pending - p_settlement_amount, 0);
  end if;
  
  -- Update current period with settlement details
  update customer_account_periods
  set 
    end_date = current_date,
    settlement_date = current_date,
    total_invoiced = v_total_invoiced,
    total_received = v_total_received + p_settlement_amount,
    total_pending = v_carried_forward,
    old_due_amount = v_old_due,
    waived_amount = v_waived,
    settlement_amount = p_settlement_amount,
    settlement_mode = p_settlement_mode,
    settlement_reference = p_settlement_reference,
    settlement_notes = p_settlement_notes,
    settled_by = p_settled_by,
    is_active = false
  where id = v_current_period_id;
  
  -- CRITICAL FIX: Update the customer's old_due_amount to the carried forward amount
  -- This ensures that when we query the customer, their old_due_amount reflects what's being carried forward
  update customers
  set old_due_amount = v_carried_forward
  where id = p_customer_id;
  
  -- Create new active period starting fresh
  insert into customer_account_periods (
    customer_id,
    period_number,
    start_date,
    is_active,
    old_due_amount
  )
  select 
    p_customer_id,
    coalesce(max(period_number), 0) + 1,
    current_date,
    true,
    v_carried_forward  -- Start new period with carried forward amount (or 0 if waived)
  from customer_account_periods
  where customer_id = p_customer_id;
  
  -- Return settlement summary
  v_result := jsonb_build_object(
    'success', true,
    'settled_period_id', v_current_period_id,
    'settlement_amount', p_settlement_amount,
    'waived_amount', v_waived,
    'carried_forward', v_carried_forward
  );
  
  return v_result;
end;
$$;

-- 2. Function to reverse/delete a settlement (undo)
create or replace function reverse_settlement(
  p_period_id uuid,
  p_user text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_period_number int;
  v_next_period_id uuid;
  v_has_next_activity boolean;
  v_old_due numeric;
  v_result jsonb;
begin
  -- Get period details
  select customer_id, period_number, old_due_amount
  into v_customer_id, v_period_number, v_old_due
  from customer_account_periods
  where id = p_period_id and is_active = false;
  
  if v_customer_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Period not found or is still active'
    );
  end if;
  
  -- Check if there's a next period
  select id into v_next_period_id
  from customer_account_periods
  where customer_id = v_customer_id
    and period_number = v_period_number + 1
  limit 1;
  
  if v_next_period_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot reverse: No next period found'
    );
  end if;
  
  -- Check if next period has any activity (consignments or transactions)
  select exists(
    select 1 from consignments where period_id = v_next_period_id
    union
    select 1 from transactions where period_id = v_next_period_id
  ) into v_has_next_activity;
  
  if v_has_next_activity then
    return jsonb_build_object(
      'success', false,
      'error', 'Cannot reverse: Next period already has transactions. Delete those first.'
    );
  end if;
  
  -- Safe to reverse:
  -- 1. Delete the next period (empty period created after settlement)
  delete from customer_account_periods
  where id = v_next_period_id;
  
  -- 2. Reactivate the settled period
  update customer_account_periods
  set 
    is_active = true,
    end_date = null,
    settlement_date = null,
    settlement_amount = 0,
    settlement_mode = null,
    settlement_reference = null,
    settlement_notes = null,
    settled_by = null
  where id = p_period_id;
  
  -- 3. Restore customer's old_due_amount to what it was before settlement
  update customers
  set old_due_amount = v_old_due
  where id = v_customer_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Settlement reversed successfully',
    'customer_id', v_customer_id,
    'period_id', p_period_id
  );
  
  return v_result;
end;
$$;

-- 3. Function to edit settlement details (without reversing the settlement)
create or replace function edit_settlement(
  p_period_id uuid,
  p_settlement_amount numeric default null,
  p_settlement_mode text default null,
  p_settlement_reference text default null,
  p_settlement_notes text default null,
  p_edited_by text default null
)
returns jsonb
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_old_settlement_amount numeric;
  v_new_carried_forward numeric;
  v_total_invoiced numeric;
  v_total_received numeric;
  v_old_due numeric;
  v_waived numeric;
  v_result jsonb;
begin
  -- Get current period details
  select 
    customer_id, 
    settlement_amount, 
    total_invoiced, 
    total_received,
    old_due_amount,
    waived_amount
  into 
    v_customer_id, 
    v_old_settlement_amount,
    v_total_invoiced,
    v_total_received,
    v_old_due,
    v_waived
  from customer_account_periods
  where id = p_period_id and is_active = false;
  
  if v_customer_id is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Period not found or is still active'
    );
  end if;
  
  -- Use provided amount or keep existing
  if p_settlement_amount is not null then
    v_old_settlement_amount := p_settlement_amount;
  end if;
  
  -- Recalculate carried forward amount
  v_new_carried_forward := greatest(
    v_total_invoiced - v_total_received + v_old_due - v_waived - v_old_settlement_amount,
    0
  );
  
  -- Update the settled period
  update customer_account_periods
  set 
    settlement_amount = coalesce(p_settlement_amount, settlement_amount),
    settlement_mode = coalesce(p_settlement_mode, settlement_mode),
    settlement_reference = coalesce(p_settlement_reference, settlement_reference),
    settlement_notes = coalesce(p_settlement_notes, settlement_notes),
    total_received = v_total_received + v_old_settlement_amount,
    total_pending = v_new_carried_forward,
    settled_by = coalesce(p_edited_by || ' (edited)', settled_by)
  where id = p_period_id;
  
  -- Update next period's old_due_amount with new carried forward amount
  update customer_account_periods
  set old_due_amount = v_new_carried_forward
  where customer_id = v_customer_id
    and period_number = (
      select period_number + 1 
      from customer_account_periods 
      where id = p_period_id
    );
  
  -- Update customer's current old_due_amount
  update customers
  set old_due_amount = v_new_carried_forward
  where id = v_customer_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'message', 'Settlement updated successfully',
    'new_carried_forward', v_new_carried_forward
  );
  
  return v_result;
end;
$$;

-- Grant permissions
grant execute on function settle_customer_account to authenticated;
grant execute on function reverse_settlement to authenticated;
grant execute on function edit_settlement to authenticated;

-- Add comments
comment on function settle_customer_account is 'Settle customer account, properly resetting old_due_amount to 0 or carried forward amount';
comment on function reverse_settlement is 'Reverse a settlement by reactivating the period and deleting the next empty period';
comment on function edit_settlement is 'Edit settlement details without reversing the entire settlement';
