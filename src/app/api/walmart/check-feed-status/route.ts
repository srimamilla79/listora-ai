import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getWalmartConnection, buildWalmartHeaders } from '@/lib/walmart'

/** Admin client so we can persist a refreshed access token if needed */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fetchFeedStatusWithAutoRefresh(
  userId: string,
  feedId: string,
  includeDetails: boolean
) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const baseUrl =
    conn.environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const qs = new URLSearchParams({
    includeDetails: includeDetails ? 'true' : 'false',
    offset: '0',
    limit: '50',
  }).toString()

  const url = `${baseUrl}/v3/feeds/${encodeURIComponent(feedId)}?${qs}`

  const doFetch = async (accessToken: string) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: buildWalmartHeaders(accessToken, conn.seller_id),
      cache: 'no-store',
    })
    const text = await res.text()
    return { res, text }
  }

  // 1) First attempt with current token
  let { res, text } = await doFetch(conn.access_token)

  // 2) If unauthorized, force-refresh token and retry once
  if (res.status === 401) {
    const tokenUrl =
      conn.environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token'
        : 'https://marketplace.walmartapis.com/v3/token'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const refreshResp = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_PARTNER.ID': conn.seller_id,
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refresh_token,
      }).toString(),
    })

    const refreshText = await refreshResp.text()
    if (!refreshResp.ok) {
      throw new Error(`Token refresh failed: ${refreshText}`)
    }
    const tokenData = JSON.parse(refreshText)

    // Persist new token
    await supabaseAdmin
      .from('walmart_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + (tokenData.expires_in - 300) * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id)

    // Retry once with refreshed token
    ;({ res, text } = await doFetch(tokenData.access_token))
  }

  if (!res.ok) {
    throw new Error(`API call failed: ${res.status} - ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return { raw: text }
  }
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    const userId = (
      req.headers.get('x-user-id') ||
      sp.get('userId') ||
      ''
    ).trim()
    const feedId = (sp.get('feedId') || '').trim()
    const includeDetails = (sp.get('includeDetails') || '0') === '1'

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing userId (send x-user-id header or ?userId=)',
        },
        { status: 401 }
      )
    }
    if (!feedId) {
      return NextResponse.json(
        { ok: false, error: 'Missing feedId (?feedId=...)' },
        { status: 400 }
      )
    }

    const data = await fetchFeedStatusWithAutoRefresh(
      userId,
      feedId,
      includeDetails
    )
    return NextResponse.json({ ok: true, data })
  } catch (e: any) {
    console.error('❌ Feed status check error:', e)
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500 }
    )
  }
}
