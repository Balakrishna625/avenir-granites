import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// GET - Fetch vendor transactions by vendor ID
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendor_id');

    if (!vendorId) {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .select(`
        id,
        vendor_id,
        date,
        type,
        amount,
        notes,
        expense_id,
        created_at,
        updated_at
      `)
      .eq("vendor_id", vendorId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new vendor transaction (purchase or payment)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vendor_id, date, type, amount, notes, createExpense = false } = body;

    // Validation
    if (!vendor_id) {
      return NextResponse.json(
        { error: "vendor_id is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    if (!type || !['purchase', 'payment'].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'purchase' or 'payment'" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Insert transaction
    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .insert({
        vendor_id,
        date,
        type,
        amount: parseFloat(amount),
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-create a pending expense if requested (only for purchases)
    if (type === 'purchase' && createExpense) {
      try {
        // Look up "Raw Materials" category
        const { data: category } = await supabaseAdmin
          .from('expense_categories')
          .select('id')
          .ilike('name', 'raw materials')
          .single();

        // Look up "Counter" bank account
        const { data: account } = await supabaseAdmin
          .from('bank_accounts')
          .select('id')
          .ilike('name', 'counter')
          .single();

        // Look up vendor name
        const { data: vendor } = await supabaseAdmin
          .from('vendors')
          .select('name')
          .eq('id', vendor_id)
          .single();

        if (category && account) {
          const { data: expenseNumber } = await supabaseAdmin.rpc('generate_expense_number');

          const description = vendor
            ? `Purchase from ${vendor.name}${notes ? ': ' + notes : ''}`
            : `Vendor purchase${notes ? ': ' + notes : ''}`;

          const { data: expense, error: expenseError } = await supabaseAdmin
            .from('expenses')
            .insert({
              expense_number: expenseNumber,
              date,
              category_id: category.id,
              vendor_id,
              account_id: account.id,
              amount: parseFloat(amount),
              tax_amount: 0,
              total_amount: parseFloat(amount),
              description,
              payment_method: 'CREDIT',
              payment_status: 'PENDING',
              notes: notes || null,
              created_by: 'vendor-purchase'
            })
            .select('id')
            .single();

          if (!expenseError && expense) {
            // Link expense back to this vendor transaction
            await supabaseAdmin
              .from('vendor_transactions')
              .update({ expense_id: expense.id })
              .eq('id', data.id);

            return NextResponse.json({ ...data, expense_id: expense.id });
          }
        }
      } catch (expErr) {
        // Expense creation failed — transaction still saved, don't block
        console.error('Auto expense creation failed:', expErr);
      }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update vendor transaction
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, date, amount, notes } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { error: "transaction id is required" },
        { status: 400 }
      );
    }

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Fetch existing transaction to get linked expense_id
    const { data: existing } = await supabaseAdmin
      .from("vendor_transactions")
      .select('expense_id')
      .eq('id', id)
      .single();

    // Update transaction
    const { data, error } = await supabaseAdmin
      .from("vendor_transactions")
      .update({
        date,
        amount: parseFloat(amount),
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sync the linked expense if it exists
    if (existing?.expense_id) {
      await supabaseAdmin
        .from('expenses')
        .update({
          date,
          amount: parseFloat(amount),
          total_amount: parseFloat(amount),
          notes: notes || null
        })
        .eq('id', existing.expense_id);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete vendor transaction (hard delete)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "transaction id is required" },
        { status: 400 }
      );
    }

    // Fetch transaction to get linked expense_id before deleting
    const { data: existing } = await supabaseAdmin
      .from("vendor_transactions")
      .select('expense_id')
      .eq('id', id)
      .single();

    // Hard delete the transaction
    const { error } = await supabaseAdmin
      .from("vendor_transactions")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Delete the linked expense if it exists
    if (existing?.expense_id) {
      await supabaseAdmin
        .from('expenses')
        .delete()
        .eq('id', existing.expense_id);
    }

    return NextResponse.json({ message: "Transaction deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
