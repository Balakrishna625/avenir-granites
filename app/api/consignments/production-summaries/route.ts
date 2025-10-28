import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = supabaseAdmin

    const { data, error } = await supabase
      .from('consignment_production_summary')
      .select('*')
      .order('arrival_date', { ascending: false })

    if (error) {
      console.error('Error fetching production summaries:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in production summaries API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
