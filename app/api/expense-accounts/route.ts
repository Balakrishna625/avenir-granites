import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const { data: accounts, error } = await supabaseAdmin
      .from("expense_accounts")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error fetching expense accounts:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error("Error in expense accounts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, account_type, description, current_balance = 0 } = body;

    if (!name || !account_type) {
      return NextResponse.json(
        { error: "Name and account type are required" },
        { status: 400 }
      );
    }

    const { data: account, error } = await supabaseAdmin
      .from("expense_accounts")
      .insert([
        {
          name,
          account_type,
          description,
          current_balance,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating expense account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error("Error in expense accounts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, account_type, description, current_balance } = body;

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (account_type) updateData.account_type = account_type;
    if (description !== undefined) updateData.description = description;
    if (current_balance !== undefined) updateData.current_balance = current_balance;

    const { data: account, error } = await supabaseAdmin
      .from("expense_accounts")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating expense account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(account);
  } catch (error) {
    console.error("Error in expense accounts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Account ID is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("expense_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting expense account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in expense accounts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}