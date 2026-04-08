import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category_id = searchParams.get("category_id");
  const vendor_id = searchParams.get("vendor_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  let query = supabaseAdmin
    .from("expenses")
    .select(`
      *,
      expense_categories(name, color),
      vendors(name, vendor_code),
      bank_accounts(name),
      expense_items(*)
    `);

  if (category_id) query = query.eq("category_id", category_id);
  if (vendor_id) query = query.eq("vendor_id", vendor_id);
  if (status) query = query.eq("payment_status", status);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query.order("date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const {
    date,
    category_id,
    vendor_id,
    account_id,
    amount,
    tax_amount = 0,
    description,
    invoice_number,
    payment_method,
    payment_status = "PAID",
    notes,
    tags = [],
    items = [],
    // Multi-month expense allocation fields
    is_multi_month_expense = false,
    allocated_amount,
    allocation_notes,
    parent_expense_id = null, // For auto-carried forward entries
    original_amount = null
  } = body;

  if (!date || !category_id || !account_id || !amount || !description || !payment_method) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    // Generate expense number
    const { data: expenseNumber } = await supabaseAdmin.rpc('generate_expense_number');
    
    const total_amount = Number(amount) + Number(tax_amount);
    const allocatedAmt = allocated_amount != null ? Number(allocated_amount) : total_amount;
    const remainingAmt = is_multi_month_expense ? total_amount - allocatedAmt : 0;

    // Insert expense
    const { data: expense, error: expenseError } = await supabaseAdmin
      .from("expenses")
      .insert({
        expense_number: expenseNumber,
        date,
        category_id,
        vendor_id: vendor_id || null,
        account_id,
        amount: Number(amount),
        tax_amount: Number(tax_amount),
        total_amount,
        description: description.trim(),
        invoice_number: invoice_number?.trim() || null,
        payment_method,
        payment_status,
        notes: notes?.trim() || null,
        tags: tags.length > 0 ? tags : null,
        created_by: "system", // In future, get from auth
        // Multi-month expense allocation fields
        is_multi_month_expense,
        allocated_amount: allocatedAmt,
        allocation_notes: allocation_notes?.trim() || null,
        parent_expense_id: parent_expense_id || null,
        original_amount: original_amount || total_amount,
        remaining_amount: remainingAmt
      })
      .select()
      .single();

    if (expenseError) throw expenseError;

    // Insert expense items if provided
    if (items.length > 0) {
      const expenseItems = items.map((item: any) => ({
        expense_id: expense.id,
        item_name: item.name,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price),
        total_price: Number(item.quantity || 1) * Number(item.unit_price),
        unit: item.unit || 'pcs'
      }));

      const { error: itemsError } = await supabaseAdmin
        .from("expense_items")
        .insert(expenseItems);

      if (itemsError) throw itemsError;
    }

    // Auto-create next month's entry if there's remaining amount
    if (is_multi_month_expense && remainingAmt > 0) {
      const currentDate = new Date(date);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      const nextMonthStr = nextMonth.toISOString().split('T')[0];

      // Generate expense number for next month
      const { data: nextExpenseNumber } = await supabaseAdmin.rpc('generate_expense_number');

      // Get parent info for notes
      const parentMonth = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const autoNotes = `Carried forward from ${parentMonth} (${expense.expense_number})`;

      const { error: nextMonthError } = await supabaseAdmin
        .from("expenses")
        .insert({
          expense_number: nextExpenseNumber,
          date: nextMonthStr,
          category_id,
          vendor_id: vendor_id || null,
          account_id,
          amount: remainingAmt, // Only the remaining amount
          tax_amount: 0,
          total_amount: remainingAmt,
          description: description.trim(),
          invoice_number: invoice_number?.trim() || null,
          payment_method,
          payment_status: 'PAID', // Already paid in previous month
          notes: autoNotes,
          tags: tags.length > 0 ? tags : null,
          created_by: "system",
          // Multi-month tracking
          is_multi_month_expense: true,
          allocated_amount: remainingAmt, // Default to full remaining (user can edit)
          allocation_notes: allocation_notes?.trim() || null,
          parent_expense_id: expense.id,
          original_amount: original_amount || total_amount,
          remaining_amount: 0 // Assuming full allocation next month (user can edit to split further)
        });

      if (nextMonthError) {
        console.error('Failed to create next month entry:', nextMonthError);
        // Don't throw - current expense was created successfully
      }
    }

    // TODO: Update account balance in future version
    // For now, we'll skip automatic balance updates

    return NextResponse.json(expense);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}