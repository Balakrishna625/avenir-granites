import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// DELETE - Delete a group
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = supabaseAdmin
    const groupId = params.id

    // Delete the group (members will be deleted automatically via CASCADE)
    const { error } = await supabase
      .from('consignment_groups')
      .delete()
      .eq('id', groupId)

    if (error) {
      console.error('Error deleting group:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE group API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
