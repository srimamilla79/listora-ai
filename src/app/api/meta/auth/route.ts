import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const userId = searchParams.get('user_id')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  // Generate state for CSRF protection
  const state = Math.random().toString(36).substring(7)

  // Store state in oauth_states table
  const cookieStore = cookies()
  const supabase = createClient()

  await supabase.from('oauth_states').insert({
    state,
    user_id: userId,
    platform: 'meta',
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  })

  // Updated scopes - add commerce permissions
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
    'ads_management',
  ].join(',')

  const authUrl =
    `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&state=${state}` +
    `&scope=${scopes}` +
    `&response_type=code`

  return NextResponse.redirect(authUrl)
}
