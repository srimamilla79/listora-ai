// src/app/api/store-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  console.log('🔄 Starting optimized image storage process...')
  const startTime = Date.now()

  try {
    const { productName, originalImages, processedImages, productContentId } =
      await request.json()

    if (!productContentId) {
      return NextResponse.json(
        { error: 'Product content ID is required' },
        { status: 400 }
      )
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createServiceRoleClient()

    // Get user from the request (assuming you have auth middleware)
    const authHeader = request.headers.get('authorization')
    let userId: string

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1]
      const {
        data: { user },
        error: authError,
      } = await supabaseAdmin.auth.getUser(token)

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      userId = user.id
    } else {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      )
    }

    // Create image folder name (keeping your existing format)
    const timestamp = new Date().toISOString().split('T')[0]
    const folderName = `${userId}/${productName
      .toLowerCase()
      .replace(/\s+/g, '-')}-${timestamp}`

    console.log('📁 Creating image folder:', folderName)

    // Optimized function to convert data URL to blob
    const dataURLtoBlob = (dataURL: string): Blob => {
      try {
        const arr = dataURL.split(',')
        const mime = arr[0].match(/:(.*?);/)![1]
        const bstr = atob(arr[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        return new Blob([u8arr], { type: mime })
      } catch (error) {
        console.error('❌ Error converting data URL to blob:', error)
        throw new Error('Invalid data URL format')
      }
    }

    const storedImages = {
      original: [] as string[],
      processed: {
        amazon: [] as string[],
        shopify: [] as string[],
        etsy: [] as string[],
        instagram: [] as string[],
      },
    }

    const publicUrls = {
      original: [] as string[],
      processed: {
        amazon: [] as string[],
        shopify: [] as string[],
        etsy: [] as string[],
        instagram: [] as string[],
      },
    }

    // OPTIMIZED: Store original images with parallel processing
    console.log('📂 Processing original images...')
    if (originalImages && originalImages.length > 0) {
      const originalPromises = originalImages.map(
        async (imageData: string, i: number) => {
          if (!imageData) return null

          // Handle both blob URLs and data URLs
          let processedImageData = imageData

          if (imageData.startsWith('blob:')) {
            console.log(
              `🔄 Converting blob URL to data URL for original image ${i + 1}`
            )
            try {
              // Convert blob URL to data URL on server side
              const response = await fetch(imageData)
              const blob = await response.blob()
              const buffer = await blob.arrayBuffer()
              const base64 = Buffer.from(buffer).toString('base64')
              const mimeType = blob.type || 'image/jpeg'
              processedImageData = `data:${mimeType};base64,${base64}`
            } catch (error) {
              console.error(
                `❌ Failed to convert blob URL for original image ${i + 1}:`,
                error
              )
              return null
            }
          }

          if (processedImageData.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(processedImageData)
              const fileName = `original-${i}-${Date.now()}.jpg`
              const filePath = `${folderName}/${fileName}`

              const { error: uploadError } = await supabaseAdmin.storage
                .from('listora-images')
                .upload(filePath, blob, {
                  contentType: 'image/jpeg',
                  upsert: true, // Allow overwriting
                })

              if (uploadError) {
                console.error(
                  `❌ Error uploading original image ${i + 1}:`,
                  uploadError
                )
                return null
              }

              const { data: urlData } = supabaseAdmin.storage
                .from('listora-images')
                .getPublicUrl(filePath)

              console.log(`✅ Original image ${i + 1} stored successfully`)
              return {
                fileName,
                publicUrl: urlData.publicUrl,
              }
            } catch (error) {
              console.error(
                `❌ Error processing original image ${i + 1}:`,
                error
              )
              return null
            }
          }

          return null
        }
      )

      const originalResults = await Promise.all(originalPromises)

      // Filter out null results and populate arrays
      originalResults.forEach((result) => {
        if (result) {
          storedImages.original.push(result.fileName)
          publicUrls.original.push(result.publicUrl)
        }
      })
    }

    // OPTIMIZED: Store processed images for each platform with parallel processing
    console.log('🎨 Processing platform-specific images...')
    const platforms = ['amazon', 'shopify', 'etsy', 'instagram'] as const

    const platformPromises = platforms.map(async (platform) => {
      const platformImages = processedImages[platform] || []
      console.log(
        `📱 Processing ${platform} images (${platformImages.length})...`
      )

      if (platformImages.length === 0) return

      const platformPromiseArray = platformImages.map(
        async (imageData: string, i: number) => {
          if (!imageData) return null

          // Handle both blob URLs and data URLs
          let processedImageData = imageData

          if (imageData.startsWith('blob:')) {
            console.log(
              `🔄 Converting blob URL to data URL for ${platform} image ${i + 1}`
            )
            try {
              const response = await fetch(imageData)
              const blob = await response.blob()
              const buffer = await blob.arrayBuffer()
              const base64 = Buffer.from(buffer).toString('base64')
              const mimeType = blob.type || 'image/jpeg'
              processedImageData = `data:${mimeType};base64,${base64}`
            } catch (error) {
              console.error(
                `❌ Failed to convert blob URL for ${platform} image ${i + 1}:`,
                error
              )
              return null
            }
          }

          if (processedImageData.startsWith('data:')) {
            try {
              const blob = dataURLtoBlob(processedImageData)
              const fileName = `${platform}-${i}-${Date.now()}.jpg`
              const filePath = `${folderName}/${fileName}`

              const { error: uploadError } = await supabaseAdmin.storage
                .from('listora-images')
                .upload(filePath, blob, {
                  contentType: 'image/jpeg',
                  upsert: true, // Allow overwriting
                })

              if (uploadError) {
                console.error(
                  `❌ Error uploading ${platform} image ${i + 1}:`,
                  uploadError
                )
                return null
              }

              const { data: urlData } = supabaseAdmin.storage
                .from('listora-images')
                .getPublicUrl(filePath)

              console.log(`✅ ${platform} image ${i + 1} stored successfully`)
              return {
                fileName,
                publicUrl: urlData.publicUrl,
              }
            } catch (error) {
              console.error(
                `❌ Error processing ${platform} image ${i + 1}:`,
                error
              )
              return null
            }
          }

          return null
        }
      )

      const platformResults = await Promise.all(platformPromiseArray)

      // Filter out null results and populate arrays
      platformResults.forEach((result) => {
        if (result) {
          storedImages.processed[platform].push(result.fileName)
          publicUrls.processed[platform].push(result.publicUrl)
        }
      })
    })

    // Wait for all platforms to complete
    await Promise.all(platformPromises)

    // Update the database record with image metadata (keeping your existing format)
    console.log('💾 Updating database record:', productContentId)

    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('product_contents')
      .update({
        image_folder: folderName,
        original_images: JSON.stringify(storedImages.original), // Keep JSON format
        processed_images: JSON.stringify(storedImages.processed), // Keep JSON format
        has_images: true,
        has_processed_images: Object.values(storedImages.processed).some(
          (arr) => arr.length > 0
        ),
      })
      .eq('id', productContentId)
      .select()

    if (updateError) {
      console.error('❌ Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update database with image metadata' },
        { status: 500 }
      )
    }

    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log(`✅ Database updated successfully in ${duration}s:`, updateData)

    return NextResponse.json({
      success: true,
      imageFolder: folderName,
      storedImages,
      publicUrls,
      duration,
      message: `Images stored successfully in ${duration}s`,
    })
  } catch (error) {
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.error('❌ Store images error after', duration + 's:', error)
    return NextResponse.json(
      { error: 'Failed to store images' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')

    if (!contentId) {
      return NextResponse.json(
        { error: 'Content ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createServiceRoleClient()

    // Get image metadata from database
    const { data, error } = await supabaseAdmin
      .from('product_contents')
      .select('image_folder, original_images, processed_images')
      .eq('id', contentId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to retrieve image data' },
        { status: 500 }
      )
    }

    if (!data.image_folder) {
      return NextResponse.json({
        success: true,
        images: null,
        message: 'No images found for this content',
      })
    }

    // Generate public URLs for stored images
    const originalImages = JSON.parse(data.original_images || '[]')
    const processedImages = JSON.parse(data.processed_images || '{}')

    const publicUrls = {
      original: originalImages.map((fileName: string) => {
        const { data: urlData } = supabaseAdmin.storage
          .from('listora-images')
          .getPublicUrl(`${data.image_folder}/${fileName}`)
        return urlData.publicUrl
      }),
      processed: {
        amazon:
          processedImages.amazon?.map((fileName: string) => {
            const { data: urlData } = supabaseAdmin.storage
              .from('listora-images')
              .getPublicUrl(`${data.image_folder}/${fileName}`)
            return urlData.publicUrl
          }) || [],
        shopify:
          processedImages.shopify?.map((fileName: string) => {
            const { data: urlData } = supabaseAdmin.storage
              .from('listora-images')
              .getPublicUrl(`${data.image_folder}/${fileName}`)
            return urlData.publicUrl
          }) || [],
        etsy:
          processedImages.etsy?.map((fileName: string) => {
            const { data: urlData } = supabaseAdmin.storage
              .from('listora-images')
              .getPublicUrl(`${data.image_folder}/${fileName}`)
            return urlData.publicUrl
          }) || [],
        instagram:
          processedImages.instagram?.map((fileName: string) => {
            const { data: urlData } = supabaseAdmin.storage
              .from('listora-images')
              .getPublicUrl(`${data.image_folder}/${fileName}`)
            return urlData.publicUrl
          }) || [],
      },
    }

    return NextResponse.json({
      success: true,
      images: {
        folder: data.image_folder,
        stored: { original: originalImages, processed: processedImages },
        publicUrls,
      },
      message: 'Images retrieved successfully',
    })
  } catch (error) {
    console.error('Get images error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve images' },
      { status: 500 }
    )
  }
}
