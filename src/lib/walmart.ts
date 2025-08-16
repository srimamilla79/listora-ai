// lib/walmart.ts
import { createClient } from '@supabase/supabase-js'
import { walmartApiCall } from './walmart-rate-limiter'

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
  environment: string
}

/**
 * Get active Walmart connection for a user
 */
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
  return data
}

/**
 * Refresh access token if needed (with 5-minute buffer)
 */
export async function ensureValidToken(
  connection: WalmartConnection
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt <= fiveMinutesFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token...')

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

    // Update connection with new token
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

    console.log('✅ Token refreshed successfully')
    return tokenData.access_token
  }

  return connection.access_token
}

/**
 * Build Walmart API headers
 */
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

/**
 * Make authenticated Walmart API request
 */
export async function walmartApiRequest(
  userId: string,
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const connection = await getWalmartConnection(userId)
  if (!connection) {
    throw new Error('No Walmart connection found')
  }

  const accessToken = await ensureValidToken(connection)
  const headers = buildWalmartHeaders(accessToken, connection.seller_id)

  const environment = connection.environment || 'production'
  const baseUrl =
    environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Walmart API error: ${response.status} - ${errorText}`)
  }

  return response.json()
}
/** Generic GET to Walmart with proper headers */
export async function walmartGet(userId: string, path: string) {
  const conn = await getWalmartConnection(userId)
  if (!conn) throw new Error('No Walmart connection')

  const accessToken = await ensureValidToken(conn)
  const baseUrl =
    conn.environment === 'sandbox'
      ? 'https://sandbox.walmartapis.com'
      : 'https://marketplace.walmartapis.com'

  const res = await fetch(`${baseUrl}${path}`, {
    method: 'GET',
    headers: buildWalmartHeaders(accessToken, conn.seller_id),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`Walmart GET error: ${res.status} - ${errorText}`)
    throw new Error(`Walmart API error: ${res.status}`)
  }

  return res.json()
}

/** Utility: try a list of paths until one succeeds */
export async function walmartGetFirstOk(userId: string, paths: string[]) {
  let lastErr: any
  for (const p of paths) {
    try {
      return await walmartGet(userId, p)
    } catch (e) {
      console.log(`Path ${p} failed, trying next...`)
      lastErr = e
    }
  }
  throw lastErr || new Error('No candidate path succeeded')
}

/** Rate limit handler for spec API (3 TPM) */
export const specRateLimiter = {
  calls: [] as number[],
  canCall(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000
    this.calls = this.calls.filter((t) => t > oneMinuteAgo)
    return this.calls.length < 3
  },
  recordCall() {
    this.calls.push(Date.now())
  },
  async waitForSlot() {
    while (!this.canCall()) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    this.recordCall()
  },
}
