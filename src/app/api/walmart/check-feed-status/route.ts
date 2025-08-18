import { NextRequest, NextResponse } from 'next/server'
import {
  getWalmartConnection,
  ensureValidToken,
  buildWalmartHeaders,
} from '@/lib/walmart'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()
    const feedId = (sp.get('feedId') || '').trim()
    const includeDetails =
      sp.get('includeDetails') === '1' || sp.get('includeDetails') === 'true'

    if (!userId)
      return NextResponse.json(
        { ok: false, error: 'Missing userId' },
        { status: 400 }
      )
    if (!feedId)
      return NextResponse.json(
        { ok: false, error: 'Missing feedId' },
        { status: 400 }
      )

    // Use the shared helpers so we don't reimplement refresh logic here
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

    const url =
      `${base}/v3/feeds/${encodeURIComponent(feedId)}` +
      (includeDetails ? '?includeDetails=true&offset=0&limit=50' : '')

    // IMPORTANT: never pass null into headers
    const headers: HeadersInit = buildWalmartHeaders(
      access,
      (conn.seller_id || conn.partner_id || undefined) as string | undefined
    )

    const res = await fetch(url, { method: 'GET', headers, cache: 'no-store' })
    const text = await res.text()
    let json: any
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { raw: text }
    }

    // Return ok:true even for non-2xx so the UI can read Walmart’s body
    if (!res.ok) {
      return NextResponse.json({ ok: true, data: json, status: res.status })
    }

    return NextResponse.json({ ok: true, data: json })
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
