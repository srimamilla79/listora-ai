// src/app/api/etsy/disconnect/route.ts
// Etsy account disconnection

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    console.log('🔌 Disconnecting Etsy account for user:', userId)

    // Update connection status in database
    const { data: updatedConnection, error: updateError } = await supabase
      .from('etsy_connections')
      .update({
        status: 'disconnected',
        disconnected_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .select()

    if (updateError) {
      console.error('❌ Error updating Etsy connection:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to disconnect Etsy account',
        },
        { status: 500 }
      )
    }

    // Optionally revoke tokens with Etsy API
    // Note: Etsy doesn't require explicit token revocation for OAuth 1.0a
    // The tokens will naturally expire or can be revoked by the user in their Etsy account

    console.log('✅ Etsy account disconnected successfully for user:', userId)

    return NextResponse.json({
      success: true,
      message: 'Etsy account disconnected successfully',
      disconnected_connections: updatedConnection?.length || 0,
    })
  } catch (error) {
    console.error('❌ Error disconnecting Etsy account:', error)
    return NextResponse.json(
      {
        error: 'Failed to disconnect Etsy account',
      },
      { status: 500 }
    )
  }
}
