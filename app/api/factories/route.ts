import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - List all factories
export async function GET() {
  try {
    const supabase = supabaseAdmin;
    
    const { data, error } = await supabase
      .from('factories')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching factories:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/factories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch factories' },
      { status: 500 }
    );
  }
}

// POST - Create new factory
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    
    const { name, contact_person, phone, address } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Factory name is required' },
        { status: 400 }
      );
    }

    const { data: factory, error } = await supabase
      .from('factories')
      .insert({
        name: name.trim(),
        contact_person,
        phone,
        address,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating factory:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(factory, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/factories:', error);
    return NextResponse.json(
      { error: 'Failed to create factory' },
      { status: 500 }
    );
  }
}
