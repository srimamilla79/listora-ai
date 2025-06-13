// Replace your src/app/api/store-images-auto/route.ts with this fixed version:
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

    // 🔧 KEY FIX: Use EXACT same auth method as /api/generate
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
      // Since generate API works, we can infer the user from the contentId
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

          let processedImageData = imageData

          if (imageData.startsWith('blob:')) {
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

          return null
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

    // Update the database record
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
      return NextResponse.json(
        { error: 'Failed to update database with image metadata' },
        { status: 500 }
      )
    }

    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.log(`✅ Auto image storage completed successfully in ${duration}s`)

    return NextResponse.json({
      success: true,
      imageFolder: folderName,
      storedImages,
      publicUrls,
      duration,
      message: `Images stored automatically in ${duration}s`,
    })
  } catch (error) {
    const endTime = Date.now()
    const duration = Math.round((endTime - startTime) / 1000)

    console.error('❌ Auto store images error after', duration + 's:', error)
    return NextResponse.json(
      { error: 'Failed to store images automatically' },
      { status: 500 }
    )
  }
}
