// src/app/api/store-images/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
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
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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

    // Create image folder name
    const timestamp = new Date().toISOString().split('T')[0]
    const folderName = `${userId}/${productName
      .toLowerCase()
      .replace(/\s+/g, '-')}-${timestamp}`

    console.log('Creating image folder:', folderName)

    // Function to convert data URL to blob
    const dataURLtoBlob = (dataURL: string): Blob => {
      const arr = dataURL.split(',')
      const mime = arr[0].match(/:(.*?);/)![1]
      const bstr = atob(arr[1])
      let n = bstr.length
      const u8arr = new Uint8Array(n)
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
      }
      return new Blob([u8arr], { type: mime })
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

    // Store original images (if any)
    for (let i = 0; i < originalImages.length; i++) {
      const imageData = originalImages[i]
      if (imageData && imageData.startsWith('blob:')) {
        // Skip blob URLs for now - we'll focus on processed images
        continue
      }

      if (imageData && imageData.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(imageData)
          const fileName = `original-${i}-${Date.now()}.jpg`
          const filePath = `${folderName}/${fileName}`

          const { error: uploadError } = await supabaseAdmin.storage
            .from('listora-images')
            .upload(filePath, blob, {
              contentType: 'image/jpeg',
              upsert: false,
            })

          if (uploadError) {
            console.error('Error uploading original image:', uploadError)
          } else {
            storedImages.original.push(fileName)
            const { data: urlData } = supabaseAdmin.storage
              .from('listora-images')
              .getPublicUrl(filePath)
            publicUrls.original.push(urlData.publicUrl)
          }
        } catch (error) {
          console.error('Error processing original image:', error)
        }
      }
    }

    // Store processed images for each platform
    const platforms = ['amazon', 'shopify', 'etsy', 'instagram'] as const

    for (const platform of platforms) {
      const platformImages = processedImages[platform] || []

      for (let i = 0; i < platformImages.length; i++) {
        const imageData = platformImages[i]

        if (imageData && imageData.startsWith('data:')) {
          try {
            const blob = dataURLtoBlob(imageData)
            const fileName = `${platform}-${i}-${Date.now()}.jpg`
            const filePath = `${folderName}/${fileName}`

            const { error: uploadError } = await supabaseAdmin.storage
              .from('listora-images')
              .upload(filePath, blob, {
                contentType: 'image/jpeg',
                upsert: false,
              })

            if (uploadError) {
              console.error(`Error uploading ${platform} image:`, uploadError)
            } else {
              storedImages.processed[platform].push(fileName)
              const { data: urlData } = supabaseAdmin.storage
                .from('listora-images')
                .getPublicUrl(filePath)
              publicUrls.processed[platform].push(urlData.publicUrl)
            }
          } catch (error) {
            console.error(`Error processing ${platform} image:`, error)
          }
        }
      }
    }

    // **CRITICAL FIX: Update the database record with image metadata**
    console.log('Updating database record:', productContentId)

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
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update database with image metadata' },
        { status: 500 }
      )
    }

    console.log('Database updated successfully:', updateData)

    return NextResponse.json({
      success: true,
      imageFolder: folderName,
      storedImages,
      publicUrls,
      message: 'Images stored successfully',
    })
  } catch (error) {
    console.error('Store images error:', error)
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

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
