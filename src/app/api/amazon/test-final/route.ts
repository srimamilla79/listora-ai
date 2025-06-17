// src/app/api/amazon/test-final/route.ts - WORKING LISTING WITHOUT SELLER ID
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// SP-API Configuration using your merchant tokens
const SP_API_CONFIG = {
  endpoint: 'https://sellingpartnerapi-na.amazon.com',
  marketplaceId: 'ATVPDKIKX0DER', // US marketplace
  region: 'us-east-1',
  service: 'execute-api',
  // Use the merchant token from your Amazon account
  merchantId: 'A1U56TY1T094HR', // Your Americas merchant token
  clientId: process.env.AMAZON_SP_API_CLIENT_ID!,
  clientSecret: process.env.AMAZON_SP_API_CLIENT_SECRET!,
  refreshToken: process.env.AMAZON_SP_API_REFRESH_TOKEN!,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
}

// Get LWA Access Token
async function getAccessToken(): Promise<string> {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: SP_API_CONFIG.clientId,
      client_secret: SP_API_CONFIG.clientSecret,
      refresh_token: SP_API_CONFIG.refreshToken,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`LWA Error: ${data.error_description || data.error}`)
  }
  return data.access_token
}

// Create AWS Signature V4
function createAWSSignature(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: string
): string {
  const urlObj = new URL(url)
  const date = new Date()
  const dateStamp = date
    .toISOString()
    .replace(/[:\-]|\.\d{3}/g, '')
    .slice(0, 8)
  const amzDate =
    date
      .toISOString()
      .replace(/[:\-]|\.\d{3}/g, '')
      .slice(0, 15) + 'Z'

  const canonicalHeaders =
    Object.keys(headers)
      .sort()
      .map((key) => `${key.toLowerCase()}:${headers[key]}`)
      .join('\n') + '\n'

  const signedHeaders = Object.keys(headers)
    .sort()
    .map((key) => key.toLowerCase())
    .join(';')

  const payloadHash = crypto.createHash('sha256').update(body).digest('hex')

  const canonicalRequest = [
    method,
    urlObj.pathname,
    urlObj.search.slice(1),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${SP_API_CONFIG.region}/${SP_API_CONFIG.service}/aws4_request`
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')

  const getSignatureKey = (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ) => {
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + key)
      .update(dateStamp)
      .digest()
    const kRegion = crypto
      .createHmac('sha256', kDate)
      .update(regionName)
      .digest()
    const kService = crypto
      .createHmac('sha256', kRegion)
      .update(serviceName)
      .digest()
    const kSigning = crypto
      .createHmac('sha256', kService)
      .update('aws4_request')
      .digest()
    return kSigning
  }

  const signingKey = getSignatureKey(
    SP_API_CONFIG.awsSecretAccessKey,
    dateStamp,
    SP_API_CONFIG.region,
    SP_API_CONFIG.service
  )
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(stringToSign)
    .digest('hex')

  return `${algorithm} Credential=${SP_API_CONFIG.awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
}

// Try using Feeds API instead of Listings API (might be more forgiving)
async function createListingWithFeeds(accessToken: string): Promise<any> {
  console.log('🚀 Trying Feeds API approach...')

  const sku = `LISTORA-FEED-${Date.now()}`

  // Step 1: Create feed document
  const createDocumentData = {
    contentType: 'text/plain; charset=UTF-8',
  }

  const docPath = '/feeds/2021-06-30/documents'
  const docUrl = `${SP_API_CONFIG.endpoint}${docPath}`
  const docBodyString = JSON.stringify(createDocumentData)
  const date1 =
    new Date()
      .toISOString()
      .replace(/[:\-]|\.\d{3}/g, '')
      .slice(0, 15) + 'Z'

  const docHeaders: Record<string, string> = {
    host: new URL(docUrl).hostname,
    'user-agent': 'Listora-AI/1.0',
    'x-amz-access-token': accessToken,
    'x-amz-date': date1,
    'content-type': 'application/json',
  }

  const docAuthorization = createAWSSignature(
    'POST',
    docUrl,
    docHeaders,
    docBodyString
  )
  docHeaders['authorization'] = docAuthorization

  console.log('📄 Creating feed document...')

  try {
    const docResponse = await fetch(docUrl, {
      method: 'POST',
      headers: docHeaders,
      body: docBodyString,
    })

    const docResponseData = await docResponse.text()
    console.log('📄 Document Response Status:', docResponse.status)
    console.log('📄 Document Response:', docResponseData.substring(0, 300))

    if (!docResponse.ok) {
      return {
        success: false,
        step: 'create_document',
        status: docResponse.status,
        data: docResponseData,
        sku: sku,
      }
    }

    const docResult = JSON.parse(docResponseData)

    // Step 2: Upload feed content
    const feedContent = JSON.stringify({
      header: {
        sellerId: SP_API_CONFIG.merchantId,
        version: '2.0',
      },
      messages: [
        {
          messageId: 1,
          sku: sku,
          operationType: 'UPDATE',
          productType: 'PRODUCT',
          requirements: 'LISTING',
          attributes: {
            item_name: [
              {
                value: 'Listora AI Test - Premium Wireless Headphones',
                marketplace_id: SP_API_CONFIG.marketplaceId,
              },
            ],
            brand: [
              {
                value: 'Listora',
                marketplace_id: SP_API_CONFIG.marketplaceId,
              },
            ],
            product_description: [
              {
                value:
                  'High-quality wireless headphones with premium sound quality and noise cancellation. Perfect for music lovers and professionals.',
                marketplace_id: SP_API_CONFIG.marketplaceId,
              },
            ],
            list_price: [
              {
                Amount: 79.99,
                CurrencyCode: 'USD',
              },
            ],
            condition_type: [
              {
                value: 'new_new',
              },
            ],
            fulfillment_availability: [
              {
                fulfillment_channel_code: 'DEFAULT',
                quantity: 15,
              },
            ],
          },
        },
      ],
    })

    console.log('📤 Uploading feed content...')

    const uploadResponse = await fetch(docResult.url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
      },
      body: feedContent,
    })

    console.log('📤 Upload Response Status:', uploadResponse.status)

    if (!uploadResponse.ok) {
      return {
        success: false,
        step: 'upload_content',
        status: uploadResponse.status,
        sku: sku,
      }
    }

    // Step 3: Create feed
    const createFeedData = {
      feedType: 'JSON_LISTINGS_FEED',
      marketplaceIds: [SP_API_CONFIG.marketplaceId],
      inputFeedDocumentId: docResult.feedDocumentId,
    }

    const feedPath = '/feeds/2021-06-30/feeds'
    const feedUrl = `${SP_API_CONFIG.endpoint}${feedPath}`
    const feedBodyString = JSON.stringify(createFeedData)
    const date2 =
      new Date()
        .toISOString()
        .replace(/[:\-]|\.\d{3}/g, '')
        .slice(0, 15) + 'Z'

    const feedHeaders: Record<string, string> = {
      host: new URL(feedUrl).hostname,
      'user-agent': 'Listora-AI/1.0',
      'x-amz-access-token': accessToken,
      'x-amz-date': date2,
      'content-type': 'application/json',
    }

    const feedAuthorization = createAWSSignature(
      'POST',
      feedUrl,
      feedHeaders,
      feedBodyString
    )
    feedHeaders['authorization'] = feedAuthorization

    console.log('🏭 Creating feed...')

    const feedResponse = await fetch(feedUrl, {
      method: 'POST',
      headers: feedHeaders,
      body: feedBodyString,
    })

    const feedResponseData = await feedResponse.text()
    console.log('🏭 Feed Response Status:', feedResponse.status)
    console.log('🏭 Feed Response:', feedResponseData)

    return {
      success: feedResponse.ok,
      step: 'create_feed',
      status: feedResponse.status,
      data: feedResponseData,
      sku: sku,
      method: 'FEEDS_API',
    }
  } catch (error: any) {
    console.error('❌ Feeds API Error:', error)
    return {
      success: false,
      error: error?.message || 'Unknown error',
      sku: sku,
      method: 'FEEDS_API',
    }
  }
}

// API Route Handler
export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Amazon Feeds API approach...')

    // Validate environment variables
    const missingVars = []
    if (!SP_API_CONFIG.clientId) missingVars.push('AMAZON_SP_API_CLIENT_ID')
    if (!SP_API_CONFIG.clientSecret)
      missingVars.push('AMAZON_SP_API_CLIENT_SECRET')
    if (!SP_API_CONFIG.refreshToken)
      missingVars.push('AMAZON_SP_API_REFRESH_TOKEN')
    if (!SP_API_CONFIG.awsAccessKeyId) missingVars.push('AWS_ACCESS_KEY_ID')
    if (!SP_API_CONFIG.awsSecretAccessKey)
      missingVars.push('AWS_SECRET_ACCESS_KEY')

    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          error: 'Missing required environment variables',
          missing: missingVars,
        },
        { status: 500 }
      )
    }

    // Step 1: Get access token
    const accessToken = await getAccessToken()
    console.log('✅ Access token obtained')

    // Step 2: Try Feeds API approach
    const feedResult = await createListingWithFeeds(accessToken)

    return NextResponse.json({
      success: feedResult.success,
      message: feedResult.success
        ? `🎉 SUCCESS! Product submitted via Feeds API! SKU: ${feedResult.sku}`
        : '⚠️ Feeds API submission failed - check details below',
      test_results: {
        access_token: '✅ Obtained successfully',
        feeds_api: feedResult,
      },
      instructions: feedResult.success
        ? 'Feed submitted! Check your Amazon Seller Central → Manage Inventory in a few minutes for the new product.'
        : 'Review the error details above. Feeds API might have different requirements.',
    })
  } catch (error: any) {
    console.error('❌ Feeds API test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to test feeds API',
        details: error?.stack || 'No details available',
      },
      { status: 500 }
    )
  }
}
