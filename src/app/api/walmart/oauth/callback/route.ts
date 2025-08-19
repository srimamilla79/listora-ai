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

    // Token exchange with Walmart following their exact documentation
    const tokenUrl = 'https://marketplace.walmartapis.com/v3/token'

    // Get credentials
    const clientIdToUse = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!

    // Create Basic auth header as per Walmart docs
    const authString = `${clientIdToUse}:${clientSecret}`
    const base64Auth = Buffer.from(authString).toString('base64')

    // Prepare form data exactly as documented
    const formData = new URLSearchParams()
    formData.append('grant_type', 'authorization_code')
    formData.append('code', code)
    formData.append('redirect_uri', process.env.WALMART_REDIRECT_URI!)

    // Generate correlation ID
    const correlationId = generateCorrelationId()

    console.log('Token exchange request:', {
      url: tokenUrl,
      grant_type: 'authorization_code',
      redirect_uri: process.env.WALMART_REDIRECT_URI,
      sellerId: sellerId,
      correlationId: correlationId,
    })

    // Make the request with exact headers from documentation
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${base64Auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_QOS.CORRELATION_ID': correlationId,
        'WM_SVC.NAME': 'Walmart Marketplace',
        // WM_PARTNER.ID is required for authorization_code grant type
        'WM_PARTNER.ID': sellerId || process.env.WALMART_PARTNER_ID || '',
        // Only include WM_CONSUMER.CHANNEL.TYPE if we have it
        ...(process.env.WALMART_CHANNEL_TYPE
          ? { 'WM_CONSUMER.CHANNEL.TYPE': process.env.WALMART_CHANNEL_TYPE }
          : {}),
      },
      body: formData.toString(),
    })

    const responseText = await tokenResponse.text()
    console.log('Token response:', {
      status: tokenResponse.status,
      body: responseText,
    })

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', responseText)

      // Special handling for 401 errors
      if (tokenResponse.status === 401) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Authentication failed',
            details: responseText,
            troubleshooting: {
              1: 'Verify WALMART_CLIENT_ID and WALMART_CLIENT_SECRET in Vercel',
              2: 'Ensure redirect_uri matches exactly what is registered with Walmart',
              3:
                'Check if WM_PARTNER.ID (sellerId) is required: ' +
                (sellerId || 'NOT PROVIDED'),
              4: 'You may need to set WALMART_PARTNER_ID in Vercel if sellerId is not provided',
            },
          },
          { status: 401 }
        )
      }

      return NextResponse.json(
        {
          ok: false,
          error: `Token exchange failed (${tokenResponse.status})`,
          details: responseText,
        },
        { status: tokenResponse.status }
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

    console.log('Token exchange successful, storing connection...')

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

// Generate correlation ID as per Walmart docs - a random GUID
function generateCorrelationId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
