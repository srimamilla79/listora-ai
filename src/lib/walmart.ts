// src/lib/walmart.ts
import { createClient } from '@supabase/supabase-js'

/* ------------------------------ Supabase admin ------------------------------ */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface WalmartConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  seller_id: string
  partner_id: string
  seller_info: any
  status: string
  environment: 'sandbox' | 'production' | string
}

/* --------------------------- Connection + Refresh --------------------------- */

/** Get active Walmart connection for a user */
export async function getWalmartConnection(
  userId: string
): Promise<WalmartConnection | null> {
  const { data, error } = await supabaseAdmin
    .from('walmart_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data as WalmartConnection
}

/** Refresh access token if needed (5-minute buffer) */
export async function ensureValidToken(
  connection: WalmartConnection
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token…')

    const environment = connection.environment || 'production'
    const tokenUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com/v3/token'
        : 'https://marketplace.walmartapis.com/v3/token'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_PARTNER.ID': connection.seller_id,
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: connection.refresh_token,
      }).toString(),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Token refresh failed: ${errorText}`)
    }

    const tokenData = await response.json()

    await supabaseAdmin
      .from('walmart_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + (tokenData.expires_in - 300) * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    console.log('✅ Token refreshed')
    return tokenData.access_token
  }

  return connection.access_token
}

/* --------------------------------- Helpers --------------------------------- */

function baseUrlForEnv(env: string | undefined) {
  return env === 'sandbox'
    ? 'https://sandbox.walmartapis.com'
    : 'https://marketplace.walmartapis.com'
}

/** Build Walmart API headers (JSON default) */
export function buildWalmartHeaders(
  accessToken: string,
  sellerId: string
): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
    'WM_SEC.ACCESS_TOKEN': accessToken,
    'WM_PARTNER.ID': sellerId,
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

/* ----------------------------- Generic JSON API ---------------------------- */

/** Make authenticated Walmart API request (JSON) */
export async function walmartApiRequest(
  userId: string,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const connection = await getWalmartConnection(userId)
  if (!connection) throw new Error('No Walmart connection found')

  const accessToken = await ensureValidToken(connection)
  const headers = buildWalmartHeaders(accessToken, connection.seller_id)
  const baseUrl = baseUrlForEnv(connection.environment)

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Walmart API error: ${res.status} - ${txt}`)
  }

  const text = await res.text()
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/** GET JSON helper */
export async function walmartGet(userId: string, path: string) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const accessToken = await ensureValidToken(conn)
  const baseUrl = baseUrlForEnv(conn.environment)

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildWalmartHeaders(accessToken, conn.seller_id),
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`Walmart GET error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/** Try multiple paths until one succeeds */
export async function walmartGetFirstOk(userId: string, paths: string[]) {
  let lastErr: any
  for (const p of paths) {
    try {
      return await walmartGet(userId, p)
    } catch (e) {
      console.log(`Path ${p} failed, trying next…`)
      lastErr = e
    }
  }
  throw lastErr || new Error('No candidate path succeeded')
}

/* ------------------------------ Simple limiter ----------------------------- */

/** Spec API is ~3 TPM; keep a tiny in-memory limiter on single server */
export const specRateLimiter = {
  calls: [] as number[],
  canCall(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60_000
    this.calls = this.calls.filter((t) => t > oneMinuteAgo)
    return this.calls.length < 3
  },
  recordCall() {
    this.calls.push(Date.now())
  },
  async waitForSlot() {
    while (!this.canCall()) {
      await new Promise((r) => setTimeout(r, 1000))
    }
    this.recordCall()
  },
}

/* --------------------------- JSON & XML feed posts -------------------------- */

/** POST JSON (e.g., offer-match; price; inventory) */
export async function walmartPost(userId: string, path: string, body: any) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const accessToken = await ensureValidToken(conn)
  const baseUrl = baseUrlForEnv(conn.environment)

  const headers = {
    ...buildWalmartHeaders(accessToken, conn.seller_id),
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`Walmart POST error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }
  try {
    return text ? JSON.parse(text) : {}
  } catch {
    return { raw: text }
  }
}

/** Raw XML POST (fallback; prefer multipart uploader below for feeds) */
export async function walmartPostXml(
  userId: string,
  path: string,
  xmlBody: string
) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const accessToken = await ensureValidToken(conn)
  const baseUrl = baseUrlForEnv(conn.environment)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'WM_SEC.ACCESS_TOKEN': accessToken,
    'WM_PARTNER.ID': conn.seller_id,
    'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
    'WM_SVC.NAME': 'Walmart Marketplace',
    Accept: 'application/json',
    'Content-Type': 'application/xml',
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: xmlBody,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    console.error(`Walmart POST XML error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status} - ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return { ok: true, raw: text }
  }
}

/**
 * Multipart uploader for Feeds v3 (Walmart expects the file in a part named 'file').
 * Use for MP_ITEM (XML), PRICE_AND_PROMOTION (JSON), MP_INVENTORY (JSON), etc.
 *
 * IMPORTANT: Do NOT set 'Content-Type' yourself; let fetch set the multipart boundary.
 */
export async function walmartUploadFeed(
  userId: string,
  feedType: string, // 'MP_ITEM' | 'PRICE_AND_PROMOTION' | 'MP_INVENTORY' | etc.
  fileName: string, // e.g., 'item.xml' or 'price.json'
  fileContents: string | Blob,
  mime: 'application/xml' | 'application/json' = 'application/xml'
) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const accessToken = await ensureValidToken(conn)
  const baseUrl = baseUrlForEnv(conn.environment)

  const fd = new FormData()
  const blob =
    typeof fileContents === 'string'
      ? new Blob([fileContents], { type: mime })
      : fileContents
  fd.append('file', blob, fileName)

  const res = await fetch(
    `${baseUrl}/v3/feeds?feedType=${encodeURIComponent(feedType)}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_PARTNER.ID': conn.seller_id,
        'WM_QOS.CORRELATION_ID': crypto.randomUUID(),
        'WM_SVC.NAME': 'Walmart Marketplace',
        Accept: 'application/json',
        // DO NOT set 'Content-Type' here; fetch/undici sets the multipart boundary.
      },
      body: fd,
      cache: 'no-store',
    }
  )

  const text = await res.text()
  if (!res.ok) {
    console.error(`Walmart FEED upload error: ${res.status} - ${text}`)
    throw new Error(`Walmart API error: ${res.status} - ${text}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return { ok: true, raw: text }
  }
}
