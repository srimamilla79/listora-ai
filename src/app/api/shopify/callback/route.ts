// src/app/api/shopify/callback/route.ts
// One file that handles BOTH:
//  - Initiate OAuth (when ?code is NOT present) -> 302 to Shopify authorize
//  - OAuth Callback (when ?code IS present)     -> HMAC+state verify, exchange token, save connection
//
// Set your App URL in the Partner Dashboard to this route:
//   https://YOUR_DOMAIN/api/shopify/callback
//
// Env needed:
//   SHOPIFY_API_KEY, SHOPIFY_API_SECRET
//   SHOPIFY_API_VERSION (optional, default 2025-07)
//   SHOPIFY_SCOPES (optional fallback added below)
//   SHOPIFY_PER_USER=0/1 (optional)

import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ---- Config (inline to avoid extra files)
const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2025-07'
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY ?? ''
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET ?? ''
const DEFAULT_SCOPES = [
  'read_products',
  'write_products',
  'read_inventory',
  'write_inventory',
  'read_locations',
  'read_files',
  'write_files',
].join(',')
const SHOPIFY_SCOPES =
  (process.env.SHOPIFY_SCOPES && process.env.SHOPIFY_SCOPES.trim()) ||
  DEFAULT_SCOPES
const PER_USER = process.env.SHOPIFY_PER_USER === '1'

// ---- Helpers
function validateShopParam(shop: string | null) {
  return !!shop && /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)
}

function randomState() {
  const buf = new Uint8Array(32)
  crypto.webcrypto.getRandomValues(buf)
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// HMAC for OAuth (hex digest, query-string sorted, exclude hmac/signature)
function buildOAuthMessage(url: URL) {
  const qp = new URLSearchParams(url.search)
  qp.delete('hmac')
  qp.delete('signature')
  const sorted = [...qp.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${decodeURIComponent(v)}`)
    .join('&')
  return sorted
}
function verifyOAuthHmac(url: URL, secret: string, provided: string | null) {
  if (!provided) return false
  const msg = buildOAuthMessage(url)
  const calc = crypto.createHmac('sha256', secret).update(msg).digest('hex')
  // constant-time-like compare
  const a = Buffer.from(calc, 'utf8')
  const b = Buffer.from(provided, 'utf8')
  if (a.length !== b.length) return false
  let out = 0
  for (let i = 0; i < a.length; i++) out |= a[i] ^ b[i]
  return out === 0
}

async function fetchShopBasics(shop: string, accessToken: string) {
  const res = await fetch(
    `https://${shop}/admin/api/${API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `query { shop { name primaryDomain { url } } }`,
      }),
    }
  )
  const json = await res.json()
  return {
    name: json?.data?.shop?.name || null,
    primaryUrl: json?.data?.shop?.primaryDomain?.url || null,
  }
}

function buildRedirectUri(req: NextRequest) {
  const origin = req.headers.get('origin') || req.nextUrl.origin
  return `${origin}/api/shopify/callback`
}

// ---- Main
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const shop = searchParams.get('shop')
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const hmac = searchParams.get('hmac')
    const userIdParam = searchParams.get('user_id') || '' // optional

    if (!validateShopParam(shop)) {
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      )
    }
    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return NextResponse.json(
        { error: 'Missing Shopify app credentials' },
        { status: 500 }
      )
    }

    // ---- Initiate OAuth (first hit from App Store) → redirect to authorize
    if (!code) {
      const stateVal = randomState()
      const authorizeUrl = new URL(`https://${shop}/admin/oauth/authorize`)
      authorizeUrl.searchParams.set('client_id', SHOPIFY_API_KEY)
      authorizeUrl.searchParams.set('scope', SHOPIFY_SCOPES)
      authorizeUrl.searchParams.set('redirect_uri', buildRedirectUri(req))
      authorizeUrl.searchParams.set('state', stateVal)
      if (PER_USER)
        authorizeUrl.searchParams.append('grant_options[]', 'per-user')

      const res = NextResponse.redirect(authorizeUrl.toString(), {
        status: 302,
      })
      res.cookies.set('shopify_oauth_state', stateVal, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      })
      if (userIdParam) {
        res.cookies.set('shopify_oauth_user', userIdParam, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          path: '/',
          maxAge: 600,
        })
      }
      res.cookies.set('shopify_oauth_shop', shop!, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      })
      return res
    }

    // ---- OAuth Callback (after consent)
    if (!state || !hmac) {
      return NextResponse.json(
        { error: 'Missing OAuth params' },
        { status: 400 }
      )
    }
    // State cookie
    const cookieState = req.cookies.get('shopify_oauth_state')?.value
    if (!cookieState || cookieState !== state) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }
    // HMAC check
    if (!verifyOAuthHmac(req.nextUrl, SHOPIFY_API_SECRET, hmac)) {
      return NextResponse.json({ error: 'Invalid HMAC' }, { status: 400 })
    }

    // Exchange code
    const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code,
      }),
    })
    const tokenJson = await tokenRes.json()
    if (!tokenRes.ok || !tokenJson?.access_token) {
      return NextResponse.json(
        { error: 'Token exchange failed', details: tokenJson },
        { status: 400 }
      )
    }
    const access_token: string = tokenJson.access_token
    const scopesGranted: string = tokenJson.scope ?? ''

    // Shop metadata
    const basics = await fetchShopBasics(shop!, access_token)

    // Save/Upsert connection
    const supabase = await createServerSideClient()
    const userId = req.cookies.get('shopify_oauth_user')?.value || null

    const platform_store_info = {
      shop_domain: shop,
      shop_name: basics.name || shop,
      primary_url: basics.primaryUrl || null,
      api_version: API_VERSION,
    }

    const { error: upsertErr } = await supabase
      .from('platform_connections')
      .upsert(
        {
          user_id: userId,
          platform: 'shopify',
          status: 'connected',
          access_token,
          platform_store_info,
          platform_data: {
            scopes: scopesGranted,
            preferred_location_id: null,
          },
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,platform' }
      )

    if (upsertErr) {
      console.error('Supabase upsert error:', upsertErr)
      return NextResponse.json(
        { error: 'Failed to save connection' },
        { status: 500 }
      )
    }

    // Redirect into your UI after auth (Shopify check: "redirects to app UI")
    const res = NextResponse.redirect(
      `${req.headers.get('origin') || req.nextUrl.origin}/integrations?shopify=connected`,
      { status: 302 }
    )
    // clear cookies
    res.cookies.delete('shopify_oauth_state')
    res.cookies.delete('shopify_oauth_user')
    res.cookies.delete('shopify_oauth_shop')
    return res
  } catch (e) {
    console.error('Shopify unified OAuth error:', e)
    return NextResponse.json({ error: 'OAuth flow failed' }, { status: 500 })
  }
}
