// src/app/api/emails/reset-password/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, resetUrl } = await request.json()

    if (!email || !resetUrl) {
      return NextResponse.json(
        { error: 'Email and reset URL are required' },
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
      from: 'Listora AI <reset@resend.dev>', // Following your domain pattern
      to: [email],
      subject: 'Reset your Listora AI password 🔑',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Reset Your Password - Listora AI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">🔑</span>
              </div>
              <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">We received a request to reset your Listora AI password.</p>
            </div>
            
            <!-- Main Content -->
            <div style="background: #fef2f2; padding: 30px; border-radius: 12px; margin-bottom: 30px; text-align: center; border-left: 4px solid #ef4444;">
              <h2 style="margin: 0 0 15px 0; font-size: 20px; color: #1f2937;">Click the button below to reset your password:</h2>
              <p style="margin: 0 0 25px 0; font-size: 14px; color: #6b7280; line-height: 1.6;">This link will take you to a secure page where you can set a new password for <strong>${email}</strong>.</p>
              
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                🔑 Reset My Password
              </a>
            </div>
            
            <!-- Security Information */}
            <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1e40af; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">🔒 Security Information</h4>
              <div style="space-y: 8px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px;">⏰</span>
                  <span style="color: #1e40af; font-size: 14px;">This reset link will expire in 1 hour</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px;">🔐</span>
                  <span style="color: #1e40af; font-size: 14px;">You can only use this link once</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                  <span style="background: #3b82f6; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px;">🛡️</span>
                  <span style="color: #1e40af; font-size: 14px;">Your account remains secure until you create a new password</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 0;">
                  <span style="background: #ef4444; color: white; width: 20px; height: 20px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 10px; font-size: 10px;">❌</span>
                  <span style="color: #1e40af; font-size: 14px;">If you didn't request this reset, please ignore this email</span>
                </div>
              </div>
            </div>
            
            <!-- Password Tips -->
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
              <h4 style="color: #166534; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">💡 Create a Strong Password</h4>
              <ul style="color: #166534; font-size: 14px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 6px;">Use at least 8 characters</li>
                <li style="margin-bottom: 6px;">Include both uppercase and lowercase letters</li>
                <li style="margin-bottom: 6px;">Add numbers and special characters</li>
                <li style="margin-bottom: 0;">Avoid using personal information or common words</li>
              </ul>
            </div>
            
            <!-- Alternative Link */}
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
              <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">Can't click the button?</h4>
              <p style="color: #92400e; font-size: 14px; margin: 0 0 10px 0;">Copy and paste this link into your browser:</p>
              <p style="color: #92400e; font-size: 12px; word-break: break-all; background: rgba(251, 191, 36, 0.3); padding: 8px; border-radius: 4px; margin: 0;">${resetUrl}</p>
            </div>
            
            <!-- Need Help Section -->}
            <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #8b5cf6;">
              <h4 style="color: #7c3aed; margin: 0 0 12px 0; font-size: 14px; font-weight: bold;">🤔 Need Help?</h4>
              <p style="color: #7c3aed; font-size: 14px; margin: 0 0 10px 0;">If you're having trouble resetting your password or didn't request this reset:</p>
              <ul style="color: #7c3aed; font-size: 14px; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 4px;">Reply to this email for support</li>
                <li style="margin-bottom: 0;">Check your account security in your profile settings</li>
              </ul>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">If you're having trouble, contact our support team.</p>
              <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 500;">Stay secure!<br>The Listora AI Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send password reset email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Password reset email error:', error)
    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    )
  }
}
