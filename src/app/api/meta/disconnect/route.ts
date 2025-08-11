import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createClient()

    // Update connection status
    await supabase
      .from('meta_connections')
      .update({ status: 'disconnected' })
      .eq('user_id', userId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Meta disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Meta' },
      { status: 500 }
    )
  }
}
