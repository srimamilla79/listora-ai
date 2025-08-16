// app/api/walmart/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getWalmartConnection } from '@/lib/walmart'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const connection = await getWalmartConnection(userId)

    if (!connection) {
      return NextResponse.json({
        connected: false,
        message: 'No Walmart connection found',
      })
    }

    return NextResponse.json({
      connected: true,
      sellerId: connection.seller_id,
      environment: connection.environment,
      expiresAt: connection.token_expires_at,
    })
  } catch (error) {
    console.error('❌ Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    )
  }
}
