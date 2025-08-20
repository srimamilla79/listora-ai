// File: src/app/api/walmart/debug/token-detail/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSideClient } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabaseSSR = await createServerSideClient()
    const {
      data: { user },
    } = await supabaseSSR.auth.getUser()
    if (!user)
      return NextResponse.json(
        { ok: false, step: 'session', error: 'Not logged in' },
        { status: 401 }
      )

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const env = (process.env.WALMART_ENVIRONMENT || 'production').toLowerCase()
    const { data: conn } = await admin
      .from('walmart_connections')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('environment', env)
      .maybeSingle()

    if (!conn?.access_token)
      return NextResponse.json(
        { ok: false, step: 'db', error: 'No access_token' },
        { status: 404 }
      )

    const apiBase =
      process.env.WALMART_API_BASE_URL || 'https://marketplace.walmartapis.com'
    const r = await fetch(`${apiBase}/v3/token/detail`, {
      headers: {
        'WM_SEC.ACCESS_TOKEN': conn.access_token,
        'WM_QOS.CORRELATION_ID': randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
        Accept: 'application/json',
      },

      cache: 'no-store',
    })

    const text = await r.text()
    return NextResponse.json(
      { ok: r.ok, status: r.status, body: text.slice(0, 1500) },
      { status: r.status }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, step: 'unexpected', error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
