import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * IMPORTANT:
 * - WALMART_REDIRECT_URI must EXACTLY match the URI registered in Walmart Dev Portal for this environment.
 * - We expect `state` to carry at least { userId, environment }.
 *   Environment may be 'production' or 'sandbox'. If absent, we fall back to WALMART_ENVIRONMENT or 'production'.
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type StatePayload = {
  userId?: string
  environment?: 'production' | 'sandbox'
}

function parseState(rawState: string | null): StatePayload {
  if (!rawState) return {}
  try {
    // 1) direct JSON
    return JSON.parse(rawState)
  } catch {
    try {
      // 2) URL-decoded JSON
      const d = decodeURIComponent(rawState)
      try {
        return JSON.parse(d)
      } catch {}
      // 3) base64(JSON)
      const b = Buffer.from(d, 'base64').toString('utf8')
      return JSON.parse(b)
    } catch {
      return {}
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const code = sp.get('code')
    const stateObj = parseState(sp.get('state'))

    if (!code) {
      return NextResponse.json(
        { ok: false, error: 'Missing authorization code' },
        { status: 400 }
      )
    }

    // Identify user & environment
    const userId =
      stateObj.userId ||
      req.headers.get('x-user-id') || // fallback for manual testing
      ''

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Missing userId in state/header' },
        { status: 400 }
      )
    }

    const environment: 'production' | 'sandbox' =
      stateObj.environment ||
      (process.env.WALMART_ENVIRONMENT as
        | 'production'
        | 'sandbox'
        | undefined) ||
      'production'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const redirectUri = process.env.WALMART_REDIRECT_URI! // MUST match Walmart’s configured redirect
    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Missing WALMART_CLIENT_ID / WALMART_CLIENT_SECRET / WALMART_REDIRECT_URI envs',
        },
        { status: 500 }
      )
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

    const tokenUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token'
        : 'https://marketplace.walmartapis.com/v3/token'

    // Exchange authorization code for access + refresh tokens
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: 'no-store',
    })

    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Token exchange failed: ${tokenRes.status} - ${tokenText}`,
        },
        { status: 400 }
      )
    }

    const tokenJson: any = tokenText ? JSON.parse(tokenText) : {}
    const accessToken: string | undefined = tokenJson.access_token
    const refreshToken: string | undefined = tokenJson.refresh_token
    const expiresIn: number = Number(tokenJson.expires_in || 3600)

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Token exchange did not return access_token and refresh_token',
          raw: tokenJson,
        },
        { status: 400 }
      )
    }

    // Compute expiry (5 min early refresh buffer)
    const tokenExpiresAt = new Date(
      Date.now() + (expiresIn - 300) * 1000
    ).toISOString()

    // Upsert walmart_connections
    const { data: existing, error: selErr } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('environment', environment)
      .maybeSingle()

    if (selErr) {
      return NextResponse.json(
        { ok: false, error: `DB select error: ${selErr.message}` },
        { status: 500 }
      )
    }

    const defaultPartner = process.env.WALMART_PARTNER_ID || null
    const sellerId = existing?.seller_id ?? defaultPartner
    const partnerId = existing?.partner_id ?? defaultPartner

    if (existing) {
      const { error: updErr } = await supabase
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

      if (updErr) {
        return NextResponse.json(
          { ok: false, error: `DB update error: ${updErr.message}` },
          { status: 500 }
        )
      }
    } else {
      const { error: insErr } = await supabase
        .from('walmart_connections')
        .insert({
          user_id: userId,
          environment,
          status: 'active',
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: tokenExpiresAt,
          seller_id: sellerId,
          partner_id: partnerId,
          seller_info: null,
        })
      if (insErr) {
        return NextResponse.json(
          { ok: false, error: `DB insert error: ${insErr.message}` },
          { status: 500 }
        )
      }
    }

    // Minimal success page (so the user doesn't land on a blank screen)
    return new NextResponse(
      `
      <!doctype html>
      <html><head><meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Walmart Connected</title>
        <style>
          body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding: 32px; }
          .box { max-width: 560px; margin: 40px auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
          h2 { margin: 0 0 8px; }
          p { margin: 8px 0; color: #374151; }
          .small { color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="box">
          <h2>Walmart connected ✅</h2>
          <p>You can close this window and return to Listora.</p>
          <p class="small">Environment: ${environment}</p>
        </div>
      </body></html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
