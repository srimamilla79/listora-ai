// File 1: src/app/api/amazon/status/route.ts - FIXED
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    console.log('🔍 Amazon status check for user:', userId)
    console.log('🔍 Full URL:', request.url)
    console.log('🔍 Search params:', Object.fromEntries(searchParams.entries()))

    if (!userId) {
      console.log('❌ No user ID provided in query params')
      return NextResponse.json(
        {
          error: 'User ID required',
          debug: {
            url: request.url,
            searchParams: Object.fromEntries(searchParams.entries()),
          },
        },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    // Check if user has Amazon connection
    const { data: connection, error } = await supabase
      .from('amazon_connections')
      .select('*')
      .eq('user_id', userId)
      .single()

    console.log('📊 Database query result:', { connection, error })

    // Handle the case where no connection exists (not an error)
    if (error && error.code === 'PGRST116') {
      // No rows returned - user is not connected
      console.log('📋 No Amazon connection found for user')
      return NextResponse.json({
        connected: false,
        connection: null,
      })
    }

    // Handle other database errors
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json(
        {
          error: 'Database error',
          details: error.message,
        },
        { status: 500 }
      )
    }

    // User has a connection
    const isConnected = !!connection
    const connectionData = connection
      ? {
          seller_id: connection.seller_id,
          marketplace_id: connection.marketplace_id,
          connected_at: connection.connected_at,
          status: connection.status,
        }
      : null

    console.log('✅ Amazon status check result:', { connected: isConnected })

    return NextResponse.json({
      connected: isConnected,
      connection: connectionData,
    })
  } catch (error) {
    console.error('❌ Amazon status check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check Amazon connection status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
