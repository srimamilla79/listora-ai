import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Log the data request for compliance
    console.log('Shopify customer data request received:', {
      shop_id: body.shop_id,
      shop_domain: body.shop_domain,
      customer: body.customer
        ? { id: body.customer.id, email: body.customer.email }
        : null,
      data_request: body.data_request,
    })

    // In production, you would:
    // 1. Collect all customer data from your database
    // 2. Format it according to GDPR requirements
    // 3. Send it to the customer within 30 days

    return NextResponse.json(
      {
        message:
          'Customer data request received and will be processed within 30 days',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing customer data request:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
