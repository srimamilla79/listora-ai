import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Update connection status
    const { error } = await supabase
      .from('meta_connections')
      .update({
        status: 'disconnected',
        facebook_page_access_token: null,
        instagram_account_id: null,
        facebook_page_id: null,
        facebook_catalog_id: null,
        commerce_enabled: false,
      })
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Disconnect error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Meta account' },
      { status: 500 }
    )
  }
}
