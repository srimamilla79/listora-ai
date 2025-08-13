// src/app/api/walmart/oauth/app-login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get('state')
    const walmartCallbackUri = searchParams.get('walmartCallbackUri')

    if (!state || !walmartCallbackUri) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Use your existing server-side client
    const supabase = await createServerSideClient()

    // Get the authenticated user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('❌ No authenticated user found, redirecting to login')
      // No authenticated user, redirect to login
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set(
        'redirect',
        `/api/walmart/oauth/app-login?state=${state}&walmartCallbackUri=${encodeURIComponent(walmartCallbackUri)}`
      )
      return NextResponse.redirect(loginUrl.toString())
    }

    console.log('✅ User authenticated:', user.id)

    // User is authenticated, update the state with user ID
    // Use service role client for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error: updateError } = await supabaseAdmin
      .from('oauth_states')
      .update({
        user_id: user.id,
        platform: 'walmart', // Ensure platform is set
      })
      .eq('state', state)

    if (updateError) {
      console.error('❌ Failed to update oauth state:', updateError)
    }

    // Now redirect to Walmart with all required parameters
    const clientId = process.env.WALMART_CLIENT_ID!
    const redirectUri = process.env.WALMART_REDIRECT_URI!
    const nonce = crypto.randomBytes(8).toString('hex')

    const walmartAuthUrl = new URL(walmartCallbackUri)
    walmartAuthUrl.searchParams.set('responseType', 'code')
    walmartAuthUrl.searchParams.set('clientId', clientId)
    walmartAuthUrl.searchParams.set('redirectUri', redirectUri)
    walmartAuthUrl.searchParams.set('clientType', 'seller')
    walmartAuthUrl.searchParams.set('nonce', nonce)
    walmartAuthUrl.searchParams.set('state', state)

    console.log(
      '🔐 User authenticated, redirecting to Walmart:',
      walmartAuthUrl.toString()
    )

    return NextResponse.redirect(walmartAuthUrl.toString())
  } catch (error) {
    console.error('❌ App login error:', error)

    const errorUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/generate?error=walmart_oauth_failed&message=${encodeURIComponent('Failed during app login')}`
    return NextResponse.redirect(errorUrl)
  }
}
