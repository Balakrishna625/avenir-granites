import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin.from("bank_accounts").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
    
    const { data, error } = await supabaseAdmin.from("bank_accounts").insert({ name }).select().single();
    if (error) {
      console.error("Database error creating bank account:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error in bank accounts API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: "Bank account ID is required" }, { status: 400 });
    }

    // Check if bank account is being used in transactions
    const { data: transactionCount, error: countError } = await supabaseAdmin
      .from("transactions")
      .select("id", { count: 'exact' })
      .eq("account_id", id);

    if (countError) {
      console.error("Error checking bank account usage:", countError);
      return NextResponse.json({ error: "Failed to check account usage" }, { status: 500 });
    }

    if (transactionCount && transactionCount.length > 0) {
      return NextResponse.json({ 
        error: "Cannot delete bank account. It is being used in transactions.",
        inUse: true,
        usageCount: transactionCount.length
      }, { status: 400 });
    }

    // Delete the bank account
    const { error: deleteError } = await supabaseAdmin
      .from("bank_accounts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting bank account:", deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Bank account deleted successfully" });
  } catch (error) {
    console.error("Error in bank accounts DELETE API:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
