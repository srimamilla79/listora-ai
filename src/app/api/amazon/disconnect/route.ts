//File 4: src/app/api/amazon/disconnect/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const supabase = createClient()

    // Update connection status to inactive
    const { error } = await supabase
      .from('amazon_connections')
      .update({
        status: 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to disconnect from database',
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully disconnected from Amazon Seller Central',
    })
  } catch (error) {
    console.error('Amazon disconnect error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to disconnect from Amazon',
      },
      { status: 500 }
    )
  }
}
