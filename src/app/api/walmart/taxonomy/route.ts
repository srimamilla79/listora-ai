// src/app/api/walmart/taxonomy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheTaxonomy } from '@/lib/specCache'

/** Return a plain array so the client can normalize it */
function pickArray(raw: any): any[] {
  const arr =
    (Array.isArray(raw) && raw) ||
    raw?.productTypeGroups ||
    raw?.productTypes ||
    raw?.children ||
    raw?.nodes ||
    raw?.items ||
    raw?.data ||
    []
  return Array.isArray(arr) ? arr : []
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing userId (send x-user-id header or ?userId=)',
        },
        { status: 401 }
      )
    }

    const refresh = sp.get('refresh') === '1'
    const raw = await getAndCacheTaxonomy(userId, refresh)
    const data = pickArray(raw)
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 400 }
    )
  }
}
