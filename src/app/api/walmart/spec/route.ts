// src/app/api/walmart/spec/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheSpec } from '@/lib/specCache'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = req.headers.get('x-user-id') || sp.get('userId') || ''
    const productTypesCsv = sp.get('productTypes') || ''

    if (!userId || !productTypesCsv) {
      return NextResponse.json(
        { error: 'userId and productTypes (csv) are required' },
        { status: 400 }
      )
    }

    const version = sp.get('version') || '5.0'
    const refresh = sp.get('refresh') === '1'
    const pts = productTypesCsv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    const data = await getAndCacheSpec(userId, pts, { version, refresh })

    return NextResponse.json({
      ok: true,
      version,
      data,
      productTypes: pts,
    })
  } catch (e: any) {
    console.error('Spec API error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
