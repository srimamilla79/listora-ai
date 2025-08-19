// app/api/walmart/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSideClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') || ''
    const sellerId = url.searchParams.get('sellerId')
    const type = url.searchParams.get('type')
    const clientId = url.searchParams.get('clientId')
    // Note: partnerType is NOT expected according to Walmart

    console.log('Walmart OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state,
      sellerId,
      type,
      clientId,
    })

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Missing 'code' in callback" },
        { status: 400 }
      )
    }

    // Check if user is logged in
    const supabase = await createServerSideClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login preserving all callback params
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set('walmart_oauth', state)
      loginUrl.searchParams.set('redirect', req.url)

      return NextResponse.redirect(loginUrl.toString())
    }

    // Token exchange with Walmart
    const tokenUrl = 'https://marketplace.walmartapis.com/v3/token'

    const authHeader = `Basic ${Buffer.from(
      `${process.env.WALMART_CLIENT_ID!}:${process.env.WALMART_CLIENT_SECRET!}`
    ).toString('base64')}`

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.WALMART_REDIRECT_URI!,
    })

    console.log('Exchanging token at:', tokenUrl)

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_SVC.NAME': 'Listora',
        'WM_QOS.CORRELATION_ID': state, // Use state as correlation ID
        'WM_SVC.VERSION': '1.0.0',
      },
      body,
    })

    const responseText = await tokenResponse.text()
    console.log('Token response:', tokenResponse.status, responseText)

    if (!tokenResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Token exchange failed (${tokenResponse.status})`,
          details: responseText,
        },
        { status: 400 }
      )
    }

    const tokenData = JSON.parse(responseText)
    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = Number(tokenData.expires_in || 3600)

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No access token in response',
          data: tokenData,
        },
        { status: 400 }
      )
    }

    // Store the connection
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const connectionData = {
      user_id: user.id,
      environment: 'production',
      access_token: accessToken,
      refresh_token: refreshToken || null,
      token_expires_at: new Date(
        Date.now() + (expiresIn - 300) * 1000
      ).toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
      seller_id: sellerId || process.env.WALMART_PARTNER_ID || null,
      partner_id: process.env.WALMART_PARTNER_ID || null,
      seller_info: {
        sellerId,
        type,
        clientId,
      },
    }

    const { data: existing } = await admin
      .from('walmart_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', 'production')
      .maybeSingle()

    if (existing) {
      await admin
        .from('walmart_connections')
        .update(connectionData)
        .eq('id', existing.id)
    } else {
      await admin.from('walmart_connections').insert({
        ...connectionData,
        created_at: new Date().toISOString(),
      })
    }

    // Success redirect
    const res = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/integrations?connected=walmart&sellerId=${sellerId || ''}`
    )

    // Clear cookies
    res.cookies.set('wm_oauth_state', '', { maxAge: 0, path: '/' })
    res.cookies.set('wm_oauth_user', '', { maxAge: 0, path: '/' })
    res.cookies.set('wm_oauth_nonce', '', { maxAge: 0, path: '/' })

    return res
  } catch (e: any) {
    console.error('Walmart OAuth error:', e)
    return NextResponse.json(
      { ok: false, error: e.message || 'Internal error' },
      { status: 500 }
    )
  }
}
