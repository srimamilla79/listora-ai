// src/app/api/store-images/route.ts - FIXED VERSION
// This is the manual image storage (triggered by user clicking "Save Images")

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  console.log('🔄 Starting manual image storage process...')
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

    // Get user from the request
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

    // 🔧 FIXED: Enhanced image conversion that handles blob URLs properly
    const convertImageData = async (
      imageData: string,
      index: number,
      type: string
    ): Promise<Blob | null> => {
      if (!imageData) {
        console.log(`⚠️ Empty image data for ${type} ${index + 1}`)
        return null
      }

      try {
        if (imageData.startsWith('blob:')) {
          console.log(`🔄 Converting blob URL for ${type} image ${index + 1}`)

          // 🔧 KEY FIX: Add timeout protection for blob URL fetching
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 sec timeout

          try {
            const response = await fetch(imageData, {
              signal: controller.signal,
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
              },
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              throw new Error(
                `Blob fetch failed: ${response.status} ${response.statusText}`
              )
            }

            const blob = await response.blob()

            if (blob.size === 0) {
              throw new Error('Empty blob received')
            }

            console.log(
              `✅ Blob converted successfully for ${type} image ${index + 1}, size: ${blob.size} bytes`
            )
            return blob
          } catch (fetchError) {
            clearTimeout(timeoutId)
            throw fetchError
          }
        } else if (imageData.startsWith('data:')) {
          console.log(`🔄 Converting data URL for ${type} image ${index + 1}`)

          // Your existing data URL logic (this works fine)
          const arr = imageData.split(',')
          const mime = arr[0].match(/:(.*?);/)![1]
          const bstr = atob(arr[1])
          let n = bstr.length
          const u8arr = new Uint8Array(n)
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n)
          }

          const blob = new Blob([u8arr], { type: mime })
          console.log(
            `✅ Data URL converted successfully for ${type} image ${index + 1}, size: ${blob.size} bytes`
          )
          return blob
        } else {
          throw new Error(
            `Unsupported image format: ${imageData.substring(0, 30)}...`
          )
        }
      } catch (error) {
        console.error(`❌ Failed to convert ${type} image ${index + 1}:`, error)
        // 🔧 KEY CHANGE: Return null instead of throwing to allow partial success
        return null
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

    // 🔧 ENHANCED: Store original images with better error handling
    console.log('📂 Processing original images...')
    if (originalImages && originalImages.length > 0) {
      const originalPromises = originalImages.map(
        async (imageData: string, i: number) => {
          try {
            const blob = await convertImageData(imageData, i + 1, 'original')
            if (!blob) {
              console.log(
                `⚠️ Skipping original image ${i + 1} due to conversion failure`
              )
              return null
            }

            const fileName = `original-${i}-${Date.now()}.jpg`
            const filePath = `${folderName}/${fileName}`

            const { error: uploadError } = await supabaseAdmin.storage
              .from('listora-images')
              .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: true,
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
            console.error(`❌ Error processing original image ${i + 1}:`, error)
            return null
          }
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

    // 🔧 ENHANCED: Store processed images with better error handling
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
          try {
            const blob = await convertImageData(imageData, i + 1, platform)
            if (!blob) {
              console.log(
                `⚠️ Skipping ${platform} image ${i + 1} due to conversion failure`
              )
              return null
            }

            const fileName = `${platform}-${i}-${Date.now()}.jpg`
            const filePath = `${folderName}/${fileName}`

            const { error: uploadError } = await supabaseAdmin.storage
              .from('listora-images')
              .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: true,
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
      )

      const platformResults = await Promise.all(platformPromiseArray)

      platformResults.forEach((result) => {
        if (result) {
          storedImages.processed[platform].push(result.fileName)
          publicUrls.processed[platform].push(result.publicUrl)
        }
      })
    })

    // Wait for all platforms to complete
    await Promise.all(platformPromises)

    // Calculate total images stored
    const totalImagesStored =
      storedImages.original.length +
      Object.values(storedImages.processed).flat().length

    console.log(`📊 Total images stored: ${totalImagesStored}`)

    // 🔧 ENHANCED: Only update database if we stored at least some images
    if (totalImagesStored > 0) {
      console.log('💾 Updating database record:', productContentId)

      const { data: updateData, error: updateError } = await supabaseAdmin
        .from('product_contents')
        .update({
          image_folder: folderName,
          original_images: JSON.stringify(storedImages.original),
          processed_images: JSON.stringify(storedImages.processed),
          has_images: true,
          has_processed_images: Object.values(storedImages.processed).some(
            (arr) => arr.length > 0
          ),
        })
        .eq('id', productContentId)
        .select()

      if (updateError) {
        console.error('❌ Database update error:', updateError)
        // Don't fail the whole operation, just log it
      } else {
        console.log(
          `✅ Database updated successfully with ${totalImagesStored} images`
        )
      }
    }

    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log(`✅ Manual image storage completed in ${duration}s`)

    // 🔧 ENHANCED: Better response with detailed stats
    return NextResponse.json({
      success: true,
      imageFolder: folderName,
      storedImages,
      publicUrls,
      duration,
      message: `${totalImagesStored} images stored successfully in ${duration}s`,
      // 🔧 NEW: Detailed statistics
      stats: {
        totalStored: totalImagesStored,
        originalStored: storedImages.original.length,
        processedStored: Object.values(storedImages.processed).flat().length,
        originalAttempted: originalImages?.length || 0,
        processedAttempted: Object.values(processedImages || {}).flat().length,
      },
    })
  } catch (error) {
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.error('❌ Manual store images error after', duration + 's:', error)

    // 🔧 ENHANCED: Better error response
    let errorMessage = 'Failed to store images'

    if (error instanceof Error) {
      if (
        error.message.includes('timeout') ||
        error.message.includes('AbortError')
      ) {
        errorMessage =
          'Image processing timed out. Try with smaller images or fewer images at once.'
      } else if (error.message.includes('Blob fetch failed')) {
        errorMessage =
          'Failed to process image data. Please refresh the page and try again.'
      } else if (error.message.includes('Unauthorized')) {
        errorMessage =
          'Authentication failed. Please refresh the page and log in again.'
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        duration,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
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
      console.error('❌ Failed to retrieve image data:', error)
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
    console.error('❌ Get images error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve images' },
      { status: 500 }
    )
  }
}
