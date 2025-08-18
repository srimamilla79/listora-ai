import { NextRequest, NextResponse } from 'next/server'
import {
  getWalmartConnection,
  ensureValidToken,
  buildWalmartHeaders,
} from '@/lib/walmart'

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

    const access = await ensureValidToken(conn)
    const base =
      conn.environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com'
        : 'https://marketplace.walmartapis.com'

    // Minimal valid PRICE feed XML (1 SKU)
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

    const headers: HeadersInit = {
      ...buildWalmartHeaders(access, conn.seller_id || conn.partner_id || ''),
      'Content-Type': 'application/xml',
      Accept: 'application/json',
    }
    // Don’t send a blank WM_PARTNER.ID
    if (!conn.seller_id && !conn.partner_id)
      delete (headers as any)['WM_PARTNER.ID']

    const url = `${base}/v3/feeds?feedType=PRICE`
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: xml as any,
      cache: 'no-store',
    })
    const text = await res.text()

    // Bubble Walmart’s exact verdict so we see the real code/description
    return NextResponse.json(
      { ok: res.ok, status: res.status, body: tryJson(text) },
      { status: res.ok ? 200 : 400 }
    )
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}

function tryJson(t: string) {
  try {
    return t ? JSON.parse(t) : {}
  } catch {
    return { raw: t }
  }
}
