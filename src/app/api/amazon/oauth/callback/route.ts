// =============================================================================
// FILE 3: src/app/api/amazon/oauth/callback/route.ts - OAuth Callback Handler
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import {
  exchangeCodeForTokens,
  encryptToken,
  verifyOAuthState,
} from '@/lib/amazon-oauth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    console.log('🔄 Amazon OAuth callback received')

    // Handle OAuth errors
    if (error) {
      console.error('❌ Amazon OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=amazon_oauth_failed&details=${error}`
      )
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameters')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_callback`
      )
    }

    // Decode state to get user ID
    let userId: string
    try {
      const decoded = Buffer.from(state, 'base64').toString()
      userId = decoded.split(':')[0]
    } catch {
      console.error('❌ Invalid state parameter')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_state`
      )
    }

    // Verify state parameter
    if (!verifyOAuthState(state, userId)) {
      console.error('❌ State verification failed')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=state_verification_failed`
      )
    }

    // Exchange authorization code for tokens
    console.log('🔑 Exchanging code for tokens...')
    const tokenData = await exchangeCodeForTokens(code)

    if (!tokenData.access_token || !tokenData.refresh_token) {
      throw new Error('Invalid token response from Amazon')
    }

    // Save tokens to database
    console.log('💾 Saving tokens to database...')
    const supabase = createClient()

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    // Encrypt tokens before storing
    const encryptedAccessToken = encryptToken(tokenData.access_token)
    const encryptedRefreshToken = encryptToken(tokenData.refresh_token)

    const connectionData = {
      user_id: userId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: expiresAt.toISOString(),
      status: 'active',
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Check if connection already exists
    const { data: existingConnection } = await supabase
      .from('amazon_connections')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await supabase
        .from('amazon_connections')
        .update(connectionData)
        .eq('user_id', userId)
    } else {
      // Create new connection
      const { error: insertError } = await supabase
        .from('amazon_connections')
        .insert([
          {
            ...connectionData,
            seller_id: `${userId.substring(0, 8)}-${Date.now()}`, // Temporary seller ID
            marketplace_id: 'ATVPDKIKX0DER', // US marketplace
            connected_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ])
    }

    console.log('✅ Amazon OAuth connection successful')

    // Redirect to dashboard with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=amazon_connected`
    )
  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_callback_failed&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    )
  }
}
