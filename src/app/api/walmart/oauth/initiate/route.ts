// app/api/walmart/oauth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId, state: existingState } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🚀 Walmart OAuth initiate for user:', userId)

    // Generate or use existing state
    const state = existingState || crypto.randomBytes(16).toString('hex')
    const nonce = crypto.randomBytes(8).toString('hex')

    // Save state for validation
    await supabase.from('walmart_oauth_states').insert({
      state,
      user_id: userId,
      client_type: 'seller',
      metadata: { nonce },
      created_at: new Date().toISOString(),
    })

    // Build Walmart authorization URL
    const clientId = process.env.WALMART_CLIENT_ID!
    const redirectUri = process.env.WALMART_REDIRECT_URI!

    const authUrl = new URL('https://login.account.wal-mart.com/authorize')
    authUrl.searchParams.set('responseType', 'code')
    authUrl.searchParams.set('clientId', clientId)
    authUrl.searchParams.set('redirectUri', redirectUri)
    authUrl.searchParams.set('clientType', 'seller')
    authUrl.searchParams.set('nonce', nonce)
    authUrl.searchParams.set('state', state)

    console.log('🔗 Walmart auth URL generated')

    return NextResponse.json({
      authUrl: authUrl.toString(),
      state,
    })
  } catch (error) {
    console.error('❌ OAuth initiation error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate OAuth' },
      { status: 500 }
    )
  }
}
