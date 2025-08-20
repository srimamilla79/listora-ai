import { NextResponse } from 'next/server'
import crypto from 'crypto'

// Verify Shopify webhook authenticity with proper HMAC
async function verifyWebhook(
  rawBody: string,
  hmacHeader: string | null,
  shopifySecret: string
): Promise<boolean> {
  if (!hmacHeader || !shopifySecret) return false

  // Calculate HMAC
  const hash = crypto
    .createHmac('sha256', shopifySecret)
    .update(rawBody, 'utf8')
    .digest('base64')

  // Timing-safe comparison
  const a = Buffer.from(hash)
  const b = Buffer.from(hmacHeader)

  if (a.length !== b.length) return false

  return crypto.timingSafeEqual(a, b)
}

export async function POST(
  request: Request,
  { params }: { params: { webhook: string[] } }
) {
  const webhookType = params.webhook.join('-')

  // Get raw body BEFORE any parsing - this is crucial
  const rawBody = await request.text()
  const hmacHeader = request.headers.get('X-Shopify-Hmac-Sha256')

  // Get secret from environment
  const shopifySecret = process.env.SHOPIFY_API_SECRET || ''

  // Verify HMAC first - MUST return 401 if invalid
  const isValid = await verifyWebhook(rawBody, hmacHeader, shopifySecret)

  if (!isValid) {
    console.log('Webhook rejected: Invalid HMAC', {
      hasHeader: !!hmacHeader,
      hasSecret: !!shopifySecret,
      webhookType,
    })
    // Return 401 for invalid HMAC - this is what Shopify tests for
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Valid webhook - process it
  try {
    const body = JSON.parse(rawBody)
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain')

    console.log(`Valid Shopify webhook: ${webhookType}`)
    console.log('Shop domain:', shopDomain)

    switch (webhookType) {
      case 'customers-data-request':
        // Customer requested their data
        console.log('Customer data request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Customer email:', body.customer?.email)
        break

      case 'customers-redact':
        // Customer wants data deleted
        console.log('Customer redact request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Customer ID to redact:', body.customer?.id)
        break

      case 'shop-redact':
        // Shop uninstalled app - delete shop data
        console.log('Shop redact request received')
        console.log('Shop domain:', body.shop_domain)
        console.log('Shop ID:', body.shop_id)
        break

      default:
        console.log('Unknown webhook type:', webhookType)
    }

    // Shopify requires 200 OK response for valid webhooks
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

    // Still return 200 for valid HMAC but processing errors
    return NextResponse.json(
      {
        success: true,
        message: 'Webhook received',
      },
      { status: 200 }
    )
  }
}

// Handle GET requests for testing
export async function GET(
  request: Request,
  { params }: { params: { webhook: string[] } }
) {
  const webhookType = params.webhook.join('-')

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
