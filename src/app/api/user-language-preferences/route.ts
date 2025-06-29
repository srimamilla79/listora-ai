// src/app/api/user-language-preferences/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

const supabaseAdmin = createServiceRoleClient()

// GET: Retrieve user language preferences
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

    console.log('🔍 Getting language preferences for user:', user.id)

    // Get user preferences using the database function
    const { data: preferences, error } = await supabaseAdmin.rpc(
      'get_user_language_preferences',
      { p_user_id: user.id }
    )

    if (error) {
      console.error('❌ Error fetching preferences:', error)
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      )
    }

    // If no preferences found, return defaults
    const userPrefs = preferences?.[0] || {
      preferred_input_language: 'auto',
      preferred_output_language: 'en',
      platform_language_map: {
        amazon: 'en',
        'amazon-es': 'es',
        'amazon-fr': 'fr',
        etsy: 'en',
        shopify: 'en',
      },
      content_generation_stats: {
        total_generations: 0,
        multilingual_generations: 0,
        most_used_input: 'auto',
        most_used_output: 'en',
      },
      frequent_language_pairs: {},
    }

    console.log('✅ Retrieved preferences:', userPrefs)

    return NextResponse.json({
      success: true,
      preferences: userPrefs,
    })
  } catch (error) {
    console.error('❌ Language preferences GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch language preferences' },
      { status: 500 }
    )
  }
}

// POST: Update user language preferences
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      preferred_input_language,
      preferred_output_language,
      platform_language_map,
      update_type = 'manual', // 'manual' or 'usage'
    } = body

    console.log('💾 Updating language preferences for user:', user.id, body)

    // Check if preferences exist
    const { data: existing } = await supabaseAdmin
      .from('user_language_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single()

    let result

    if (existing) {
      // Update existing preferences
      const updateData: any = {
        updated_at: new Date().toISOString(),
      }

      if (preferred_input_language)
        updateData.preferred_input_language = preferred_input_language
      if (preferred_output_language)
        updateData.preferred_output_language = preferred_output_language
      if (platform_language_map)
        updateData.platform_language_map = platform_language_map

      const { data, error } = await supabaseAdmin
        .from('user_language_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single()

      result = { data, error }
    } else {
      // Create new preferences
      const { data, error } = await supabaseAdmin
        .from('user_language_preferences')
        .insert({
          user_id: user.id,
          preferred_input_language: preferred_input_language || 'auto',
          preferred_output_language: preferred_output_language || 'en',
          platform_language_map: platform_language_map || {
            amazon: 'en',
            'amazon-es': 'es',
            'amazon-fr': 'fr',
            etsy: 'en',
            shopify: 'en',
          },
        })
        .select()
        .single()

      result = { data, error }
    }

    if (result.error) {
      console.error('❌ Error updating preferences:', result.error)
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      )
    }

    console.log('✅ Updated preferences successfully')

    return NextResponse.json({
      success: true,
      preferences: result.data,
      message:
        update_type === 'manual'
          ? 'Language preferences updated successfully'
          : 'Usage statistics updated',
    })
  } catch (error) {
    console.error('❌ Language preferences POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update language preferences' },
      { status: 500 }
    )
  }
}

// PUT: Update usage statistics after voice processing
export async function PUT(request: NextRequest) {
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

    const body = await request.json()
    const { detected_language, output_language, was_translated, platform } =
      body

    console.log('📊 Updating usage statistics:', {
      user: user.id,
      detected_language,
      output_language,
      was_translated,
      platform,
    })

    // Update usage statistics using database function
    const { error } = await supabaseAdmin.rpc('update_language_usage_stats', {
      p_user_id: user.id,
      p_detected_language: detected_language,
      p_output_language: output_language,
      p_was_translated: was_translated,
    })

    if (error) {
      console.error('❌ Error updating usage stats:', error)
      return NextResponse.json(
        { error: 'Failed to update usage statistics' },
        { status: 500 }
      )
    }

    console.log('✅ Usage statistics updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Usage statistics updated successfully',
    })
  } catch (error) {
    console.error('❌ Usage statistics update error:', error)
    return NextResponse.json(
      { error: 'Failed to update usage statistics' },
      { status: 500 }
    )
  }
}

// src/app/api/language-suggestions/route.ts
export async function GET_SUGGESTIONS(request: NextRequest) {
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
