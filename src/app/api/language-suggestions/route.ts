// src/app/api/language-suggestions/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

const supabaseAdmin = createServiceRoleClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const url = new URL(request.url)
    const platform = url.searchParams.get('platform')

    console.log(
      '💡 Getting language suggestions for user:',
      user.id,
      'platform:',
      platform
    )

    // Get smart suggestions using database function
    const { data: suggestions, error } = await supabaseAdmin.rpc(
      'get_language_suggestions',
      {
        p_user_id: user.id,
        p_platform: platform,
      }
    )

    if (error) {
      console.error('❌ Error getting suggestions:', error)
      return NextResponse.json(
        { error: 'Failed to get suggestions' },
        { status: 500 }
      )
    }

    const suggestion = suggestions?.[0] || {
      suggested_input: 'auto',
      suggested_output: 'en',
      reason: 'Default recommendation',
      confidence: 0.7,
    }

    console.log('✅ Generated suggestions:', suggestion)

    return NextResponse.json({
      success: true,
      suggestion,
    })
  } catch (error) {
    console.error('❌ Language suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to get language suggestions' },
      { status: 500 }
    )
  }
}
