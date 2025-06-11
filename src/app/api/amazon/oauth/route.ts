// =============================================================================
// FILE 2: src/app/api/amazon/oauth/route.ts - OAuth Initiation
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAmazonAuthUrl } from '@/lib/amazon-oauth'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Generate Amazon OAuth URL
    const authUrl = getAmazonAuthUrl(userId)

    console.log('🔗 Redirecting user to Amazon OAuth:', authUrl)

    // Redirect user to Amazon OAuth
    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('❌ OAuth initiation error:', error)
    return NextResponse.json(
      {
        error: 'Failed to initiate Amazon OAuth',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
