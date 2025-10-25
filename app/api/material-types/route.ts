import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Get material types
export async function GET() {
  try {
    const supabase = supabaseAdmin;
    
    // Define the exact order
    const materialOrder = [
      'S/G Polish Black line',
      'S/G Polish White line',
      'S/G Laputra',
      'S/G Polish Fresh',
      'B/P Polish',
      'B/P Laputra',
      'B/P Fresh',
      'Burgandy'
    ];
    
    const { data, error } = await supabase
      .from('material_types')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching material types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort by the defined order
    const sortedData = (data || []).sort((a, b) => {
      const indexA = materialOrder.indexOf(a.name);
      const indexB = materialOrder.indexOf(b.name);
      
      // If both are in the order list, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      // If only A is in the list, it comes first
      if (indexA !== -1) return -1;
      // If only B is in the list, it comes first
      if (indexB !== -1) return 1;
      // If neither is in the list, maintain original order
      return 0;
    });

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error('Unexpected error in GET /api/material-types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material types' },
      { status: 500 }
    );
  }
}

// POST - Create new material type
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin;
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Material type name is required' },
        { status: 400 }
      );
    }

    // Check if material type already exists
    const { data: existing } = await supabase
      .from('material_types')
      .select('id')
      .eq('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Material type already exists' },
        { status: 400 }
      );
    }

    // Insert new material type
    const { data, error } = await supabase
      .from('material_types')
      .insert([{
        name: name.trim(),
        is_active: true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating material type:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/material-types:', error);
    return NextResponse.json(
      { error: 'Failed to create material type' },
      { status: 500 }
    );
  }
}
