// src/lib/amazon-oauth.ts - Fixed for Server-side Usage
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Encryption helpers for storing tokens securely
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || 'your-32-character-secret-key-here!' // 32 chars
const ALGORITHM = 'aes-256-cbc'

export function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY)
  let encrypted = cipher.update(token, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export function decryptToken(encryptedToken: string): string {
  const textParts = encryptedToken.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Amazon OAuth URLs and configuration - FIXED VERSION
export const AMAZON_OAUTH_CONFIG = {
  authUrl: 'https://sellercentral.amazon.com/apps/authorize/consent',
  tokenUrl: 'https://api.amazon.com/auth/o2/token',
  scope: 'messaging:read messaging:write marketplace:all',
  applicationId: 'amzn1.sp.solution.1d2d0060-9bf5-417f-87b3-ae6a053a85bf', // Use Application ID for OAuth
  clientId: process.env.AMAZON_SP_API_CLIENT_ID!, // Keep Client ID for token exchange
  clientSecret: process.env.AMAZON_SP_API_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/amazon/oauth/callback`,
}

// Generate OAuth state parameter for security
export function generateOAuthState(userId: string): string {
  const randomString = crypto.randomBytes(16).toString('hex')
  return Buffer.from(`${userId}:${randomString}:${Date.now()}`).toString(
    'base64'
  )
}

// Verify OAuth state parameter
export function verifyOAuthState(
  state: string,
  expectedUserId: string
): boolean {
  try {
    const decoded = Buffer.from(state, 'base64').toString()
    const [userId, , timestamp] = decoded.split(':')

    // Check if state is for the correct user and not expired (1 hour)
    const isValidUser = userId === expectedUserId
    const isNotExpired = Date.now() - parseInt(timestamp) < 3600000 // 1 hour

    return isValidUser && isNotExpired
  } catch {
    return false
  }
}

// Get Amazon authorization URL for user - FIXED VERSION
export function getAmazonAuthUrl(userId: string): string {
  const state = generateOAuthState(userId)
  const params = new URLSearchParams({
    application_id: AMAZON_OAUTH_CONFIG.applicationId, // FIXED: Use applicationId instead of clientId
    redirect_uri: AMAZON_OAUTH_CONFIG.redirectUri,
    state,
    scope: AMAZON_OAUTH_CONFIG.scope,
    version: 'beta', // FIXED: Added for draft apps
  })

  return `${AMAZON_OAUTH_CONFIG.authUrl}?${params.toString()}`
}

// Exchange authorization code for access tokens
export async function exchangeCodeForTokens(code: string) {
  const response = await fetch(AMAZON_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: AMAZON_OAUTH_CONFIG.clientId,
      client_secret: AMAZON_OAUTH_CONFIG.clientSecret,
      redirect_uri: AMAZON_OAUTH_CONFIG.redirectUri,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Token exchange failed: ${response.status} - ${errorData}`)
  }

  return await response.json()
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch(AMAZON_OAUTH_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: AMAZON_OAUTH_CONFIG.clientId,
      client_secret: AMAZON_OAUTH_CONFIG.clientSecret,
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Token refresh failed: ${response.status} - ${errorData}`)
  }

  return await response.json()
}

// Get user's Amazon tokens from database
export async function getUserAmazonTokens(userId: string) {
  // ✅ Fixed: Use server-side Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: connection, error } = await supabase
    .from('amazon_connections')
    .select('access_token, refresh_token, token_expires_at, seller_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()

  if (error || !connection) {
    throw new Error('No active Amazon connection found')
  }

  // Check if token is expired
  const isExpired = new Date() >= new Date(connection.token_expires_at)

  if (isExpired && connection.refresh_token) {
    // Refresh the token
    const refreshedTokens = await refreshAccessToken(
      decryptToken(connection.refresh_token)
    )

    // Update database with new tokens
    const expiresAt = new Date(Date.now() + refreshedTokens.expires_in * 1000)

    await supabase
      .from('amazon_connections')
      .update({
        access_token: encryptToken(refreshedTokens.access_token),
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return {
      accessToken: refreshedTokens.access_token,
      sellerId: connection.seller_id,
    }
  }

  return {
    accessToken: decryptToken(connection.access_token),
    sellerId: connection.seller_id,
  }
}
