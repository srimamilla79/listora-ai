import { NextRequest, NextResponse } from 'next/server'
import { walmartUploadFeed, getWalmartConnection } from '@/lib/walmart'

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

    // Minimal valid PRICE feed (multipart upload)
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
        xml, // string
        'application/xml' // correct MIME
      )
      return NextResponse.json({ ok: true, body: result })
    } catch (e: any) {
      // Pass Walmart’s message back so we can see exact code
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
