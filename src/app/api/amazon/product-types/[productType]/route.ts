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

// Get LWA access token - USING CORRECT ENVIRONMENT VARIABLES
async function getAccessToken(): Promise<string> {
  const response = await fetch('https://api.amazon.com/auth/o2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN!, // ✅ Correct env var
      client_id: process.env.AMAZON_SP_API_CLIENT_ID!, // ✅ Correct env var
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET!, // ✅ Correct env var
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LWA Error: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Make signed SP-API request - EXACT COPY FROM WORKING ROUTE
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

// New function to fetch detailed schema from S3
async function fetchDetailedSchema(s3Url: string): Promise<any> {
  try {
    console.log(
      '📥 Fetching detailed schema from S3:',
      s3Url.substring(0, 100) + '...'
    )

    const response = await fetch(s3Url)
    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.statusText}`)
    }

    const schema = await response.json()
    console.log(
      '✅ Successfully fetched detailed schema with',
      Object.keys(schema.properties || {}).length,
      'properties'
    )
    return schema
  } catch (error) {
    console.error('❌ Error fetching detailed schema:', error)
    return null
  }
}

// Enhanced function to analyze schema requirements
function analyzeSchemaRequirements(schema: any): any {
  const analysis = {
    requiredAttributes: [] as string[],
    recommendedAttributes: [] as string[],
    conditionalAttributes: [] as string[],
    totalAttributes: 0,
    complexity: 'Simple',
    attributeDetails: {} as any,
  }

  if (!schema || !schema.properties) {
    return analysis
  }

  // Analyze each property in the schema
  Object.entries(schema.properties).forEach(([key, value]: [string, any]) => {
    analysis.totalAttributes++

    // Store detailed info about each attribute
    analysis.attributeDetails[key] = {
      type: value.type || 'unknown',
      description: value.description || '',
      required: value.required || false,
      enum: value.enum || null,
      minItems: value.minItems || 0,
      maxItems: value.maxItems || null,
      examples: value.examples || [],
    }

    // Categorize attributes based on Amazon's schema structure
    if (value.required === true || value.minItems > 0) {
      analysis.requiredAttributes.push(key)
    } else if (
      value.description?.toLowerCase().includes('recommend') ||
      value.priority === 'high' ||
      value.importance === 'high'
    ) {
      analysis.recommendedAttributes.push(key)
    } else if (
      value.dependencies ||
      value.conditional ||
      value.allOf ||
      value.anyOf
    ) {
      analysis.conditionalAttributes.push(key)
    }
  })

  // Determine complexity based on required attributes count
  if (analysis.requiredAttributes.length > 15) {
    analysis.complexity = 'Complex'
  } else if (analysis.requiredAttributes.length > 8) {
    analysis.complexity = 'Moderate'
  }

  return analysis
}

export async function GET(
  request: NextRequest,
  { params }: { params: { productType: string } }
) {
  try {
    const { productType } = params
    const { searchParams } = new URL(request.url)
    const includeDetailedSchema = searchParams.get('detailed') === 'true'

    console.log('📋 Fetching schema for product type:', productType)
    console.log('🔍 Include detailed schema:', includeDetailedSchema)

    // Build API path with correct environment variable
    const apiPath = `/definitions/2020-09-01/productTypes/${productType}?marketplaceIds=${process.env.AMAZON_MARKETPLACE_ID}&requirements=LISTING&locale=en_US`

    console.log('📡 Calling Amazon SP-API:', apiPath)

    // Get basic schema from Amazon using working authentication
    const amazonResponse = await makeSignedSPAPIRequest('GET', apiPath)

    console.log('✅ Amazon API Response received for', productType)

    let detailedSchema = null
    let analysis = {
      requiredAttributes: [],
      recommendedAttributes: [],
      conditionalAttributes: [],
      totalAttributes: 0,
      complexity: 'Simple',
      attributeDetails: {},
    }

    // If detailed schema requested, fetch from S3
    if (includeDetailedSchema && amazonResponse.schema?.link?.resource) {
      console.log('🔗 Fetching detailed schema from S3...')
      detailedSchema = await fetchDetailedSchema(
        amazonResponse.schema.link.resource
      )
      if (detailedSchema) {
        analysis = analyzeSchemaRequirements(detailedSchema)
        console.log('📊 Schema analysis complete:', {
          required: analysis.requiredAttributes.length,
          recommended: analysis.recommendedAttributes.length,
          complexity: analysis.complexity,
        })
      }
    }

    // Count basic attributes from property groups
    let basicAttributeCount = 0
    const propertyGroups = Object.keys(amazonResponse.propertyGroups || {})
    if (amazonResponse.propertyGroups) {
      Object.values(amazonResponse.propertyGroups).forEach((group: any) => {
        if (group.propertyNames) {
          basicAttributeCount += group.propertyNames.length
        }
      })
    }

    const response = {
      success: true,
      source: 'Amazon SP-API Product Type Definitions',
      productType,
      timestamp: new Date().toISOString(),
      schema: amazonResponse,
      detailedSchema: detailedSchema,
      analysis: {
        ...analysis,
        basicAttributeCount,
        propertyGroups: propertyGroups,
        s3SchemaUrl: amazonResponse.schema?.link?.resource,
        hasDetailedSchema: !!detailedSchema,
      },
      apiPath,
    }

    console.log('✅ Returning enhanced schema response for', productType)
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ Error fetching product type schema:', error)

    // Enhanced fallback with known working attributes
    const fallbackAttributes = {
      WATCH: {
        required: [
          'item_name',
          'brand',
          'condition_type',
          'list_price',
          'target_gender',
          'calendar_type',
          'item_shape',
        ],
        recommended: [
          'product_description',
          'bullet_point',
          'color',
          'material',
          'warranty_type',
        ],
      },
      SHOES: {
        required: [
          'item_name',
          'brand',
          'condition_type',
          'list_price',
          'footwear_size',
          'target_gender',
          'sole_material',
        ],
        recommended: [
          'product_description',
          'bullet_point',
          'color',
          'material',
          'heel',
          'closure',
        ],
      },
      AIR_FRYER: {
        required: [
          'item_name',
          'brand',
          'condition_type',
          'list_price',
          'capacity',
          'wattage',
        ],
        recommended: [
          'product_description',
          'bullet_point',
          'color',
          'special_feature',
        ],
      },
      CLOTHING: {
        required: [
          'item_name',
          'brand',
          'condition_type',
          'list_price',
          'size',
          'target_gender',
        ],
        recommended: [
          'product_description',
          'bullet_point',
          'color',
          'material',
          'style',
        ],
      },
      ELECTRONICS: {
        required: [
          'item_name',
          'brand',
          'condition_type',
          'list_price',
          'model_name',
        ],
        recommended: [
          'product_description',
          'bullet_point',
          'color',
          'special_feature',
        ],
      },
    }

    const productTypeKey = params.productType as keyof typeof fallbackAttributes
    const fallback =
      fallbackAttributes[productTypeKey] || fallbackAttributes.WATCH

    return NextResponse.json({
      success: false,
      source: 'Fallback (Amazon API failed)',
      productType: params.productType,
      error: error.message,
      fallbackAttributes: fallback,
      analysis: {
        requiredAttributes: fallback.required,
        recommendedAttributes: fallback.recommended,
        totalAttributes: fallback.required.length + fallback.recommended.length,
        complexity: fallback.required.length > 8 ? 'Moderate' : 'Simple',
      },
      timestamp: new Date().toISOString(),
    })
  }
}
