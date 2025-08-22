// app/api/walmart/oauth/callback/route.ts — updated with WM_PARTNER.ID, WM_MARKET, WM_SVC.VERSION
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function apiBase() {
  const env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
  return (
    process.env.WALMART_API_BASE_URL ||
    (env === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com')
  )
}

async function exchangeCodeForToken(code: string) {
  const clientIdToUse = (process.env.WALMART_CLIENT_ID || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const clientSecret = (process.env.WALMART_CLIENT_SECRET || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  const base64Auth = Buffer.from(
    `${clientIdToUse}:${clientSecret}`,
    'utf8'
  ).toString('base64')

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.WALMART_REDIRECT_URI!,
  })

  const r = await fetch(`${apiBase()}/v3/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${base64Auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      'WM_QOS.CORRELATION_ID': randomUUID(),
      'WM_SVC.NAME': 'Walmart Marketplace',
      'WM_PARTNER.ID': process.env.WALMART_PARTNER_ID || '10001127277',
      WM_MARKET: 'US',
      'WM_SVC.VERSION': '1.0.0',
    },
    body,
  })

  const text = await r.text()
  if (!r.ok) throw new Error(`Token exchange failed (${r.status}): ${text}`)
  return text ? JSON.parse(text) : {}
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') || ''
  const cookieState = req.cookies.get('wm_oauth_state')?.value || ''

  if (!code)
    return NextResponse.json(
      { ok: false, error: "Missing 'code' in callback" },
      { status: 400 }
    )
  if (cookieState && state && cookieState !== state) {
    return NextResponse.json(
      { ok: false, error: 'OAuth state mismatch' },
      { status: 400 }
    )
  }

  let userId = req.cookies.get('wm_oauth_user')?.value || ''
  if (!userId && state) {
    const adminLookup = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: row } = await adminLookup
      .from('oauth_states')
      .select('user_id')
      .eq('state', state)
      .maybeSingle()
    userId = row?.user_id || ''
  }
  if (!userId)
    return NextResponse.json(
      { ok: false, error: 'Unable to resolve user for Walmart OAuth' },
      { status: 400 }
    )

  try {
    const tokens = await exchangeCodeForToken(code)
    const accessToken = tokens.access_token as string | undefined
    const refreshToken = tokens.refresh_token as string | undefined
    const expiresIn = Number(tokens.expires_in || 1800)

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token response missing access_token or refresh_token',
          raw: tokens,
        },
        { status: 400 }
      )
    }

    const tokenExpiresAt = new Date(
      Date.now() + (expiresIn - 300) * 1000
    ).toISOString()
    const environment = (
      process.env.WALMART_ENVIRONMENT || 'production'
    ).toLowerCase()

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: existing } = await admin
      .from('walmart_connections')
      .select('id, seller_id, partner_id')
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
