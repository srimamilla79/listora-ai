import { NextRequest, NextResponse } from 'next/server'
import { walmartUploadFeed, getWalmartConnection } from '@/lib/walmart'
import { createServerSideClient } from '@/lib/supabase' // ⬅️ add this import

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ✅ NEW: simple auth/header check (no feed upload)
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    let userId = (sp.get('userId') || '').trim()

    // Allow ?userId=self or no userId — resolve from current session
    if (!userId || userId.toLowerCase() === 'self') {
      const supabase = await createServerSideClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.json(
          { ok: false, step: 'session', error: 'Not logged in' },
          { status: 401 }
        )
      }
      userId = user.id
    }

    const conn = await getWalmartConnection(userId)
    if (!conn?.access_token) {
      return NextResponse.json(
        {
          ok: false,
          step: 'db',
          error: 'No Walmart connection / token for user',
        },
        { status: 404 }
      )
    }

    // REQUIRED headers: WM_SEC.ACCESS_TOKEN + WM_CONSUMER.CHANNEL.TYPE
    const r = await fetch(
      'https://marketplace.walmartapis.com/v3/feeds?limit=1',
      {
        method: 'GET',
        headers: {
          'WM_SEC.ACCESS_TOKEN': conn.access_token,
          'WM_CONSUMER.CHANNEL.TYPE': process.env.WALMART_CHANNEL_TYPE || '',
          'WM_QOS.CORRELATION_ID': '00000000-0000-4000-8000-000000000001',
          Accept: 'application/json',
        },
        cache: 'no-store',
      }
    )

    const text = await r.text()
    return NextResponse.json(
      {
        ok: r.ok,
        status: r.status,
        note: 'If status=200, token+headers are good; if 403, token/headers/env mismatch.',
        usedChannelType: !!process.env.WALMART_CHANNEL_TYPE,
        bodySnippet: text.slice(0, 600),
      },
      { status: r.ok ? 200 : r.status }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, step: 'unexpected', error: String(e?.message || e) },
      { status: 500 }
    )
  }
}

// 🔽 keep your existing POST below (unchanged)
export async function POST(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()
    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 400 }
      )

    const conn = await getWalmartConnection(userId)
    if (!conn)
      return NextResponse.json(
        { ok: false, error: 'No Walmart connection' },
        { status: 401 }
      )

    const sku = 'PING-' + Date.now()
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<PriceFeed xmlns="http://walmart.com/">
  <PriceHeader>
    <version>1.5</version>
  </PriceHeader>
  <Price>
    <itemIdentifier>
      <sku>${sku}</sku>
    </itemIdentifier>
    <pricing>
      <currentPrice>
        <value currency="USD">19.99</value>
      </currentPrice>
    </pricing>
  </Price>
</PriceFeed>`

    try {
      const result = await walmartUploadFeed(
        userId,
        'PRICE',
        `price-${sku}.xml`,
        xml,
        'application/xml'
      )
      return NextResponse.json({ ok: true, body: result })
    } catch (e: any) {
      return NextResponse.json(
        { ok: false, status: 403, error: String(e?.message || e) },
        { status: 400 }
      )
    }
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
