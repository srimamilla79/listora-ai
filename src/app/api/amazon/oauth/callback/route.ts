// =============================================================================
// FILE: src/app/api/amazon/oauth/callback/route.ts - FIXED VERSION
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  exchangeCodeForTokens,
  encryptToken,
  verifyOAuthState,
} from '@/lib/amazon-oauth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // FIXED: Amazon sends 'spapi_oauth_code' not 'code'
    const code =
      searchParams.get('spapi_oauth_code') || searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Also get the seller ID that Amazon provides
    const sellerId = searchParams.get('selling_partner_id')

    console.log('🔍 FULL CALLBACK DEBUG:', {
      fullUrl: request.url,
      code: code,
      state: state,
      error: error,
      sellerId: sellerId,
      allParams: Object.fromEntries(searchParams.entries()),
    })

    console.log('🔄 Amazon OAuth callback received:', {
      code: !!code,
      state: !!state,
      error,
    })
    // Handle OAuth errors
    if (error) {
      console.error('❌ Amazon OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=amazon_oauth_failed&details=${error}`
      )
    }

    if (!code || !state) {
      console.error('❌ Missing code or state parameters:', {
        code: !!code,
        state: !!state,
      })
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_callback`
      )
    }

    // Decode state to get user ID
    let userId: string
    try {
      const decoded = Buffer.from(state, 'base64').toString()
      userId = decoded.split(':')[0]
      console.log('👤 Decoded user ID:', userId)
    } catch (decodeError) {
      console.error('❌ Invalid state parameter:', decodeError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=invalid_state`
      )
    }

    // Verify state parameter
    if (!verifyOAuthState(state, userId)) {
      console.error('❌ State verification failed for user:', userId)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=state_verification_failed`
      )
    }

    // Exchange authorization code for tokens
    console.log('🔑 Exchanging code for tokens...')
    try {
      const tokenData = await exchangeCodeForTokens(code)
      console.log('✅ Token exchange successful')

      if (!tokenData.access_token || !tokenData.refresh_token) {
        throw new Error('Invalid token response from Amazon')
      }

      // Save tokens to database
      console.log('💾 Saving tokens to database...')

      // Create Supabase client with service role key
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      const expiresAt = new Date(
        Date.now() + (tokenData.expires_in || 3600) * 1000
      )

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
      const { data: existingConnection, error: selectError } = await supabase
        .from('amazon_connections')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (selectError && selectError.code !== 'PGRST116') {
        console.error('❌ Database select error:', selectError)
        throw new Error(`Database error: ${selectError.message}`)
      }

      if (existingConnection) {
        // Update existing connection
        console.log('🔄 Updating existing connection...')
        const { error: updateError } = await supabase
          .from('amazon_connections')
          .update(connectionData)
          .eq('user_id', userId)

        if (updateError) {
          console.error('❌ Database update error:', updateError)
          throw new Error(`Update failed: ${updateError.message}`)
        }
      } else {
        // Create new connection
        console.log('➕ Creating new connection...')
        const { error: insertError } = await supabase
          .from('amazon_connections')
          .insert([
            {
              ...connectionData,
              seller_id: `SELLER-${userId.substring(0, 8)}-${Date.now()}`, // Temporary seller ID
              marketplace_id: 'ATVPDKIKX0DER', // US marketplace
              connected_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            },
          ])

        if (insertError) {
          console.error('❌ Database insert error:', insertError)
          throw new Error(`Insert failed: ${insertError.message}`)
        }
      }

      console.log('✅ Amazon OAuth connection successful')

      // Redirect to dashboard with success message
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=amazon_connected`
      )
    } catch (tokenError: any) {
      console.error('❌ Token exchange error:', tokenError)
      throw new Error(
        `Token exchange failed: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`
      )
    }
  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?error=oauth_callback_failed&details=${encodeURIComponent(errorMessage)}`
    )
  }
}
