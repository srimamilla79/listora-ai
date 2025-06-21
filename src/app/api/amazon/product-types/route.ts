import { NextRequest, NextResponse } from 'next/server'

// AWS signing function
async function sign(key: string, msg: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  return await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(msg))
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string
): Promise<ArrayBuffer> {
  return sign('AWS4' + key, dateStamp)
    .then((kDate) =>
      sign(
        Array.from(new Uint8Array(kDate))
          .map((b) => String.fromCharCode(b))
          .join(''),
        regionName
      )
    )
    .then((kRegion) =>
      sign(
        Array.from(new Uint8Array(kRegion))
          .map((b) => String.fromCharCode(b))
          .join(''),
        serviceName
      )
    )
    .then((kService) =>
      sign(
        Array.from(new Uint8Array(kService))
          .map((b) => String.fromCharCode(b))
          .join(''),
        'aws4_request'
      )
    )
}

// Get LWA access token
async function getAccessToken(): Promise<string> {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN!,
      client_id: process.env.AMAZON_SP_API_CLIENT_ID!,
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET!,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LWA Error: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Make signed SP-API request
async function makeSignedSPAPIRequest(
  method: string,
  path: string,
  body?: any
): Promise<any> {
  const accessToken = await getAccessToken()

  // AWS Signature V4
  const region = process.env.AMAZON_REGION || 'us-east-1'
  const service = 'execute-api'
  const host = 'sellingpartnerapi-na.amazon.com'

  const now = new Date()
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '')
  const dateStamp = amzDate.substr(0, 8)

  const canonicalUri = path
  const canonicalQuerystring = ''
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`
  const signedHeaders = 'host;x-amz-date'

  const payloadHash = body
    ? Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(JSON.stringify(body))
          )
        )
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

  const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`

  const algorithm = 'AWS4-HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(canonicalRequest)
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`

  const signingKey = await getSignatureKey(
    process.env.AWS_SECRET_ACCESS_KEY!,
    dateStamp,
    region,
    service
  )
  const signature = Array.from(
    new Uint8Array(
      await sign(
        Array.from(new Uint8Array(signingKey))
          .map((b) => String.fromCharCode(b))
          .join(''),
        stringToSign
      )
    )
  )
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const authorizationHeader = `${algorithm} Credential=${process.env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  // Make the request
  const headers: any = {
    Authorization: authorizationHeader,
    'x-amz-access-token': accessToken,
    'x-amz-date': amzDate,
    'Content-Type': 'application/json',
  }

  const requestOptions: any = {
    method,
    headers,
  }

  if (body) {
    requestOptions.body = JSON.stringify(body)
  }

  const response = await fetch(`https://${host}${path}`, requestOptions)

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SP-API Error: ${response.status} - ${errorText}`)
  }

  return await response.json()
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching real Amazon product types from SP-API...')

    const { searchParams } = new URL(request.url)
    const keywords = searchParams.get('keywords')
    const limit = searchParams.get('limit') || '50' // Limit results for performance

    // Build the Amazon API call
    let apiPath = `/definitions/2020-09-01/productTypes?marketplaceIds=${process.env.AMAZON_MARKETPLACE_ID}`
    if (keywords) {
      apiPath += `&keywords=${encodeURIComponent(keywords)}`
    }

    console.log('📡 Calling Amazon SP-API:', apiPath)

    // Call Amazon's real Product Type Definitions API
    const amazonResponse = await makeSignedSPAPIRequest('GET', apiPath)

    console.log('✅ Amazon API Response received')
    console.log(
      '📊 Product types found:',
      amazonResponse.productTypes?.length || 0
    )

    // Process and format the response
    const productTypes = amazonResponse.productTypes || []
    const limitedResults = productTypes.slice(0, parseInt(limit))

    // Add display names and organize by category
    const enhancedProductTypes = limitedResults.map((type: any) => ({
      name: type.name,
      displayName: type.displayName || formatDisplayName(type.name),
      description: type.description || '',
      category: categorizeProductType(type.name),
      amazonData: type,
    }))

    return NextResponse.json({
      success: true,
      source: 'Amazon SP-API Product Type Definitions',
      total: productTypes.length,
      returned: enhancedProductTypes.length,
      timestamp: new Date().toISOString(),
      productTypes: enhancedProductTypes,
      categories: groupByCategory(enhancedProductTypes),
      apiPath, // For debugging
    })
  } catch (error: any) {
    console.error('❌ Error calling Amazon Product Types API:', error)

    // Enhanced fallback with more product types
    const fallbackProductTypes = [
      { name: 'WATCH', displayName: 'Watches', category: 'Fashion' },
      { name: 'SHOES', displayName: 'Shoes', category: 'Fashion' },
      { name: 'CLOTHING', displayName: 'Clothing', category: 'Fashion' },
      {
        name: 'ELECTRONICS',
        displayName: 'Electronics',
        category: 'Electronics',
      },
      {
        name: 'HOME_AND_GARDEN',
        displayName: 'Home & Garden',
        category: 'Home',
      },
      { name: 'BEAUTY', displayName: 'Beauty', category: 'Beauty' },
      { name: 'AUTOMOTIVE', displayName: 'Automotive', category: 'Automotive' },
      { name: 'BOOKS', displayName: 'Books', category: 'Media' },
      { name: 'SPORTS', displayName: 'Sports', category: 'Sports' },
      { name: 'TOYS_AND_GAMES', displayName: 'Toys & Games', category: 'Toys' },
    ]

    return NextResponse.json({
      success: true,
      source: 'Fallback (Amazon API unavailable)',
      error: error.message,
      total: fallbackProductTypes.length,
      timestamp: new Date().toISOString(),
      productTypes: fallbackProductTypes,
      categories: groupByCategory(fallbackProductTypes),
      note: 'Using fallback data - Amazon API call failed',
    })
  }
}

// Helper functions
function formatDisplayName(name: string): string {
  return name
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function categorizeProductType(name: string): string {
  const categories = {
    Fashion: ['WATCH', 'SHOES', 'CLOTHING', 'JEWELRY', 'HANDBAG'],
    Electronics: ['ELECTRONICS', 'COMPUTER', 'PHONE', 'TABLET'],
    Home: ['HOME_AND_GARDEN', 'FURNITURE', 'KITCHEN'],
    Beauty: ['BEAUTY', 'COSMETICS', 'HEALTH'],
    Sports: ['SPORTS', 'FITNESS', 'OUTDOOR'],
    Automotive: ['AUTOMOTIVE', 'MOTORCYCLE', 'BOAT'],
    Media: ['BOOKS', 'MUSIC', 'VIDEO'],
    Toys: ['TOYS_AND_GAMES', 'BABY'],
  }

  for (const [category, types] of Object.entries(categories)) {
    if (types.some((type) => name.includes(type))) {
      return category
    }
  }

  return 'Other'
}

function groupByCategory(productTypes: any[]) {
  return productTypes.reduce((acc, type) => {
    const category = type.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(type)
    return acc
  }, {})
}
