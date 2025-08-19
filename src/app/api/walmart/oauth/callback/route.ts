// app/api/walmart/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function envName() {
  return (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
}
function tokenEndpoint() {
  return envName() === 'sandbox'
    ? 'https://sandbox.walmartapis.com/v3/token'
    : 'https://marketplace.walmartapis.com/v3/token'
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const returnedState = url.searchParams.get('state') || ''
    if (!code)
      return NextResponse.json(
        { ok: false, error: "Missing 'code' in callback" },
        { status: 400 }
      )

    // Resolve user: cookie -> oauth_states lookup
    let userId = req.cookies.get('wm_oauth_user')?.value || ''
    const stateCookie = req.cookies.get('wm_oauth_state')?.value || ''

    if (!userId && returnedState) {
      const adminLookup = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      const { data: row } = await adminLookup
        .from('oauth_states')
        .select('user_id')
        .eq('state', returnedState)
        .maybeSingle()
      userId = row?.user_id || ''
    }
    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'Unable to resolve user for Walmart OAuth' },
        { status: 400 }
      )
    if (stateCookie && returnedState && stateCookie !== returnedState) {
      return NextResponse.json(
        { ok: false, error: 'OAuth state mismatch' },
        { status: 400 }
      )
    }

    // Exchange code for tokens
    const basic = Buffer.from(
      `${process.env.WALMART_CLIENT_ID!}:${process.env.WALMART_CLIENT_SECRET!}`
    ).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.WALMART_REDIRECT_URI!,
    })

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
    if (!r.ok)
      return NextResponse.json(
        { ok: false, error: `Token exchange failed (${r.status}): ${text}` },
        { status: 400 }
      )

    const json = text ? JSON.parse(text) : {}
    const accessToken = json.access_token as string | undefined
    const refreshToken = json.refresh_token as string | undefined
    const expiresIn = Number(json.expires_in || 3600)
    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token response missing access_token or refresh_token',
          raw: json,
        },
        { status: 400 }
      )
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const tokenExpiresAt = new Date(
      Date.now() + (expiresIn - 300) * 1000
    ).toISOString()
    const environment = envName()

    const { data: existing } = await admin
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('environment', environment)
      .maybeSingle()

    const defaults = process.env.WALMART_PARTNER_ID || null
    const sellerId = existing?.seller_id ?? defaults
    const partnerId = existing?.partner_id ?? defaults

    if (existing) {
      const { error } = await admin
        .from('walmart_connections')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          status: 'active',
          updated_at: new Date().toISOString(),
          seller_id: sellerId,
          partner_id: partnerId,
        })
        .eq('id', existing.id)
      if (error)
        return NextResponse.json(
          { ok: false, error: `DB update error: ${error.message}` },
          { status: 500 }
        )
    } else {
      const { error } = await admin.from('walmart_connections').insert({
        user_id: userId,
        environment,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        seller_id: sellerId,
        partner_id: partnerId,
        seller_info: null,
      })
      if (error)
        return NextResponse.json(
          { ok: false, error: `DB insert error: ${error.message}` },
          { status: 500 }
        )
    }

    const res = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/integrations?connected=walmart`
    )
    res.cookies.set('wm_oauth_state', '', { maxAge: 0, path: '/' })
    return res
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
