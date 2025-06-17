import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const customerId = body.customer?.id
    const shopDomain = body.shop_domain

    console.log('Shopify customer redaction request:', {
      customer_id: customerId,
      shop_domain: shopDomain,
    })

    if (customerId && shopDomain) {
      const supabase = createClient()

      // Remove customer's platform connection
      const { error: connectionError } = await supabase
        .from('platform_connections')
        .delete()
        .eq('platform_user_id', customerId.toString())
        .eq('platform', 'shopify')

      if (connectionError) {
        console.error('Error deleting platform connection:', connectionError)
      }

      // Remove customer's published products from this shop
      const { error: productsError } = await supabase
        .from('published_products')
        .delete()
        .eq('platform', 'shopify')
        .like('platform_data->shop_domain', `%${shopDomain}%`)

      if (productsError) {
        console.error('Error deleting published products:', productsError)
      }

      console.log(
        'Customer data redacted successfully for customer:',
        customerId
      )
    }

    return NextResponse.json(
      {
        message: 'Customer data redacted successfully',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error redacting customer data:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
