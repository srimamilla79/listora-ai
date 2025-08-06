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

    const supabase = await createServerSideClient()

    // Get user ID from session if not provided
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const finalUserId: string | null = userId || session?.user?.id || null

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
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
    const accessToken = connection.access_token

    // Get feed status from Walmart - with includeDetails and offset for error details
    const environment = process.env.WALMART_ENVIRONMENT || 'sandbox'
    const baseUrl =
      environment === 'sandbox'
        ? 'https://sandbox.walmartapis.com'
        : 'https://marketplace.walmartapis.com'

    // Add includeDetails=true and offset=0&limit=50 to get error details
    const statusUrl = `${baseUrl}/v3/feeds/${feedId}?includeDetails=true&offset=0&limit=50`

    console.log('📊 Checking feed status:', statusUrl)

    const response = await fetch(statusUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'WM_SEC.ACCESS_TOKEN': accessToken,
        'WM_QOS.CORRELATION_ID': Date.now().toString(),
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_PARTNER.ID': process.env.WALMART_PARTNER_ID!,
        Accept: 'application/json',
      },
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('Feed status check failed:', responseText)
      return NextResponse.json(
        { error: `Failed to get feed status: ${responseText}` },
        { status: response.status }
      )
    }

    const feedStatus = JSON.parse(responseText)

    // Log any errors for debugging
    if (feedStatus.ingestionErrors?.ingestionError) {
      console.log(
        '❌ Feed errors found:',
        JSON.stringify(feedStatus.ingestionErrors, null, 2)
      )
    }

    if (feedStatus.itemDetails?.itemIngestionStatus?.length > 0) {
      console.log(
        '📦 Item details:',
        JSON.stringify(feedStatus.itemDetails, null, 2)
      )
    }

    // Add interpretation to make it easier to understand
    const interpretation = {
      message: '',
      isComplete: false,
      isError: false,
      progress: 0,
    }

    switch (feedStatus.feedStatus) {
      case 'RECEIVED':
        interpretation.message = 'Feed received and queued for processing'
        interpretation.progress = 25
        break
      case 'INPROGRESS':
        interpretation.message = 'Feed is currently being processed'
        interpretation.progress = 50
        break
      case 'PROCESSED':
        interpretation.message = 'Feed processed successfully'
        interpretation.isComplete = true
        interpretation.progress = 100
        break
      case 'ERROR':
        interpretation.message = 'Feed processing failed'
        interpretation.isComplete = true
        interpretation.isError = true
        interpretation.progress = 100
        break
      case 'PARTIAL_SUCCESS':
        interpretation.message = 'Some items processed, some failed'
        interpretation.isComplete = true
        interpretation.progress = 100
        break
    }

    // If there are specific errors, add them to the interpretation
    if (feedStatus.ingestionErrors?.ingestionError?.length > 0) {
      const errors = feedStatus.ingestionErrors.ingestionError
      interpretation.message += `. Errors: ${errors
        .map((e: any) => `${e.description} (${e.code})`)
        .join(', ')}`
    }

    return NextResponse.json({
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
