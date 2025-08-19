// File: src/app/api/walmart/debug/force-refresh/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSideClient } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1) Who is the user?
    const supabaseSSR = await createServerSideClient()
    const {
      data: { user },
    } = await supabaseSSR.auth.getUser()
    if (!user)
      return NextResponse.json(
        { ok: false, step: 'session', error: 'Not logged in' },
        { status: 401 }
      )

    // 2) Load walmart connection
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
    const { data: conn, error: connErr } = await admin
      .from('walmart_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', env)
      .maybeSingle()

    if (connErr)
      return NextResponse.json(
        { ok: false, step: 'db', error: connErr.message },
        { status: 500 }
      )
    if (!conn?.refresh_token)
      return NextResponse.json(
        { ok: false, step: 'db', error: 'No refresh_token for user' },
        { status: 404 }
      )

    // 3) Refresh token at Walmart
    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    const apiBase =
      process.env.WALMART_API_BASE_URL || 'https://marketplace.walmartapis.com'

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: conn.refresh_token,
    })

    const r = await fetch(`${apiBase}/v3/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_PARTNER.ID': process.env.WALMART_PARTNER_ID!,
        'WM_CONSUMER.CHANNEL.TYPE': process.env.WALMART_CHANNEL_TYPE!,
        'WM_QOS.CORRELATION_ID': randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
      },
      body,
    })

    const text = await r.text()
    if (!r.ok) {
      return NextResponse.json(
        {
          ok: false,
          step: 'token',
          status: r.status,
          error: text.slice(0, 800),
        },
        { status: r.status }
      )
    }

    const json: any = text ? JSON.parse(text) : {}
    const access_token = json.access_token as string
    const refresh_token =
      (json.refresh_token as string | undefined) ?? conn.refresh_token
    const expires_in = Number(json.expires_in || 3600)
    const token_expires_at = new Date(
      Date.now() + (expires_in - 300) * 1000
    ).toISOString()

    // 4) Save
    const { error: upErr } = await admin
      .from('walmart_connections')
      .update({
        access_token,
        refresh_token,
        token_expires_at,
        updated_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', conn.id)

    if (upErr)
      return NextResponse.json(
        { ok: false, step: 'db-update', error: upErr.message },
        { status: 500 }
      )

    const mask = (s: string) =>
      s?.length ? `${s.slice(0, 6)}…${s.slice(-6)}` : ''
    return NextResponse.json({
      ok: true,
      accessTokenPreview: mask(access_token),
      tokenExpiresAt: token_expires_at,
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, step: 'unexpected', error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
