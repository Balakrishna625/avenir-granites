import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// DELETE - Remove a consignment from a group
export async function DELETE(
  request: Request,
  { params }: { params: { id: string; consignmentId: string } }
) {
  try {
    const supabase = supabaseAdmin
    const { id: groupId, consignmentId } = params

    const { error } = await supabase
      .from('consignment_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('consignment_id', consignmentId)

    if (error) {
      console.error('Error removing member:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE member API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
