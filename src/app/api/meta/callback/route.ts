import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!

export async function GET(request: NextRequest) {
  // Dynamic redirect URI based on the actual host
  const host = request.headers.get('host') || 'listora.ai'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const REDIRECT_URI = `${protocol}://${host}/api/meta/callback`

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/generate?error=meta_auth_failed`
    )
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state' },
      { status: 400 }
    )
  }

  const cookieStore = cookies()
  const supabase = createClient()

  // Verify state
  const { data: stateData } = await supabase
    .from('oauth_states')
    .select('user_id')
    .eq('state', state)
    .eq('platform', 'meta')
    .single()

  if (!stateData) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
  }

  const userId = stateData.user_id

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${FACEBOOK_APP_ID}` +
        `&client_secret=${FACEBOOK_APP_SECRET}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&code=${code}`
    )

    const tokenData = await tokenResponse.json()

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token')
    }

    // Get user's Facebook pages
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${tokenData.access_token}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook pages found')
    }

    // Get the first page (you might want to let user select)
    const page = pagesData.data[0]

    // Get Instagram Business Account connected to the page
    const igResponse = await fetch(
      `https://graph.facebook.com/v18.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
    )
    const igData = await igResponse.json()

    let instagramAccountId = null
    let instagramUsername = null

    if (igData.instagram_business_account) {
      const igAccountResponse = await fetch(
        `https://graph.facebook.com/v18.0/${igData.instagram_business_account.id}?fields=username&access_token=${page.access_token}`
      )
      const igAccountData = await igAccountResponse.json()
      instagramAccountId = igData.instagram_business_account.id
      instagramUsername = igAccountData.username
    }

    // Save connection to database
    await supabase.from('meta_connections').upsert({
      user_id: userId,
      facebook_page_id: page.id,
      facebook_page_name: page.name,
      facebook_page_access_token: page.access_token,
      instagram_account_id: instagramAccountId,
      instagram_username: instagramUsername,
      status: 'connected',
      connected_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
    })

    // Clean up state
    await supabase.from('oauth_states').delete().eq('state', state)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/generate?meta=connected`
    )
  } catch (error) {
    console.error('Meta OAuth error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/generate?error=meta_connection_failed`
    )
  }
}
