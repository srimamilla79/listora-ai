// src/app/api/ebay/disconnect/route.ts
// eBay account disconnection

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        {
          error: 'User ID required',
        },
        { status: 400 }
      )
    }

    console.log('🔌 Disconnecting eBay account for user:', userId)

    // Update eBay connection status
    const { error: updateError } = await supabase
      .from('ebay_connections')
      .update({
        status: 'disconnected',
        access_token: '', // Clear sensitive data
        refresh_token: '',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      throw new Error('Failed to disconnect eBay account')
    }

    console.log('✅ eBay account disconnected successfully')

    return NextResponse.json({
      success: true,
      message: 'eBay account disconnected successfully',
    })
  } catch (error: any) {
    console.error('❌ eBay disconnect error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to disconnect eBay account',
      },
      { status: 500 }
    )
  }
}
