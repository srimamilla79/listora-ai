// src/app/api/amazon/check-status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import zlib from 'zlib'

// SP-API Configuration
const SP_API_CONFIG = {
  endpoint: 'https://sellingpartnerapi-na.amazon.com',
  region: 'us-east-1',
  service: 'execute-api',
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

// Check feed status
async function checkFeedStatus(
  accessToken: string,
  feedId: string
): Promise<any> {
  const path = `/feeds/2021-06-30/feeds/${feedId}`
  const url = `${SP_API_CONFIG.endpoint}${path}`
  const bodyString = ''
  const date =
    new Date()
      .toISOString()
      .replace(/[:\-]|\.\d{3}/g, '')
      .slice(0, 15) + 'Z'

  const headers: Record<string, string> = {
    host: new URL(url).hostname,
    'user-agent': 'Listora-AI/1.0',
    'x-amz-access-token': accessToken,
    'x-amz-date': date,
  }

  const authorization = createAWSSignature('GET', url, headers, bodyString)
  headers['authorization'] = authorization

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(
      `Failed to check feed status: ${response.status} - ${errorData}`
    )
  }

  return await response.json()
}

// Get and decompress feed result
async function getFeedResult(
  accessToken: string,
  feedDocumentId: string
): Promise<any> {
  const path = `/feeds/2021-06-30/documents/${feedDocumentId}`
  const url = `${SP_API_CONFIG.endpoint}${path}`
  const bodyString = ''
  const date =
    new Date()
      .toISOString()
      .replace(/[:\-]|\.\d{3}/g, '')
      .slice(0, 15) + 'Z'

  const headers: Record<string, string> = {
    host: new URL(url).hostname,
    'user-agent': 'Listora-AI/1.0',
    'x-amz-access-token': accessToken,
    'x-amz-date': date,
  }

  const authorization = createAWSSignature('GET', url, headers, bodyString)
  headers['authorization'] = authorization

  const response = await fetch(url, {
    method: 'GET',
    headers: headers,
  })

  if (!response.ok) {
    return { error: `Failed to get feed document: ${response.status}` }
  }

  const docInfo = await response.json()

  // Download and decompress the report
  const reportResponse = await fetch(docInfo.url)
  const buffer = await reportResponse.arrayBuffer()

  try {
    const uint8Array = new Uint8Array(buffer)
    const decompressed = zlib.gunzipSync(uint8Array)
    const reportText = decompressed.toString('utf-8')
    return JSON.parse(reportText)
  } catch (error) {
    return { error: 'Failed to decompress report' }
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Checking recent Amazon feeds...')

    // Get access token
    const accessToken = await getAccessToken()

    // Recent feed IDs to check
    const recentFeeds = ['50003020255', '50004020255', '50005020255']
    const results = []

    for (const feedId of recentFeeds) {
      try {
        console.log(`📋 Checking feed ${feedId}...`)

        const feedStatus = await checkFeedStatus(accessToken, feedId)
        console.log(`📊 Feed ${feedId} status:`, feedStatus.processingStatus)

        let report = null
        if (feedStatus.resultFeedDocumentId) {
          report = await getFeedResult(
            accessToken,
            feedStatus.resultFeedDocumentId
          )
        }

        results.push({
          feedId,
          status: feedStatus.processingStatus,
          report: report,
          hasErrors: report?.issues ? report.issues.length > 0 : false,
          errorCount: report?.summary?.errors || 0,
          successCount: report?.summary?.messagesAccepted || 0,
        })
      } catch (error: any) {
        results.push({
          feedId,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Feed status check error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check feed status',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
