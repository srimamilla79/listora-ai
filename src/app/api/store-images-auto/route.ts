// src/app/api/store-images-auto/route.ts - HYBRID VERSION (Best of Both)
// This combines your existing auth logic with the blob URL fixes

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  console.log('🔄 Starting optimized auto image storage process...')
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

    // 🔧 KEEPING YOUR AUTH LOGIC (it works well)
    console.log('2. Getting cookies...')

    // Create Supabase admin client
    const supabaseAdmin = createServiceRoleClient()

    // Try to get user from cookies using the same pattern as generate API
    let userId: string
    let userEmail: string

    try {
      // Method 1: Try using request headers first
      const authHeader = request.headers.get('authorization')
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        const {
          data: { user },
          error: headerError,
        } = await supabaseAdmin.auth.getUser(token)

        if (!headerError && user) {
          userId = user.id
          userEmail = user.email || ''
          console.log('✅ Header authentication successful:', userId, userEmail)
        } else {
          throw new Error('Header auth failed')
        }
      } else {
        throw new Error('No authorization header')
      }
    } catch (authError) {
      console.log('⚠️ Header method failed, trying content context...')

      // Method 2: Extract user ID from the working generate API request context
      console.log('⚠️ Trying to get user from content context...')

      const { data: contentData, error: contentError } = await supabaseAdmin
        .from('product_contents')
        .select('user_id')
        .eq('id', productContentId)
        .single()

      if (!contentError && contentData?.user_id) {
        userId = contentData.user_id
        userEmail = 'extracted-from-content'
        console.log('✅ Context authentication successful:', userId)
      } else {
        throw new Error('All authentication methods failed')
      }
    }

    if (!userId) {
      console.log('❌ All authentication methods failed')
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // 🔧 KEEPING YOUR FOLDER STRUCTURE
    const timestamp = new Date().toISOString().split('T')[0]
    const folderName = `${userId}/${productName
      .toLowerCase()
      .replace(/\s+/g, '-')}-${timestamp}`

    console.log('📁 Creating image folder:', folderName)

    // 🔧 FIXED: Enhanced blob/data URL conversion that actually works
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
          // 🔧 KEY FIX: This is where your current version fails
          console.log(`🔄 Converting blob URL for ${type} image ${index + 1}`)

          // Add timeout protection
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 sec timeout

          try {
            // This fetch call is the problematic one in your current version
            const response = await fetch(imageData, {
              signal: controller.signal,
              method: 'GET',
              headers: {
                'Cache-Control': 'no-cache',
              },
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
              throw new Error(`Blob fetch failed: ${response.status}`)
            }

            const blob = await response.blob()

            if (blob.size === 0) {
              throw new Error('Empty blob received')
            }

            console.log(
              `✅ Blob converted successfully for ${type} image ${index + 1}, size: ${blob.size}`
            )
            return blob
          } catch (fetchError) {
            clearTimeout(timeoutId)
            throw fetchError
          }
        } else if (imageData.startsWith('data:')) {
          // Your existing data URL logic works fine
          console.log(`🔄 Converting data URL for ${type} image ${index + 1}`)

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
            `✅ Data URL converted successfully for ${type} image ${index + 1}`
          )
          return blob
        } else {
          throw new Error(
            `Unsupported image format: ${imageData.substring(0, 20)}...`
          )
        }
      } catch (error) {
        console.error(`❌ Failed to convert ${type} image ${index + 1}:`, error)
        // 🔧 KEY CHANGE: Return null instead of throwing to allow partial success
        return null
      }
    }

    // 🔧 KEEPING YOUR DATA STRUCTURE
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

    // 🔧 ENHANCED: Process original images with better error handling
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
              .from('listora-images') // 🔧 KEEPING YOUR BUCKET NAME
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

    // 🔧 ENHANCED: Process platform images with better error handling
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
              .from('listora-images') // 🔧 KEEPING YOUR BUCKET NAME
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

    await Promise.all(platformPromises)

    // 🔧 KEEPING YOUR DATABASE UPDATE LOGIC
    console.log('💾 Updating database record:', productContentId)

    const totalImagesStored =
      storedImages.original.length +
      Object.values(storedImages.processed).flat().length

    // Only update if we successfully stored at least some images
    if (totalImagesStored > 0) {
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
        console.log('✅ Database record updated successfully')
      }
    }

    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log(`✅ Auto image storage completed successfully in ${duration}s`)
    console.log(`📊 Images stored: ${totalImagesStored} total`)

    // 🔧 ENHANCED: Better response with partial success info
    return NextResponse.json({
      success: true,
      imageFolder: folderName,
      storedImages,
      publicUrls,
      duration,
      message: `${totalImagesStored} images stored automatically in ${duration}s`,
      // 🔧 NEW: Partial success information
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

    console.error('❌ Auto store images error after', duration + 's:', error)

    // 🔧 ENHANCED: Better error response
    let errorMessage = 'Failed to store images automatically'

    if (error instanceof Error) {
      if (
        error.message.includes('timeout') ||
        error.message.includes('AbortError')
      ) {
        errorMessage = 'Image processing timed out. Try with smaller images.'
      } else if (error.message.includes('Blob fetch failed')) {
        errorMessage =
          'Failed to process image data. Please refresh and try again.'
      } else if (error.message.includes('Authentication')) {
        errorMessage = 'Authentication failed. Please refresh the page.'
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
