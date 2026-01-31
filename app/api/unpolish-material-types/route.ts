import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - List all unpolish material types
export async function GET() {
  try {
    const supabase = supabaseAdmin;
    
    const { data, error } = await supabase
      .from('unpolish_material_types')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching unpolish material types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/unpolish-material-types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unpolish material types' },
      { status: 500 }
    );
  }
}

// POST - Create new unpolish material type
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const body = await request.json();
    
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Material type name is required' },
        { status: 400 }
      );
    }

    const { data: materialType, error } = await supabase
      .from('unpolish_material_types')
      .insert({
        name: name.trim(),
        description,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating material type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(materialType, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/unpolish-material-types:', error);
    return NextResponse.json(
      { error: 'Failed to create material type' },
      { status: 500 }
    );
  }
}
