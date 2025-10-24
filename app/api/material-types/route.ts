import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Get material types
export async function GET() {
  try {
    const supabase = supabaseAdmin;
    
    const { data, error } = await supabase
      .from('material_types')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching material types:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error in GET /api/material-types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch material types' },
      { status: 500 }
    );
  }
}
