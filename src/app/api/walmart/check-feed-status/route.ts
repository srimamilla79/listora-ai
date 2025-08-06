// src/app/api/walmart/check-feed-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const feedId = request.nextUrl.searchParams.get('feedId')
    const userId = request.nextUrl.searchParams.get('userId')

    if (!feedId) {
      return NextResponse.json(
        { error: 'Feed ID is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Checking feed status for:', feedId)

    const supabase = await createServerSideClient()

    // If userId is provided, use it. Otherwise, try to get from session
    let finalUserId: string | null = userId
    if (!finalUserId) {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      finalUserId = session?.user?.id || null
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get Walmart connection
    const { data: connections, error: connectionError } = await supabase
      .from('walmart_connections')
      .select('*')
      .eq('user_id', finalUserId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (connectionError || !connections || connections.length === 0) {
      return NextResponse.json(
        { error: 'Walmart account not connected' },
        { status: 400 }
      )
    }

    const connection = connections[0]
    const accessToken = await refreshTokenIfNeeded(connection, supabase)

    // Check feed status with Walmart
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const baseUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com'
        : 'https://marketplace.walmartapis.com'

    const statusUrl = `${baseUrl}/v3/feeds/${feedId}?includeDetails=true`

    console.log('📡 Fetching feed status from:', statusUrl)

    const response = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_QOS.CORRELATION_ID': `${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`,
        'WM_SVC.NAME': 'Walmart Marketplace',
        Accept: 'application/json',
      },
    })

    const responseText = await response.text()
    console.log('📨 Feed status response:', response.status)

    if (!response.ok) {
      console.error('❌ Failed to get feed status:', responseText)
      return NextResponse.json(
        { error: `Failed to get feed status: ${responseText}` },
        { status: response.status }
      )
    }

    let feedStatus
    try {
      feedStatus = JSON.parse(responseText)
    } catch {
      feedStatus = { message: responseText }
    }

    console.log('✅ Feed status retrieved:', feedStatus)

    // Interpret the status for better UX
    const interpretation = interpretFeedStatus(feedStatus)

    return NextResponse.json({
      feedId,
      ...feedStatus,
      interpretation,
    })
  } catch (error) {
    console.error('❌ Feed status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check feed status' },
      { status: 500 }
    )
  }
}

// Helper function to interpret feed status
function interpretFeedStatus(feedStatus: any) {
  const status = feedStatus.feedStatus || feedStatus.status

  const interpretations: Record<string, any> = {
    RECEIVED: {
      message: 'Feed received and queued for processing',
      isComplete: false,
      isError: false,
      progress: 25,
    },
    INPROGRESS: {
      message: 'Feed is currently being processed',
      isComplete: false,
      isError: false,
      progress: 50,
    },
    PROCESSED: {
      message: 'Feed processed successfully',
      isComplete: true,
      isError: false,
      progress: 100,
    },
    ERROR: {
      message: 'Feed processing failed',
      isComplete: true,
      isError: true,
      progress: 100,
    },
    PARTIAL_SUCCESS: {
      message: 'Feed partially processed with some errors',
      isComplete: true,
      isError: false,
      progress: 100,
    },
  }

  return (
    interpretations[status] || {
      message: `Unknown status: ${status}`,
      isComplete: false,
      isError: false,
      progress: 0,
    }
  )
}

// Token refresh function (same as other routes)
async function refreshTokenIfNeeded(
  connection: any,
  supabase: any
): Promise<string> {
  const expiresAt = new Date(connection.token_expires_at)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

  if (expiresAt <= oneHourFromNow && connection.refresh_token) {
    console.log('🔄 Refreshing Walmart token...')

    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const tokenUrl = 'https://sandbox.walmartapis.com/v3/token'

    const clientId = process.env.WALMART_CLIENT_ID!
    const clientSecret = process.env.WALMART_CLIENT_SECRET!
    const partnerId = process.env.WALMART_PARTNER_ID!

    if (!partnerId) {
      throw new Error('WALMART_PARTNER_ID environment variable is not set')
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      'base64'
    )

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        'WM_QOS.CORRELATION_ID': Date.now().toString(),
        'WM_SVC.NAME': 'Listora AI',
        'WM_PARTNER.ID': partnerId,
      },
      body: `grant_type=refresh_token&refresh_token=${connection.refresh_token}`,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to refresh Walmart token: ${errorText}`)
    }

    const tokenData = await response.json()

    await supabase
      .from('walmart_connections')
      .update({
        access_token: tokenData.access_token,
        token_expires_at: new Date(
          Date.now() + tokenData.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return tokenData.access_token
  }

  return connection.access_token
}
