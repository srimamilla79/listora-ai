import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const shopId = body.shop_id
    const shopDomain = body.shop_domain

    console.log('Shopify shop redaction request:', {
      shop_id: shopId,
      shop_domain: shopDomain,
    })

    if (shopId || shopDomain) {
      const supabase = createClient()

      // Remove all connections for this shop
      const { error: connectionError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('platform', 'shopify')
        .or(
          `platform_store_info->shop_id.eq.${shopId},platform_store_info->shop_domain.eq.${shopDomain}`
        )

      if (connectionError) {
        console.error('Error deleting shop connections:', connectionError)
      }

      // Remove all published products for this shop
      const { error: productsError } = await supabase
        .from('published_products')
        .delete()
        .eq('platform', 'shopify')
        .or(
          `platform_data->shop_id.eq.${shopId},platform_data->shop_domain.eq.${shopDomain}`
        )

      if (productsError) {
        console.error('Error deleting shop products:', productsError)
      }

      console.log('Shop data redacted successfully for shop:', shopDomain)
    }

    return NextResponse.json(
      {
        message: 'Shop data redacted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error redacting shop data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
