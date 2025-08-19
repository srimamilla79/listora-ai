// app/api/walmart/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSideClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function envName() {
  return (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
}

function tokenEndpoint() {
  // Check if we're using Walmart SSO or Marketplace API
  const isSSO = process.env.WALMART_USE_SSO === 'true'

  if (isSSO) {
    return 'https://login.account.wal-mart.com/token'
  }

  return envName() === 'sandbox'
    ? 'https://sandbox.walmartapis.com/v3/token'
    : 'https://marketplace.walmartapis.com/v3/token'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const returnedState = url.searchParams.get('state') || ''
    const sellerId = url.searchParams.get('sellerId')
    const type = url.searchParams.get('type')
    const partnerType = url.searchParams.get('partnerType')
    const clientId = url.searchParams.get('clientId')
    const nonce = url.searchParams.get('nonce') || ''

    console.log('Walmart OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state: returnedState,
      sellerId,
      type,
      partnerType,
      clientId,
      nonce: nonce ? 'present' : 'missing',
    })

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Missing 'code' in callback" },
        { status: 400 }
      )
    }

    // First check if user is logged in using server-side client
    const supabase = await createServerSideClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // User not logged in - redirect to login with OAuth data preserved
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set('walmart_oauth', returnedState)
      loginUrl.searchParams.set('redirect', req.url) // Pass the full callback URL with all params

      return NextResponse.redirect(loginUrl.toString())
    }

    // User is logged in, proceed with token exchange
    const basic = Buffer.from(
      `${process.env.WALMART_CLIENT_ID!}:${process.env.WALMART_CLIENT_SECRET!}`
    ).toString('base64')

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.WALMART_REDIRECT_URI!,
    })

    // Add nonce if present (for SSO flow)
    if (nonce) {
      body.append('nonce', nonce)
    }

    // Add client_id for SSO flow
    if (process.env.WALMART_USE_SSO === 'true') {
      body.append('client_id', process.env.WALMART_CLIENT_ID!)
    }

    console.log('Token exchange request to:', tokenEndpoint())

    const r = await fetch(tokenEndpoint(), {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body,
    })

    const text = await r.text()
    console.log('Token exchange response status:', r.status)

    if (!r.ok) {
      console.error('Token exchange failed:', text)
      return NextResponse.json(
        { ok: false, error: `Token exchange failed (${r.status}): ${text}` },
        { status: 400 }
      )
    }

    const json = text ? JSON.parse(text) : {}
    const accessToken = json.access_token as string | undefined
    const refreshToken = json.refresh_token as string | undefined
    const expiresIn = Number(json.expires_in || 3600)

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token response missing access_token',
          raw: json,
        },
        { status: 400 }
      )
    }

    // Store the connection
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const tokenExpiresAt = new Date(
      Date.now() + (expiresIn - 300) * 1000
    ).toISOString()
    const environment = envName()

    // Check for existing connection
    const { data: existing } = await admin
      .from('walmart_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', environment)
      .maybeSingle()

    const connectionData = {
      user_id: user.id,
      environment,
      access_token: accessToken,
      refresh_token: refreshToken || existing?.refresh_token || null,
      token_expires_at: tokenExpiresAt,
      status: 'active',
      updated_at: new Date().toISOString(),
      // Use sellerId from callback params if provided, otherwise use existing or env default
      seller_id:
        sellerId ||
        json.seller_id ||
        existing?.seller_id ||
        process.env.WALMART_PARTNER_ID ||
        null,
      partner_id:
        json.partner_id ||
        existing?.partner_id ||
        process.env.WALMART_PARTNER_ID ||
        null,
      // Store additional metadata from callback
      seller_info: {
        sellerId: sellerId || null,
        partnerType: partnerType || null,
        type: type || null,
        clientId: clientId || null,
      },
    }

    if (existing) {
      const { error } = await admin
        .from('walmart_connections')
        .update(connectionData)
        .eq('id', existing.id)

      if (error) {
        return NextResponse.json(
          { ok: false, error: `DB update error: ${error.message}` },
          { status: 500 }
        )
      }
    } else {
      const { error } = await admin.from('walmart_connections').insert({
        ...connectionData,
        created_at: new Date().toISOString(),
      })

      if (error) {
        return NextResponse.json(
          { ok: false, error: `DB insert error: ${error.message}` },
          { status: 500 }
        )
      }
    }

    // Clear any OAuth cookies
    const res = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/integrations?connected=walmart&sellerId=${sellerId || ''}`
    )
    res.cookies.set('wm_oauth_state', '', { maxAge: 0, path: '/' })
    res.cookies.set('wm_oauth_user', '', { maxAge: 0, path: '/' })

    return res
  } catch (e: any) {
    console.error('Walmart OAuth callback error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
