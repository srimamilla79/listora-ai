import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const supabase = await createServerSideClient()

    // Get current connection
    const { data: connection, error } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !connection) {
      return NextResponse.json(
        { error: 'No connection found' },
        { status: 404 }
      )
    }

    // Exchange for long-lived token
    const response = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${process.env.FACEBOOK_APP_ID}&` +
        `client_secret=${process.env.FACEBOOK_APP_SECRET}&` +
        `fb_exchange_token=${connection.facebook_page_access_token}`
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Token refresh failed')
    }

    // Update token
    await supabase
      .from('meta_connections')
      .update({
        facebook_page_access_token: data.access_token,
        expires_at: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
