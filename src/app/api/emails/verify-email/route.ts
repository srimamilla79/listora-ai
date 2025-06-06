// src/app/api/emails/verify-email/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, confirmationUrl } = await request.json()

    if (!email || !confirmationUrl) {
      return NextResponse.json(
        { error: 'Email and confirmation URL are required' },
        { status: 400 }
      )
    }

    // Check if Resend API key exists (FOLLOWING YOUR PATTERN)
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not found, skipping email send')
      return NextResponse.json({
        success: true,
        message: 'Email sending skipped - no API key',
      })
    }

    // Dynamic import of Resend to avoid build issues (YOUR GOOD PRACTICE)
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'Listora AI <verify@resend.dev>', // Following your domain pattern
      to: [email],
      subject: 'Verify your Listora AI account ✉️',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Verify Your Email - Listora AI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">📧</span>
              </div>
              <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Verify Your Email</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">Almost there! Just one click to activate your Listora AI account.</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: #eff6ff; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; border-left: 4px solid #3b82f6;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">Click the button below to verify your email:</h2>
              <p style="margin: 0 0 25px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">This confirms you own <strong>${email}</strong> and activates all the powerful features of Listora AI.</p>
              
              <a href="${confirmationUrl}" 
                 style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                ✅ Verify Email Address
              </a>
            </div>
            
            <!-- What You Get Section -->
            <div style="margin-bottom: 30px;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px; text-align: center;">🚀 After verification, you'll get access to:</h3>
              <div style="space-y: 12px;">
                <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 12px; background: #f0f9ff; border-radius: 8px;">
                  <span style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">🎤</span>
                  <span style="color: #374151; font-size: 14px;">Voice-to-content generation (lightning fast!)</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                  <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">📸</span>
                  <span style="color: #374151; font-size: 14px;">Professional image processing & optimization</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 12px; background: #fefbf3; border-radius: 8px;">
                  <span style="background: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">🤖</span>
                  <span style="color: #374151; font-size: 14px;">AI content for Amazon, eBay, Shopify, Instagram</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 12px; padding: 12px; background: #faf5ff; border-radius: 8px;">
                  <span style="background: #8b5cf6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px;">☁️</span>
                  <span style="color: #374151; font-size: 14px;">Cloud storage & content management</span>
                </div>
              </div>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Can't click the button?</h4>
              <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">Copy and paste this link into your browser:</p>
              <p style="color: #92400e; font-size: 12px; word-break: break-all; background: rgba(251, 191, 36, 0.3); padding: 8px; border-radius: 4px; margin: 0;">${confirmationUrl}</p>
            </div>
            
            <!-- Security Note -->
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">🔒 Security Notice</h4>
              <ul style="color: #1e40af; font-size: 14px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">This verification link will expire in 24 hours</li>
                <li style="margin-bottom: 6px;">You can only use this link once</li>
                <li style="margin-bottom: 0;">If you didn't create this account, you can safely ignore this email</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Need help? Just reply to this email.</p>
              <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 500;">Welcome to the future of content creation!<br>The Listora AI Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Verification email error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
