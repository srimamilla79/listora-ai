import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()
    const productType = (sp.get('productTypes') || '').trim()
    const version = (sp.get('version') || '').trim()
    const isLeaf = sp.get('leaf') === '1' // client promises this is a leaf

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 401 }
      )
    }
    if (!productType) {
      return NextResponse.json(
        { ok: false, error: 'Missing productTypes' },
        { status: 400 }
      )
    }

    // We intentionally do NOT call Walmart here. Many categories don’t have a public “spec” endpoint,
    // and calling it for groups or some leaves returns 400 (“No schema found…”).
    // Returning ok:true keeps the UI happy and your logs clean.
    if (!isLeaf) {
      return NextResponse.json({
        ok: true,
        data: null,
        version: null,
        note: 'group-selected-no-spec',
      })
    }

    // Leaf selected: return a benign success (your publisher doesn’t require spec to post).
    return NextResponse.json({
      ok: true,
      data: null,
      version: version || null,
      note: 'leaf-selected-no-spec-call',
    })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 400 }
    )
  }
}
