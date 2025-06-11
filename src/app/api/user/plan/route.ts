// src/app/api/user/plan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// GET - Fetch user's current plan
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    // Fetch user's current plan
    const { data: planData, error: planError } = await supabase
      .from('user_plans')
      .select('plan_type, created_at, expires_at, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (planError) {
      console.error('Error fetching user plan:', planError)
      // If no plan found, return starter as default
      return NextResponse.json({
        plan_type: 'starter',
        created_at: new Date().toISOString(),
        expires_at: null,
        is_active: true,
      })
    }

    return NextResponse.json(planData)
  } catch (error) {
    console.error('Plan fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Update user's plan (for admin use or after payment)
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const { plan_type, user_id } = await req.json()

    if (!plan_type || !user_id) {
      return NextResponse.json(
        { error: 'Missing plan_type or user_id' },
        { status: 400 }
      )
    }

    const validPlans = ['starter', 'business', 'premium', 'enterprise']
    if (!validPlans.includes(plan_type)) {
      return NextResponse.json({ error: 'Invalid plan type' }, { status: 400 })
    }

    // Deactivate current plan
    await supabase
      .from('user_plans')
      .update({ is_active: false })
      .eq('user_id', user_id)
      .eq('is_active', true)

    // Create new plan
    const { data, error } = await supabase
      .from('user_plans')
      .insert({
        user_id,
        plan_type,
        is_active: true,
        expires_at:
          plan_type === 'starter'
            ? null
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating user plan:', error)
      return NextResponse.json(
        { error: 'Failed to update plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, plan: data })
  } catch (error) {
    console.error('Plan update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Extend or modify existing plan
export async function PATCH(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token or user not found' },
        { status: 401 }
      )
    }

    const { expires_at } = await req.json()

    const { data, error } = await supabase
      .from('user_plans')
      .update({ expires_at })
      .eq('user_id', user.id)
      .eq('is_active', true)
      .select()
      .single()

    if (error) {
      console.error('Error extending plan:', error)
      return NextResponse.json(
        { error: 'Failed to extend plan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, plan: data })
  } catch (error) {
    console.error('Plan extension error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
