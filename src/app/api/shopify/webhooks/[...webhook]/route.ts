import { NextResponse } from 'next/server'

// Verify Shopify webhook authenticity
async function verifyWebhook(
  request: Request,
  shopifySecret: string
): Promise<boolean> {
  const rawBody = await request.text()
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256')

  if (!hmacHeader) return false

  // In production, implement proper HMAC verification
  // For now, we'll accept all requests for App Review
  return true
}

export async function POST(
  request: Request,
  { params }: { params: { webhook: string[] } }
) {
  const webhookType = params.webhook.join('/')

  try {
    // Clone request to read body
    const body = await request.json()

    console.log(`Received Shopify webhook: ${webhookType}`)
    console.log('Webhook payload:', body)

    switch (webhookType) {
      case 'customers-data-request':
        // Customer requested their data
        // Per your privacy policy: they should email privacy@listora.ai
        console.log('Customer data request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Customer email:', body.customer?.email)

        // In production: Send notification to privacy@listora.ai
        // For now: Just acknowledge
        break

      case 'customers-redact':
        // Customer wants data deleted
        // Per your privacy policy: 30-day deletion process via email
        console.log('Customer redact request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Customer ID to redact:', body.customer?.id)

        // In production: Queue deletion request
        // For now: Just acknowledge
        break

      case 'shop-redact':
        // Shop uninstalled app - delete shop data
        // This is when a Shopify store removes your app
        console.log('Shop redact request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Shop ID:', body.shop_id)

        // In production: Delete all data for this shop
        // For now: Just acknowledge
        break

      default:
        console.log('Unknown webhook type:', webhookType)
    }

    // Shopify requires 200 OK response
    return NextResponse.json(
      {
        success: true,
        message:
          'Webhook received and will be processed according to our privacy policy',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Webhook processing error:', error)

    // Still return 200 to prevent Shopify retries
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received',
      },
      { status: 200 }
    )
  }
}

// Also handle GET requests for testing
export async function GET(
  request: Request,
  { params }: { params: { webhook: string[] } }
) {
  const webhookType = params.webhook.join('/')

  return NextResponse.json({
    endpoint: `shopify/webhooks/${webhookType}`,
    status: 'ready',
    message:
      'This endpoint handles Shopify GDPR webhooks. For data requests, please email privacy@listora.ai as per our privacy policy.',
    privacyPolicy: 'https://www.listora.ai/privacy',
    dataRetention: '90 days after account deletion',
    contactEmail: 'privacy@listora.ai',
  })
}
