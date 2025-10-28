import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// POST - Add consignments to a group
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin
    const groupId = params.id
    const body = await request.json()
    const { consignment_ids } = body

    if (!consignment_ids || consignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one consignment is required' },
        { status: 400 }
      )
    }

    const members = consignment_ids.map((consignment_id: string) => ({
      group_id: groupId,
      consignment_id
    }))

    const { error } = await supabase
      .from('consignment_group_members')
      .insert(members)

    if (error) {
      console.error('Error adding members:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in POST members API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
