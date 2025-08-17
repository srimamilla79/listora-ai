import { NextRequest, NextResponse } from 'next/server'
import { getAndCacheTaxonomy } from '@/lib/specCache'

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

    // Return the raw taxonomy shape; the client normalizer will build the tree.
    return NextResponse.json({ ok: true, data: raw })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 400 }
    )
  }
}
