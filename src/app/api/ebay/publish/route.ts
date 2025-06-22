// src/app/api/ebay/publish/route.ts
// eBay listing creation using Trading API

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { detectEbayCategory } from '@/lib/ebay-category-detector'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface EbayListingData {
  Title: string
  Description: string
  PrimaryCategory: { CategoryID: string }
  StartPrice: string
  Quantity: number
  ListingType: string
  ListingDuration: string
  ConditionID: string
  PictureDetails?: { PictureURL: string[] }
  ItemSpecifics?: Array<{ Name: string; Value: string[] }> // ✅ FIXED: Remove NameValueList wrapper
  ShippingDetails: {
    ShippingType: string
    ShippingServiceOptions: Array<{
      ShippingServicePriority: number
      ShippingService: string
      ShippingServiceCost: string
    }>
  }
  ReturnPolicy: {
    ReturnsAcceptedOption: string
    RefundOption: string
    ReturnsWithinOption: string
    ShippingCostPaidByOption: string
  }
  PaymentMethods: string[]
  PayPalEmailAddress?: string
  DispatchTimeMax: number
  SKU: string
}

export async function POST(request: NextRequest) {
  try {
    console.log('🛒 eBay publish route called')

    const { productContent, images, publishingOptions, userId } =
      await request.json()

    // Get eBay connection
    const { data: connection, error: connectionError } = await supabase
      .from('ebay_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        {
          error:
            'eBay account not connected. Please connect your eBay account first.',
        },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    const accessToken = await refreshTokenIfNeeded(connection)

    // Generate SKU
    const sku = publishingOptions.sku || `LISTORA-${Date.now()}`

    // Detect eBay category
    const categoryId = detectEbayCategory({
      title: productContent.product_name,
      description: productContent.content,
      features: productContent.features,
    })

    // Prepare eBay listing data
    const listingData: EbayListingData = {
      Title: truncateTitle(productContent.product_name),
      Description: formatEbayDescription(productContent),
      PrimaryCategory: { CategoryID: categoryId },
      StartPrice: publishingOptions.price.toString(),
      Quantity: publishingOptions.quantity,
      ListingType: 'FixedPriceItem',
      ListingDuration: 'GTC', // Good Till Cancelled
      ConditionID: mapConditionToEbay(publishingOptions.condition),
      SKU: sku,

      // Shipping details
      ShippingDetails: {
        ShippingType: 'Flat',
        ShippingServiceOptions: [
          {
            ShippingServicePriority: 1,
            ShippingService: 'USPSPriority',
            ShippingServiceCost: '9.99',
          },
        ],
      },

      // Return policy
      ReturnPolicy: {
        ReturnsAcceptedOption: 'ReturnsAccepted',
        RefundOption: 'MoneyBack',
        ReturnsWithinOption: 'Days_30',
        ShippingCostPaidByOption: 'Buyer',
      },

      // Payment methods
      PaymentMethods: ['PayPal'],
      DispatchTimeMax: 3,
    }

    // Add images if available
    if (images && images.length > 0) {
      listingData.PictureDetails = {
        PictureURL: images.slice(0, 12), // eBay allows max 12 images
      }
    }

    // Add item specifics based on category
    listingData.ItemSpecifics = generateItemSpecifics(
      productContent,
      categoryId
    )

    console.log('📦 Creating eBay listing:', {
      title: listingData.Title,
      category: categoryId,
      price: listingData.StartPrice,
      images: images?.length || 0,
    })

    // Create listing on eBay
    const ebayResult = await createEbayListing(listingData, accessToken)

    // Save to database
    const { data: listing, error: dbError } = await supabase
      .from('ebay_listings')
      .insert({
        user_id: userId,
        content_id: productContent.id,
        ebay_item_id: ebayResult.ItemID,
        sku: sku,
        title: listingData.Title,
        description: productContent.content,
        price: parseFloat(publishingOptions.price),
        quantity: publishingOptions.quantity,
        category_id: categoryId,
        condition_id: listingData.ConditionID,
        images: images || [],
        ebay_data: ebayResult,
        status: 'active',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (dbError) {
      console.error('❌ Database save error:', dbError)
      // Don't fail the whole operation for DB errors
    }

    // Update connection last_used_at
    await supabase
      .from('ebay_connections')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', connection.id)

    console.log('✅ eBay listing created successfully:', ebayResult.ItemID)

    return NextResponse.json({
      success: true,
      platform: 'ebay',
      data: {
        itemId: ebayResult.ItemID,
        sku: sku,
        listingUrl: `https://www.ebay.com/itm/${ebayResult.ItemID}`,
        fees: ebayResult.Fees,
        categoryId: categoryId,
      },
      message: `Successfully listed on eBay! Item ID: ${ebayResult.ItemID}`,
    })
  } catch (error: any) {
    console.error('❌ eBay publish error:', error)

    return NextResponse.json(
      {
        error: error.message || 'Failed to publish to eBay',
        platform: 'ebay',
      },
      { status: 500 }
    )
  }
}

// Helper function to create eBay listing via Trading API
async function createEbayListing(
  listingData: EbayListingData,
  accessToken: string
) {
  const tradingApiUrl =
    process.env.EBAY_ENVIRONMENT === 'sandbox'
      ? 'https://api.sandbox.ebay.com/ws/api.dll'
      : 'https://api.ebay.com/ws/api.dll'

  const xmlRequest = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${accessToken}</eBayAuthToken>
  </RequesterCredentials>
  <Item>
    <Title>${escapeXml(listingData.Title)}</Title>
    <Description><![CDATA[${listingData.Description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${listingData.PrimaryCategory.CategoryID}</CategoryID>
    </PrimaryCategory>
    <StartPrice>${listingData.StartPrice}</StartPrice>
    <Quantity>${listingData.Quantity}</Quantity>
    <ListingType>${listingData.ListingType}</ListingType>
    <ListingDuration>${listingData.ListingDuration}</ListingDuration>
    <ConditionID>${listingData.ConditionID}</ConditionID>
    <SKU>${escapeXml(listingData.SKU)}</SKU>
    ${
      listingData.PictureDetails
        ? `
    <PictureDetails>
      ${listingData.PictureDetails.PictureURL.map((url) => `<PictureURL>${url}</PictureURL>`).join('')}
    </PictureDetails>
    `
        : ''
    }
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingServicePriority>1</ShippingServicePriority>
        <ShippingService>USPSPriority</ShippingService>
        <ShippingServiceCost>9.99</ShippingServiceCost>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>ReturnsAccepted</ReturnsAcceptedOption>
      <RefundOption>MoneyBack</RefundOption>
      <ReturnsWithinOption>Days_30</ReturnsWithinOption>
      <ShippingCostPaidByOption>Buyer</ShippingCostPaidByOption>
    </ReturnPolicy>
    <PaymentMethods>PayPal</PaymentMethods>
    <DispatchTimeMax>3</DispatchTimeMax>
    ${generateItemSpecificsXml(listingData.ItemSpecifics)}
  </Item>
</AddFixedPriceItemRequest>`

  const response = await fetch(tradingApiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '967',
      'X-EBAY-API-DEV-NAME': process.env.EBAY_DEV_ID!,
      'X-EBAY-API-APP-NAME': process.env.EBAY_APP_ID!,
      'X-EBAY-API-CERT-NAME': process.env.EBAY_CERT_ID!,
      'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
      'X-EBAY-API-SITEID': '0',
    },
    body: xmlRequest,
  })

  const xmlResponse = await response.text()

  if (!response.ok) {
    throw new Error(`eBay API error: ${xmlResponse}`)
  }

  // Parse XML response (simplified - in production use xml2js)
  const itemIdMatch = xmlResponse.match(/<ItemID>(\d+)<\/ItemID>/)
  const feesMatch = xmlResponse.match(/<Fee currencyID="USD">([^<]+)<\/Fee>/g)

  if (!itemIdMatch) {
    throw new Error('Failed to extract Item ID from eBay response')
  }

  return {
    ItemID: itemIdMatch[1],
    Fees: feesMatch || [],
    RawResponse: xmlResponse,
  }
}

// Helper functions
function truncateTitle(title: string): string {
  return title.length > 80 ? title.substring(0, 77) + '...' : title
}

function formatEbayDescription(productContent: any): string {
  let html = `<div style="font-family: Arial, sans-serif;">`

  if (productContent.content) {
    html += `<h3>Description</h3><p>${productContent.content.replace(/\n/g, '<br>')}</p>`
  }

  if (productContent.features) {
    html += `<h3>Features</h3><ul>`
    const features = productContent.features
      .split('\n')
      .filter((f: string) => f.trim())
    features.forEach((feature: string) => {
      html += `<li>${feature.trim()}</li>`
    })
    html += `</ul>`
  }

  html += `</div>`
  return html
}

function mapConditionToEbay(condition: string): string {
  const conditionMap: Record<string, string> = {
    new: '1000',
    used_like_new: '1500',
    used_very_good: '4000',
    used_good: '5000',
    used_acceptable: '6000',
  }
  return conditionMap[condition] || '1000'
}

function generateItemSpecifics(
  productContent: any,
  categoryId: string
): Array<{ Name: string; Value: string[] }> {
  const specifics: Array<{ Name: string; Value: string[] }> = []

  // Add brand if available
  const brand = extractBrand(
    productContent.product_name || productContent.content
  )
  if (brand) {
    specifics.push({ Name: 'Brand', Value: [brand] })
  }

  // Add color if detectable
  const color = extractColor(
    productContent.product_name || productContent.content
  )
  if (color) {
    specifics.push({ Name: 'Color', Value: [color] })
  }

  // Add size if detectable
  const size = extractSize(
    productContent.product_name || productContent.content
  )
  if (size) {
    specifics.push({ Name: 'Size', Value: [size] })
  }

  return specifics
}

function generateItemSpecificsXml(
  specifics?: Array<{ Name: string; Value: string[] }>
): string {
  if (!specifics || specifics.length === 0) return ''

  let xml = '<ItemSpecifics>'
  specifics.forEach((specific) => {
    xml += '<NameValueList>'
    xml += `<Name>${escapeXml(specific.Name)}</Name>` // ✅ FIXED: Added <Name> tags
    specific.Value.forEach((value) => {
      xml += `<Value>${escapeXml(value)}</Value>`
    })
    xml += '</NameValueList>'
  })
  xml += '</ItemSpecifics>'

  return xml
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function extractBrand(content: string): string | null {
  const brands = [
    'Nike',
    'Apple',
    'Samsung',
    'Sony',
    'Adidas',
    'Canon',
    'Dell',
    'HP',
  ]
  const lowerContent = content.toLowerCase()

  for (const brand of brands) {
    if (lowerContent.includes(brand.toLowerCase())) {
      return brand
    }
  }

  return null
}

function extractColor(content: string): string | null {
  const colors = [
    'Black',
    'White',
    'Red',
    'Blue',
    'Green',
    'Yellow',
    'Orange',
    'Purple',
    'Pink',
    'Brown',
    'Gray',
    'Silver',
    'Gold',
  ]
  const lowerContent = content.toLowerCase()

  for (const color of colors) {
    if (lowerContent.includes(color.toLowerCase())) {
      return color
    }
  }

  return null
}

function extractSize(content: string): string | null {
  const sizePatterns = [
    /\b(XS|S|M|L|XL|XXL|XXXL)\b/i,
    /\bsize\s+(\d+)\b/i,
    /\b(\d+)\s*inch/i,
    /\b(\d+)\s*cm\b/i,
  ]

  for (const pattern of sizePatterns) {
    const match = content.match(pattern)
    if (match) {
      return match[1] || match[0]
    }
  }

  return null
}

async function refreshTokenIfNeeded(connection: any): Promise<string> {
  // Check if token expires within next hour
  const expiresAt = new Date(connection.expires_at)
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000)

  if (expiresAt <= oneHourFromNow && connection.refresh_token) {
    // Refresh the token
    const newToken = await refreshEbayToken(connection.refresh_token)

    // Update database
    await supabase
      .from('ebay_connections')
      .update({
        access_token: newToken.access_token,
        expires_at: new Date(
          Date.now() + newToken.expires_in * 1000
        ).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)

    return newToken.access_token
  }

  return connection.access_token
}

async function refreshEbayToken(refreshToken: string) {
  const tokenUrl = 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
  const credentials = Buffer.from(
    `${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`
  ).toString('base64')

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh eBay token')
  }

  return await response.json()
}
