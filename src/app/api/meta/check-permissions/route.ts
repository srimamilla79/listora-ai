import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    const supabase = createClient()

    const { data: connection } = await supabase
      .from('meta_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'connected')
      .single()

    if (!connection) {
      return NextResponse.json({ hasMarketplacePermissions: false })
    }

    const permissionCheck = await fetch(
      `https://graph.facebook.com/v18.0/me/permissions?access_token=${connection.facebook_page_access_token}`
    )
    const permissions = await permissionCheck.json()

    // Check for new commerce permissions
    const requiredPermissions = [
      'commerce_account_manage_orders',
      'commerce_account_read_settings',
      'business_management',
    ]
    const hasMarketplacePermissions = requiredPermissions.some((perm) =>
      permissions.data?.some(
        (p: any) => p.permission === perm && p.status === 'granted'
      )
    )

    return NextResponse.json({ hasMarketplacePermissions })
  } catch (error) {
    console.error('Permission check error:', error)
    return NextResponse.json({ hasMarketplacePermissions: false })
  }
}
