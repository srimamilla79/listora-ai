// src/app/api/shopify/oauth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Shopify OAuth parameters
    const shopifyApiKey = process.env.SHOPIFY_API_KEY
    const scopes = process.env.SHOPIFY_SCOPES || 'write_products,read_products'
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/shopify/callback`

    if (!shopifyApiKey) {
      return NextResponse.json(
        { error: 'Shopify API key not configured' },
        { status: 500 }
      )
    }

    // Generate state parameter for security
    const state = `${userId}-${Date.now()}-${Math.random().toString(36).substring(7)}`

    // Store state in database for verification
    const supabase = createClient()
    await supabase.from('oauth_states').insert({
      state,
      user_id: userId,
      platform: 'shopify',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })

    // For development, we'll redirect to a page where user enters shop domain
    const authUrl = `/shopify/connect?state=${state}&user_id=${userId}`

    return NextResponse.redirect(new URL(authUrl, request.url))
  } catch (error) {
    console.error('Shopify OAuth error:', error)
    return NextResponse.json(
      { error: 'Failed to initiate Shopify connection' },
      { status: 500 }
    )
  }
}
