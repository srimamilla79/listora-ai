// src/app/api/walmart/insights/unpublished/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { walmartGetFirstOk } from '@/lib/walmart'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = req.headers.get('x-user-id') || sp.get('userId') || ''
    const limit = sp.get('limit') || '50'
    const offset = sp.get('offset') || '0'

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    // Try multiple endpoints
    const candidates = [
      `/v3/insights/items/unpublished?limit=${limit}&offset=${offset}`,
      `/v3/insights/items?status=UNPUBLISHED&limit=${limit}&offset=${offset}`,
      `/v3/items?status=UNPUBLISHED&limit=${limit}&offset=${offset}`,
    ]

    const data = await walmartGetFirstOk(userId, candidates)

    // Extract reason codes
    const reasons = extractUnpublishedReasons(data)

    return NextResponse.json({
      ok: true,
      data,
      reasons,
    })
  } catch (e: any) {
    console.error('Unpublished insights error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}

function extractUnpublishedReasons(data: any) {
  const reasons: Record<string, number> = {}
  const items = data.items || data.ItemResponse || []

  for (const item of items) {
    const reason =
      item.unpublishedReasonCode || item.reason || item.status || 'UNKNOWN'
    reasons[reason] = (reasons[reason] || 0) + 1
  }

  return reasons
}
