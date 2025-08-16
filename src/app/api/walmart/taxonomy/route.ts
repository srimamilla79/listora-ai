// src/app/api/walmart/taxonomy/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheTaxonomy } from '@/lib/specCache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const userId =
      req.headers.get('x-user-id') ||
      req.nextUrl.searchParams.get('userId') ||
      ''

    if (!userId) {
      return NextResponse.json(
        { error: 'userId required (header x-user-id or ?userId=)' },
        { status: 400 }
      )
    }

    const refresh = req.nextUrl.searchParams.get('refresh') === '1'
    const data = await getAndCacheTaxonomy(userId, refresh)

    return NextResponse.json({
      ok: true,
      data,
      cached: !refresh,
    })
  } catch (e: any) {
    console.error('Taxonomy API error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
