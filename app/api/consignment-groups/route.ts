import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// GET - List all groups with their consignments
export async function GET() {
  try {
    const supabase = supabaseAdmin

    const { data, error } = await supabase
      .from('consignment_groups_summary')
      .select('*')
      .order('group_name')

    if (error) {
      console.error('Error fetching groups:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error in groups API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new group
export async function POST(request: Request) {
  try {
    const supabase = supabaseAdmin
    const body = await request.json()
    const { group_name, description, consignment_ids } = body

    if (!group_name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      )
    }

    if (!consignment_ids || consignment_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one consignment is required' },
        { status: 400 }
      )
    }

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from('consignment_groups')
      .insert({
        group_name,
        description: description || null
      })
      .select()
      .single()

    if (groupError) {
      console.error('Error creating group:', groupError)
      return NextResponse.json({ error: groupError.message }, { status: 500 })
    }

    // Add consignments to the group
    const members = consignment_ids.map((consignment_id: string) => ({
      group_id: group.id,
      consignment_id
    }))

    const { error: membersError } = await supabase
      .from('consignment_group_members')
      .insert(members)

    if (membersError) {
      // Rollback: delete the group if adding members fails
      await supabase.from('consignment_groups').delete().eq('id', group.id)
      console.error('Error adding members:', membersError)
      return NextResponse.json({ error: membersError.message }, { status: 500 })
    }

    return NextResponse.json(group, { status: 201 })
  } catch (error) {
    console.error('Error in POST groups API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
