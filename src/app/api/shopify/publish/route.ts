// src/app/api/shopify/publish/route.ts
// Listora → Shopify (GraphQL, 2025-07)
// Universal publish (single + multi-variant) with absolute inventory & multi-location safety.
// Enriched with AI Vision (brand/color/material), per-variant image mapping, premium HTML, SEO, tags, and a real-time quality score.

import { NextRequest, NextResponse } from 'next/server'
import { createServerSideClient } from '@/lib/supabase'

const SHOPIFY_API_VERSION = '2025-07' // must be 2024-07 or later; using recent stable

/* -------------------------------- Types -------------------------------- */

type GID = string

type VisionMeta = {
  brand?: string
  colors?: string[]
  material?: string
  pattern?: string
  dimensions?: string
  gender?: string
  category?: string
  keywords?: string[]
}

type ImageInfo = { id: string; url: string; alt?: string }
type QualityReport = { score: number; suggestions: string[] }

type SectionBundle = {
  title: string
  description: string
  keyBenefits: string[]
  additionalFeatures: string[]
  specifications: string[]
  vendor?: string
  tags?: string[] // Shopify GraphQL expects string[]
}

/* ------------------------------ Small utils ------------------------------ */

function parseShopifyId(gid: string | null | undefined): string | null {
  if (!gid) return null
  const parts = gid.split('/')
  return parts[parts.length - 1] || null
}

function capitalize(s: string) {
  return (s || '').charAt(0).toUpperCase() + (s || '').slice(1)
}

// Build GraphQL media inputs from external URLs
function prepareGraphQLMediaInputs(imageUrls: string[] = [], title = '') {
  return imageUrls
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u))
    .map((src) => ({
      originalSource: src,
      alt: `${title}`.slice(0, 200) || 'Product image',
      mediaContentType: 'IMAGE' as const,
    }))
}

/* ------------------------------ AI Vision enrichment ------------------------------ */

function getVisionMeta(merged: any): VisionMeta {
  const raw =
    merged?.ai_vision ||
    merged?.meta?.ai_vision ||
    merged?.generated_content_extras?.ai_vision ||
    {}

  const colors = Array.isArray(raw.colors)
    ? raw.colors.map((c: any) => String(c).toLowerCase())
    : typeof raw.color === 'string'
      ? [raw.color.toLowerCase()]
      : []

  return {
    brand: raw.brand || raw.maker || '',
    colors,
    material: raw.material || '',
    pattern: raw.pattern || '',
    dimensions: raw.dimensions || raw.size || '',
    gender: raw.gender || '',
    category: raw.category || '',
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [],
  }
}

function enrichWithVision(sections: SectionBundle, v: VisionMeta) {
  if (!sections || !v) return sections

  if (v.brand && !sections.vendor) sections.vendor = v.brand

  const specs = new Set<string>(sections.specifications ?? [])
  if (v.material) specs.add(`Material: ${capitalize(v.material)}`)
  if (v.dimensions) specs.add(`Dimensions: ${v.dimensions}`)
  if (v.gender) specs.add(`Fit: ${capitalize(v.gender)}`)
  if (v.category) specs.add(`Category: ${capitalize(v.category)}`)
  if (v.colors?.length)
    specs.add(`Color: ${v.colors.map(capitalize).join(', ')}`)
  sections.specifications = Array.from(specs).slice(0, 8)

  const tagSet = new Set<string>(
    Array.isArray(sections.tags) ? sections.tags : []
  )
  v.keywords?.slice(0, 6).forEach((k) => tagSet.add(capitalize(k)))
  sections.tags = Array.from(tagSet)

  return sections
}

/* ------------------------------ Variant image mapping ------------------------------ */

function pickImageIdForVariant(
  variant: { optionValues?: string[] },
  optionNames: string[] = [],
  images: ImageInfo[] = [],
  vision: VisionMeta = {}
): string | null {
  if (!images.length || !variant?.optionValues?.length) return null
  const pairs = optionNames.map((name, idx) => [
    String(name).toLowerCase(),
    String(variant.optionValues![idx] || '').toLowerCase(),
  ]) as [string, string][]

  const colorPair = pairs.find(([name]) => name === 'color')
  const color = colorPair?.[1] || vision.colors?.[0] || ''
  if (!color) return null

  const match = images.find((img) => {
    const hay = `${(img.alt || '').toLowerCase()} ${img.url.toLowerCase()}`
    return hay.includes(color)
  })

  return match?.id || null
}

/* ------------------------------ Listing Quality Score ------------------------------ */

function scoreListingForShopify(args: {
  title: string
  descriptionHtml: string
  keyBenefitsCount: number
  featuresCount: number
  specsCount: number
  imageCount: number
  seoTitle?: string
  seoDescription?: string
  hasTags?: boolean
  hasVendor?: boolean
  hasProductType?: boolean
  hasVariants?: boolean
  perVariantImages?: boolean
  hasSku?: boolean
  priceSet?: boolean
  inventorySet?: boolean
}): QualityReport {
  let score = 0
  const s: string[] = []

  const titleLen = (args.title || '').length
  if (titleLen >= 40 && titleLen <= 70) score += 12
  else if (titleLen >= 25 && titleLen <= 90) score += 8
  else s.push('Adjust title to ~40–70 characters for best CTR')

  if (stripHtml(args.descriptionHtml || '').length >= 120) score += 10
  else s.push('Add a clear 2–3 sentence intro paragraph')

  if (args.keyBenefitsCount >= 3)
    score += Math.min(12, args.keyBenefitsCount * 3)
  else s.push('Add at least 3 key benefits')

  if (args.featuresCount >= 2) score += Math.min(10, args.featuresCount * 2)
  else s.push('List more features (materials, construction, use-cases)')

  if (args.specsCount >= 2) score += Math.min(10, args.specsCount * 2)
  else s.push('Add 2+ specs (material, color, size)')

  if (args.imageCount >= 3) score += 12
  else if (args.imageCount >= 1) score += 6
  else s.push('Upload 3+ images')

  if ((args.seoTitle || '').length) score += 6
  else s.push('Add SEO title (≤70 chars)')
  if ((args.seoDescription || '').length) score += 6
  else s.push('Add SEO description (≤160 chars)')

  if (args.hasTags) score += 4
  else s.push('Add a few tags/keywords')
  if (args.hasVendor) score += 3
  if (args.hasProductType) score += 3

  if (args.hasVariants) score += 6
  if (args.perVariantImages) score += 4

  if (args.hasSku) score += 4
  if (args.priceSet) score += 4
  if (args.inventorySet) score += 4

  score = Math.max(0, Math.min(100, score))
  return { score, suggestions: s }
}

/* ------------------------------------ Main handler ------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const {
      productContent,
      images = [],
      publishingOptions = {},
      userId,
      publishNow,
      shopifyLocationId, // optional override (GID)
    } = await request.json()

    const supabase = await createServerSideClient()

    // 1) Latest content
    const { data: latestContent, error: fetchError } = await supabase
      .from('product_contents')
      .select('*')
      .eq('id', productContent.id)
      .eq('user_id', userId)
      .single()

    if (fetchError || !latestContent) {
      return NextResponse.json(
        { error: 'Could not fetch latest product content' },
        { status: 500 }
      )
    }

    const mergedProductContent = { ...productContent, ...latestContent }

    // 2) Shopify connection
    const { data: connection, error: connectionError } = await supabase
      .from('platform_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'shopify')
      .eq('status', 'connected')
      .single()

    if (connectionError || !connection) {
      return NextResponse.json(
        {
          error:
            'Shopify store not connected. Please connect your Shopify store first.',
        },
        { status: 400 }
      )
    }

    const shopDomain: string = connection.platform_store_info?.shop_domain
    const accessToken: string = connection.access_token
    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { error: 'Missing Shopify connection details.' },
        { status: 400 }
      )
    }

    // 3) Extract + enrich content
    const sections: SectionBundle = extractUniversalContent(
      mergedProductContent.generated_content,
      mergedProductContent.product_name
    )
    const vision = getVisionMeta(mergedProductContent)
    enrichWithVision(sections, vision)

    // 4) Build inputs (premium by default)
    const statusInput = (
      publishingOptions.status || (publishNow ? 'active' : 'draft')
    )
      .toString()
      .toUpperCase()
    const productStatus: 'ACTIVE' | 'DRAFT' =
      statusInput === 'ACTIVE' ? 'ACTIVE' : 'DRAFT'

    const seoTitle = (
      sections.title ||
      mergedProductContent.product_name ||
      'Premium Product'
    ).slice(0, 70)
    const seoDescription = stripHtml(sections.description || '').slice(0, 160)

    const productCreateInput: any = {
      title:
        sections.title ||
        mergedProductContent.product_name ||
        'Premium Product',
      descriptionHtml: formatShopifyDescription(sections),
      vendor:
        sections.vendor ||
        extractBrand(sections.title + ' ' + sections.description) ||
        connection.platform_store_info?.shop_name ||
        'Premium Brand',
      productType: detectProductType(
        sections.title + ' ' + sections.description
      ),
      status: productStatus,
      tags:
        Array.isArray(sections.tags) && sections.tags.length
          ? sections.tags
          : generateTags(sections),
      seo: { title: seoTitle, description: seoDescription },
      productOptions:
        Array.isArray(publishingOptions.options) &&
        publishingOptions.options.length
          ? publishingOptions.options.map((name: string) => ({ name }))
          : undefined,
    }

    // 5) Create product (+ images by URL)
    const mediaInputs = prepareGraphQLMediaInputs(images, sections.title)
    const MUT_CREATE = `
      mutation CreateProduct($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
        productCreate(product: $product, media: $media) {
          product {
            id
            handle
            status
            title
            variants(first: 25) {
              nodes { id title inventoryItem { id tracked } }
            }
          }
          userErrors { field message }
        }
      }
    `
    const createJson = await shopifyGraphQL(
      shopDomain,
      accessToken,
      MUT_CREATE,
      { product: productCreateInput, media: mediaInputs }
    )
    const createPayload = createJson?.data?.productCreate
    if (!createPayload || createPayload.userErrors?.length) {
      return NextResponse.json(
        {
          error:
            (createPayload?.userErrors || [])
              .map((e: any) => e.message)
              .join(', ') || 'Shopify productCreate failed',
          details: createJson,
        },
        { status: 500 }
      )
    }

    const product = createPayload.product
    const productGid: GID = product.id
    const handle: string = product.handle
    const defaultVariant = product.variants?.nodes?.[0]
    const defaultVariantGid: GID | undefined = defaultVariant?.id
    const defaultInventoryItemGid: GID | undefined =
      defaultVariant?.inventoryItem?.id

    // 5b) Fetch created image IDs from Shopify (for per-variant mapping)
    const Q_PRODUCT_IMAGES = `
      query ProductImages($id: ID!) {
        product(id: $id) {
          images(first: 100) {
            edges { node { id originalSrc altText } }
          }
        }
      }
    `
    const imgJson = await shopifyGraphQL(
      shopDomain,
      accessToken,
      Q_PRODUCT_IMAGES,
      { id: productGid }
    )
    const productImages: ImageInfo[] = (
      imgJson?.data?.product?.images?.edges || []
    ).map((e: any) => ({
      id: e.node.id,
      url: e.node.originalSrc || '',
      alt: e.node.altText || '',
    }))

    // 6) Multi-variant vs single-variant
    const isMultiVariant =
      Array.isArray(publishingOptions?.variants) &&
      publishingOptions.variants.length > 0 &&
      Array.isArray(publishingOptions?.options) &&
      publishingOptions.options.length > 0

    let variantGids: GID[] = []
    let inventoryItemGids: GID[] = []
    let representativePrice = Number(publishingOptions.price ?? 0)
    let representativeQty = Number(publishingOptions.quantity ?? 0)
    let representativeSku = publishingOptions.sku || null

    if (isMultiVariant) {
      // Create all variants
      const variantsInput = publishingOptions.variants.map((v: any) => ({
        options: Array.isArray(v.optionValues) ? v.optionValues : [],
        price: Number(v.price ?? 0),
        inventoryItem: {
          sku: v.sku || undefined,
          tracked: true,
        },
      }))

      const MUT_VARIANTS_CREATE = `
        mutation VariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkCreate(productId: $productId, variants: $variants) {
            productVariants { id title image { id } inventoryItem { id sku tracked } }
            userErrors { field message }
          }
        }
      `
      const createVarJson = await shopifyGraphQL(
        shopDomain,
        accessToken,
        MUT_VARIANTS_CREATE,
        { productId: productGid, variants: variantsInput }
      )
      const cvp = createVarJson?.data?.productVariantsBulkCreate
      if (!cvp || cvp.userErrors?.length) {
        return NextResponse.json(
          {
            error:
              (cvp?.userErrors || []).map((e: any) => e.message).join(', ') ||
              'productVariantsBulkCreate failed',
            details: createVarJson,
          },
          { status: 500 }
        )
      }

      const createdVariants = cvp.productVariants || []
      variantGids = createdVariants.map((x: any) => x.id)
      inventoryItemGids = createdVariants
        .map((x: any) => x.inventoryItem?.id)
        .filter(Boolean)

      // Delete default placeholder variant
      if (defaultVariantGid) {
        const MUT_VARIANT_DELETE = `
          mutation VariantDelete($id: ID!) {
            productVariantDelete(id: $id) {
              deletedProductVariantId
              userErrors { field message }
            }
          }
        `
        await shopifyGraphQL(shopDomain, accessToken, MUT_VARIANT_DELETE, {
          id: defaultVariantGid,
        })
      }

      // Per-variant image map (by Color if available)
      if (variantGids.length && productImages.length) {
        const optionNames = publishingOptions.options || []
        const updates: any[] = []
        for (let i = 0; i < variantGids.length; i++) {
          const id = variantGids[i]
          const payloadVariant = publishingOptions.variants?.[i]
          const imageId = pickImageIdForVariant(
            payloadVariant,
            optionNames,
            productImages,
            vision
          )
          if (imageId) updates.push({ id, imageId })
        }
        if (updates.length) {
          const MUT_VARIANTS_IMG = `
            mutation VariantsImageMap($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
              productVariantsBulkUpdate(productId: $productId, variants: $variants) {
                userErrors { field message }
              }
            }
          `
          await shopifyGraphQL(shopDomain, accessToken, MUT_VARIANTS_IMG, {
            productId: productGid,
            variants: updates,
          })
        }
      }

      // Representative fields for DB
      if (publishingOptions.variants[0]) {
        representativePrice = Number(publishingOptions.variants[0].price ?? 0)
        representativeQty = Number(publishingOptions.variants[0].quantity ?? 0)
        representativeSku = publishingOptions.variants[0].sku || null
      }
    } else {
      // Single-variant: set price/SKU/tracking + image
      const MUT_VARIANTS_UPDATE = `
        mutation VariantUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
          productVariantsBulkUpdate(productId: $productId, variants: $variants) {
            productVariants { id image { id } inventoryItem { id sku tracked } }
            userErrors { field message }
          }
        }
      `
      const vPrice = Number(publishingOptions.price ?? 0)
      const vSKU = publishingOptions.sku || undefined

      const updJson = await shopifyGraphQL(
        shopDomain,
        accessToken,
        MUT_VARIANTS_UPDATE,
        {
          productId: productGid,
          variants: [
            {
              id: defaultVariantGid,
              price: vPrice,
              inventoryItem: {
                sku: vSKU,
                tracked: true,
              },
              imageId: productImages?.[0]?.id || undefined, // attach first image if present
            },
          ],
        }
      )
      const up = updJson?.data?.productVariantsBulkUpdate
      if (!up || up.userErrors?.length) {
        return NextResponse.json(
          {
            error:
              (up?.userErrors || []).map((e: any) => e.message).join(', ') ||
              'productVariantsBulkUpdate failed',
            details: updJson,
          },
          { status: 500 }
        )
      }

      variantGids = [defaultVariantGid].filter(Boolean) as GID[]
      inventoryItemGids = [defaultInventoryItemGid].filter(Boolean) as GID[]
    }

    // Ensure inventory tracked:true for all items (prevents qty=0 symptoms)
    if (inventoryItemGids.length) {
      const MUT_INV_TRACK = `
        mutation SetTracked($id: ID!, $input: InventoryItemInput!) {
          inventoryItemUpdate(id: $id, input: $input) {
            inventoryItem { id tracked }
            userErrors { field message }
          }
        }
      `
      await Promise.all(
        inventoryItemGids.map((invId) =>
          shopifyGraphQL(shopDomain, accessToken, MUT_INV_TRACK, {
            id: invId,
            input: { tracked: true },
          })
        )
      )
    }

    // 7) Location selection — prefer caller → stored → first available
    let locationId: GID | null = null

    if (shopifyLocationId && typeof shopifyLocationId === 'string') {
      locationId = shopifyLocationId
    }

    const platformData = (connection.platform_data || {}) as Record<string, any>
    if (!locationId && typeof platformData.preferred_location_id === 'string') {
      locationId = platformData.preferred_location_id as GID
    }

    if (!locationId) {
      const Q_LOCATIONS = `
        query Locations { locations(first: 25) { edges { node { id name } } } }
      `
      const locJson = await shopifyGraphQL(
        shopDomain,
        accessToken,
        Q_LOCATIONS,
        {}
      )
      const firstLoc: GID | undefined =
        locJson?.data?.locations?.edges?.[0]?.node?.id
      if (firstLoc) {
        locationId = firstLoc
        const newPlatformData = {
          ...(platformData || {}),
          preferred_location_id: firstLoc,
        }
        await supabase
          .from('platform_connections')
          .update({
            platform_data: newPlatformData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', connection.id)
      }
    }

    /* ---------- 8) Inventory: ACTIVATE level at location, then SET absolute qty ---------- */
    let inventorySetDebug: any = null

    if (locationId) {
      // 8.1) Ensure the inventory level exists/active at this location for each item
      await Promise.all(
        inventoryItemGids.map((invId) =>
          activateInventoryItem(
            shopDomain,
            accessToken,
            invId,
            locationId as GID
          )
        )
      )

      // 8.2) SET absolute quantities
      if (!isMultiVariant && inventoryItemGids[0] != null) {
        const qty = Number(publishingOptions.quantity ?? 0)
        inventorySetDebug = await setInventoryAbsolute(
          shopDomain,
          accessToken,
          {
            locationId: locationId as GID,
            items: [{ inventoryItemId: inventoryItemGids[0], quantity: qty }],
          }
        )
      }

      if (isMultiVariant && Array.isArray(publishingOptions.variants)) {
        const items = []
        for (let i = 0; i < inventoryItemGids.length; i++) {
          const invId = inventoryItemGids[i]
          const inVar = publishingOptions.variants[i]
          if (invId && inVar) {
            items.push({
              inventoryItemId: invId,
              quantity: Number(inVar.quantity ?? 0),
            })
          }
        }
        if (items.length) {
          inventorySetDebug = await setInventoryAbsolute(
            shopDomain,
            accessToken,
            {
              locationId: locationId as GID,
              items,
            }
          )
        }
      }
    } else {
      console.warn('⚠️ No location found; skipping inventory set.')
    }

    // 9) Optional publish (channel)
    if (productStatus === 'ACTIVE' || publishNow === true) {
      const MUT_PUBLISH = `
        mutation PublishNow($id: ID!) {
          publishablePublishToCurrentChannel(id: $id) {
            userErrors { field message }
          }
        }
      `
      const pubJson = await shopifyGraphQL(
        shopDomain,
        accessToken,
        MUT_PUBLISH,
        { id: productGid }
      )
      const pubErrors =
        pubJson?.data?.publishablePublishToCurrentChannel?.userErrors
      if (pubErrors?.length) console.warn('Publish warnings:', pubErrors)
    }

    // 10) Save (same table/fields)
    const numericId = parseShopifyId(productGid)

    const { error: saveError } = await supabase
      .from('published_products')
      .insert({
        user_id: userId,
        content_id: mergedProductContent.id,
        platform: 'shopify',
        platform_product_id: String(numericId),
        platform_url: `https://${shopDomain}/admin/products/${numericId}`,
        title: productCreateInput.title,
        description: stripHtml(productCreateInput.descriptionHtml || ''),
        price: Number(
          isMultiVariant
            ? (publishingOptions?.variants?.[0]?.price ?? 0)
            : (publishingOptions.price ?? 0)
        ),
        quantity: Number(
          isMultiVariant
            ? (publishingOptions?.variants?.[0]?.quantity ?? 0)
            : (publishingOptions.quantity ?? 0)
        ),
        sku: isMultiVariant
          ? publishingOptions?.variants?.[0]?.sku || null
          : publishingOptions.sku || null,
        images: images || [],
        platform_data: {
          shopify_gid: productGid,
          shopify_handle: handle,
          shop_domain: shopDomain,
          variant_gids: variantGids,
          status: productStatus,
          options: publishingOptions.options || null,
          variants_input: publishingOptions.variants || null,
          preferred_location_id: locationId,
          vision_meta_used: vision,
        },
        status: productStatus === 'ACTIVE' ? 'published' : 'draft',
        published_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (saveError) console.error('⚠️ Failed to save to database:', saveError)

    // 11) Compute Listing Quality Score (for UI happiness)
    const quality = scoreListingForShopify({
      title: productCreateInput.title,
      descriptionHtml: productCreateInput.descriptionHtml,
      keyBenefitsCount: sections.keyBenefits?.length || 0,
      featuresCount: sections.additionalFeatures?.length || 0,
      specsCount: sections.specifications?.length || 0,
      imageCount: productImages?.length || images?.length || 0,
      seoTitle,
      seoDescription,
      hasTags: !!(
        Array.isArray(productCreateInput.tags) && productCreateInput.tags.length
      ),
      hasVendor: !!productCreateInput.vendor,
      hasProductType: !!productCreateInput.productType,
      hasVariants: isMultiVariant,
      perVariantImages: isMultiVariant && !!publishingOptions?.variants?.length,
      hasSku: Boolean(
        isMultiVariant
          ? publishingOptions?.variants?.[0]?.sku
          : publishingOptions?.sku
      ),
      priceSet: Boolean(
        isMultiVariant
          ? publishingOptions?.variants?.[0]?.price
          : publishingOptions?.price
      ),
      inventorySet: true, // we just set it
    })

    return NextResponse.json({
      success: true,
      platform: 'shopify',
      productId: String(numericId) || 'Unknown',
      id: String(numericId) || 'Unknown',
      handle: handle || 'unknown',
      adminUrl: `https://${shopDomain}/admin/products/${numericId || 'unknown'}`,
      publicUrl: `https://${shopDomain}/products/${handle || 'unknown'}`,
      status: productStatus || 'unknown',
      variants: variantGids.length,
      quality, // { score, suggestions[] }
      inventoryDebug: {
        locationId,
        inventoryItemGids,
      },
      message: `Product created via GraphQL. Variants: ${variantGids.length}`,
    })
  } catch (error) {
    console.error('❌ Shopify publish error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to publish to Shopify',
        platform: 'shopify',
      },
      { status: 500 }
    )
  }
}

/* ------------------------------ GraphQL & Inventory helpers ------------------------------ */

async function shopifyGraphQL(
  shopDomain: string,
  accessToken: string,
  query: string,
  variables: Record<string, any>
) {
  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    }
  )
  const json = await res.json()
  if (!res.ok) console.error('Shopify GraphQL error:', json)
  return json
}

// Ensure the inventory level exists at the location (safe if already active)
async function activateInventoryItem(
  shopDomain: string,
  accessToken: string,
  inventoryItemId: GID,
  locationId: GID
) {
  const MUT = `
    mutation InventoryActivate($inventoryItemId: ID!, $locationId: ID!) {
      inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId) {
        inventoryLevel { id }
        userErrors { field message }
      }
    }
  `
  return await shopifyGraphQL(shopDomain, accessToken, MUT, {
    inventoryItemId,
    locationId,
  })
}

// Absolute inventory setter (uppercase enums + ignore compare)
async function setInventoryAbsolute(
  shopDomain: string,
  accessToken: string,
  args: {
    locationId: GID
    items: Array<{ inventoryItemId: GID; quantity: number }>
  }
) {
  if (!args.items.length) return null
  const MUT = `
    mutation InventorySet($input: InventorySetQuantitiesInput!) {
      inventorySetQuantities(input: $input) {
        userErrors { field message }
        inventoryAdjustmentGroup { createdAt reason changes { name delta } }
      }
    }
  `
  const input = {
    name: 'AVAILABLE', // enum
    reason: 'CORRECTION', // enum (safe default)
    referenceDocumentUri: 'listora://publish',
    ignoreCompareQuantity: true,
    quantities: args.items.map((i) => ({
      inventoryItemId: i.inventoryItemId,
      locationId: args.locationId,
      quantity: Number(i.quantity || 0),
    })),
  }
  const resp = await shopifyGraphQL(shopDomain, accessToken, MUT, { input })
  return resp?.data?.inventorySetQuantities || resp
}

/* ------------------------------ Content utilities (premium formatting) ------------------------------ */

function extractUniversalContent(
  content: string,
  fallbackTitle?: string
): SectionBundle {
  return {
    title: extractTitle(content, fallbackTitle),
    description: extractDescription(content),
    keyBenefits: extractKeyBenefits(content),
    additionalFeatures: extractAdditionalFeatures(content, []),
    specifications: createSpecifications(content, fallbackTitle || ''),
    vendor: undefined,
    tags: [],
  }
}

function formatShopifyDescription(sections: SectionBundle): string {
  const escape = (s: string) => s || ''
  const li = (s: string) => `<li>${escape(s)}</li>`
  const bold = (s: string) => `<strong>${escape(s)}</strong>`

  let html = ''

  if (sections.description) {
    html += `<p>${escape(sections.description)}</p>\n`
  }

  if (sections.keyBenefits?.length) {
    html += `<h3>✨ Why You'll Love It</h3>\n<ul>\n`
    sections.keyBenefits
      .slice(0, 6)
      .forEach((b: string) => (html += `${li(b)}`))
    html += `</ul>\n`
  }

  if (sections.additionalFeatures?.length) {
    html += `<h3>🔥 Features</h3>\n<ul>\n`
    sections.additionalFeatures
      .slice(0, 8)
      .forEach((f: string) => (html += `${li(f)}`))
    html += `</ul>\n`
  }

  if (sections.specifications?.length) {
    html += `<h3>📋 Specifications</h3>\n<table>\n<tbody>\n`
    sections.specifications.slice(0, 8).forEach((s: string) => {
      const [k, v] = s.split(':').map((x) => x.trim())
      if (v) {
        html += `<tr><td>${bold(k)}</td><td>${escape(v)}</td></tr>\n`
      } else {
        html += `<tr><td colspan="2">${escape(s)}</td></tr>\n`
      }
    })
    html += `</tbody>\n</table>\n`
  }

  html += `<h3>🛡️ Our Promise</h3>\n<p>We stand behind the quality of our products. Your satisfaction is our priority.</p>\n`
  html += `<p><strong>Ready to experience the difference? Add to cart now.</strong></p>`

  return html
}

/* ---- Extractors (compatible with your earlier structure) ---- */

function cleanText(text: string): string {
  return (text || '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/^\s*[-•]\s*/, '')
    .replace(/^\s*\d+[\.\)]\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
}

function extractTitle(content: string, fallbackTitle?: string): string {
  const patterns = [
    /\*\*1\.\s*PRODUCT\s+TITLE[\/\s]*HEADLINE[:\s]*\*\*\s*\n([^\n]+)/i,
    /\*\*1\.\s*PRODUCT\s+TITLE[:\s]*\*\*\s*\n([^\n]+)/i,
    /1\.\s*PRODUCT\s+TITLE[:\s]*([^\n]+)/i,
    /"([^"]{20,150})"/,
  ]
  for (const p of patterns) {
    const m = (content || '').match(p)
    if (m?.[1]) {
      const t = cleanText(m[1])
      if (t.length >= 15 && t.length <= 150) return t
    }
  }
  return fallbackTitle || 'Premium Product'
}

function extractDescription(content: string): string {
  const m = (content || '').match(
    /\*\*3\.\s*DETAILED\s*PRODUCT\s*DESCRIPTION[:\s]*\*\*\s*\n([\s\S]*?)(?=\*\*[4-9]\.|$)/i
  )
  if (!m) return 'Premium quality product designed for modern needs.'
  const sentences = cleanText(m[1])
    .split(/[.!?]+/)
    .filter((s) => s.trim().length > 15)
  let shortDesc = sentences.slice(0, 2).join('. ').trim()
  if (shortDesc && !shortDesc.endsWith('.')) shortDesc += '.'
  if (shortDesc.length > 280) {
    const i = shortDesc.lastIndexOf(' ', 280)
    shortDesc = (
      i > 250 ? shortDesc.substring(0, i) + '...' : sentences[0] + '.'
    ).trim()
  }
  return shortDesc
}

function extractKeyBenefits(content: string): string[] {
  const out: string[] = []
  const m = (content || '').match(
    /\*\*2\.\s*KEY\s*SELLING\s*POINTS[:\s]*\*\*\s*\n([\s\S]*?)(?=\*\*[3-9]\.|$)/i
  )
  if (m) {
    const body = m[1]
    const patterns = [
      /^[\s]*-\s*\*\*([^*]+?)\*\*:\s*([^\n\r]+)/gm,
      /^[\s]*-\s*\*\*([^*]+?)\*\*\s*:\s*([^\n\r]+)/gm,
      /^[\s]*-\s*\*\*([^*]+?)\*\*\s+([^\n\r]+)/gm,
      /[\s]*-\s*\*\*([^*]+?)\*\*:\s*([^\n\r]+)/gm,
    ]
    for (const p of patterns) {
      const matches = [...body.matchAll(p)]
      if (matches.length) {
        for (const m of matches) {
          if (m[1] && m[2]) {
            const t = cleanText(m[1]).replace(/:+$/, '').trim()
            const d = cleanText(m[2]).trim()
            if (t.length > 3 && t.length < 80 && d.length > 10)
              out.push(`${t}: ${d}`)
          }
        }
        break
      }
    }
  }
  if (!out.length) {
    out.push('Premium Quality: Built with superior materials and craftsmanship')
    out.push('Modern Design: Stylish and contemporary aesthetic')
    out.push('Enhanced Performance: Optimized for reliable daily use')
  }
  return out.slice(0, 6)
}

function extractAdditionalFeatures(
  content: string,
  _existing: string[]
): string[] {
  const out: string[] = []
  const m = (content || '').match(
    /\*\*3\.\s*DETAILED\s*PRODUCT\s*DESCRIPTION[:\s]*\*\*\s*\n([\s\S]*?)(?=\*\*[4-9]\.|$)/i
  )
  if (m) {
    const sentences = cleanText(m[1])
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 40)
    for (const s of sentences)
      if (s.length > 50 && s.length < 150 && out.length < 8) out.push(s.trim())
  }
  if (!out.length) {
    out.push(
      'Professional-grade performance optimized for demanding applications'
    )
    out.push(
      'Premium materials and construction ensure long-lasting durability'
    )
    out.push(
      'Advanced technology integration delivers superior user experience'
    )
    out.push('Thoughtful design elements enhance both form and function')
  }
  return out.slice(0, 8)
}

function createSpecifications(content: string, title: string): string[] {
  const out: string[] = []
  const t = (content + ' ' + title).toLowerCase()
  if (t.includes('leather')) out.push('Material: Leather')
  else if (t.includes('linen')) out.push('Material: Linen')
  else if (t.includes('cotton')) out.push('Material: Cotton')
  if (t.includes('black')) out.push('Color: Black')
  else if (t.includes('white')) out.push('Color: White')
  if (t.includes('5g')) out.push('Connectivity: 5G')
  if (t.includes('shirt')) out.push('Type: Apparel')
  if (!out.length) {
    out.push('Quality: Premium Grade')
    out.push('Design: Modern Construction')
  }
  return out.slice(0, 8)
}

function extractBrand(content: string): string {
  const brands = ['Apple', 'Nike', 'Adidas', 'Samsung', 'Sony', 'NORTH', 'Bose']
  const s = content.toLowerCase()
  for (const b of brands) if (s.includes(b.toLowerCase())) return b
  return ''
}

function detectProductType(content: string): string {
  const s = content.toLowerCase()
  if (s.includes('iphone') || s.includes('phone')) return 'Electronics'
  if (s.includes('shoes') || s.includes('sneakers')) return 'Footwear'
  if (s.includes('shirt') || s.includes('clothing')) return 'Apparel'
  if (s.includes('headphones')) return 'Electronics'
  return 'General'
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, '').trim()
}

function generateTags(sections: SectionBundle): string[] {
  const text = (
    sections.title +
    ' ' +
    sections.keyBenefits?.join(' ') +
    ' ' +
    sections.specifications?.join(' ')
  ).toLowerCase()
  const tags = new Set<string>()
  if (text.includes('premium')) tags.add('Premium')
  if (text.includes('professional')) tags.add('Professional')
  if (text.includes('advanced')) tags.add('Advanced')
  if (text.includes('luxury')) tags.add('Luxury')
  if (text.includes('quality')) tags.add('Quality')
  if (text.includes('shirt') || text.includes('apparel')) tags.add('Apparel')
  if (text.includes('sneaker') || text.includes('shoe')) tags.add('Footwear')
  if (text.includes('phone') || text.includes('headphones'))
    tags.add('Electronics')
  return Array.from(tags).slice(0, 8)
}
