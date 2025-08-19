// app/api/walmart/oauth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSideClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') || ''
    const sellerId = url.searchParams.get('sellerId')
    const type = url.searchParams.get('type')
    const clientId = url.searchParams.get('clientId')

    console.log('Walmart OAuth callback received:', {
      code: code ? 'present' : 'missing',
      state,
      sellerId,
      type,
      clientId,
    })

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Missing 'code' in callback" },
        { status: 400 }
      )
    }

    // Check if user is logged in
    const supabase = await createServerSideClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      // Redirect to login preserving all callback params
      const loginUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/login`)
      loginUrl.searchParams.set('walmart_oauth', state)
      loginUrl.searchParams.set('redirect', req.url)

      return NextResponse.redirect(loginUrl.toString())
    }

    // Token exchange with Walmart - Try different approaches
    const tokenUrl = 'https://marketplace.walmartapis.com/v3/token'

    const clientIdToUse = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!

    // Approach 1: Try with client credentials in the body (not in Authorization header)
    const formData = new URLSearchParams()
    formData.append('grant_type', 'authorization_code')
    formData.append('code', code)
    formData.append('redirect_uri', process.env.WALMART_REDIRECT_URI!)
    formData.append('client_id', clientIdToUse)
    formData.append('client_secret', clientSecret)

    console.log('Token exchange request (credentials in body):', {
      url: tokenUrl,
      clientId: clientIdToUse,
      redirectUri: process.env.WALMART_REDIRECT_URI,
      grant_type: 'authorization_code',
    })

    let tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': generateCorrelationId(),
        'WM_SVC.VERSION': '1.0.0',
      },
      body: formData.toString(),
    })

    let responseText = await tokenResponse.text()
    console.log(
      'Token response (credentials in body):',
      tokenResponse.status,
      responseText
    )

    // If first approach fails, try with Basic auth but different format
    if (!tokenResponse.ok && responseText.includes('INVALID_REQUEST_HEADER')) {
      console.log('First approach failed, trying with Basic auth...')

      // Remove client credentials from body
      const formData2 = new URLSearchParams()
      formData2.append('grant_type', 'authorization_code')
      formData2.append('code', code)
      formData2.append('redirect_uri', process.env.WALMART_REDIRECT_URI!)

      // Try with space after Basic
      const credentials = `${clientIdToUse}:${clientSecret}`
      const encodedCredentials = Buffer.from(credentials).toString('base64')

      tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'WM_SVC.NAME': 'Walmart Marketplace',
          'WM_QOS.CORRELATION_ID': generateCorrelationId(),
          'WM_SVC.VERSION': '1.0.0',
        },
        body: formData2.toString(),
      })

      responseText = await tokenResponse.text()
      console.log(
        'Token response (Basic auth):',
        tokenResponse.status,
        responseText
      )
    }

    // If still failing, try with just WM_SEC.ACCESS_TOKEN header (for authorization_code flow)
    if (!tokenResponse.ok && responseText.includes('INVALID_REQUEST_HEADER')) {
      console.log('Basic auth failed, trying without Authorization header...')

      // Just send the form data with no auth header
      const formData3 = new URLSearchParams()
      formData3.append('grant_type', 'authorization_code')
      formData3.append('code', code)
      formData3.append('redirect_uri', process.env.WALMART_REDIRECT_URI!)
      formData3.append('client_id', clientIdToUse)
      formData3.append('client_secret', clientSecret)

      tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: formData3.toString(),
      })

      responseText = await tokenResponse.text()
      console.log(
        'Token response (no auth header):',
        tokenResponse.status,
        responseText
      )
    }

    if (!tokenResponse.ok) {
      console.error('All token exchange attempts failed:', responseText)
      return NextResponse.json(
        {
          ok: false,
          error: `Token exchange failed (${tokenResponse.status})`,
          details: responseText,
          attempts: [
            'credentials in body with WM headers',
            'Basic auth with WM headers',
            'credentials in body without auth header',
          ],
        },
        { status: 400 }
      )
    }

    let tokenData
    try {
      tokenData = JSON.parse(responseText)
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid JSON response from token endpoint',
          response: responseText,
        },
        { status: 400 }
      )
    }

    const accessToken = tokenData.access_token
    const refreshToken = tokenData.refresh_token
    const expiresIn = Number(tokenData.expires_in || 3600)

    if (!accessToken) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No access token in response',
          data: tokenData,
        },
        { status: 400 }
      )
    }

    // Store the connection
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const connectionData = {
      user_id: user.id,
      environment: 'production',
      access_token: accessToken,
      refresh_token: refreshToken || null,
      token_expires_at: new Date(
        Date.now() + (expiresIn - 300) * 1000
      ).toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
      seller_id: sellerId || process.env.WALMART_PARTNER_ID || null,
      partner_id: process.env.WALMART_PARTNER_ID || null,
      seller_info: {
        sellerId,
        type,
        clientId,
      },
    }

    const { data: existing } = await admin
      .from('walmart_connections')
      .select('*')
      .eq('user_id', user.id)
      .eq('environment', 'production')
      .maybeSingle()

    if (existing) {
      await admin
        .from('walmart_connections')
        .update(connectionData)
        .eq('id', existing.id)
    } else {
      await admin.from('walmart_connections').insert({
        ...connectionData,
        created_at: new Date().toISOString(),
      })
    }

    // Success redirect
    const res = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/integrations?connected=walmart&sellerId=${sellerId || ''}`
    )

    // Clear cookies
    res.cookies.set('wm_oauth_state', '', { maxAge: 0, path: '/' })
    res.cookies.set('wm_oauth_user', '', { maxAge: 0, path: '/' })
    res.cookies.set('wm_oauth_nonce', '', { maxAge: 0, path: '/' })

    return res
  } catch (e: any) {
    console.error('Walmart OAuth error:', e)
    return NextResponse.json(
      { ok: false, error: e.message || 'Internal error' },
      { status: 500 }
    )
  }
}

// Generate correlation ID in format Walmart expects
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
