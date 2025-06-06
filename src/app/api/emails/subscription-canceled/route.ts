// src/app/api/emails/subscription-canceled/route.ts - ENHANCED VERSION
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, name, cancelDate } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if Resend API key exists (KEEP YOUR SMART CHECK)
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not found, skipping email send')
      return NextResponse.json({
        success: true,
        message: 'Email sending skipped - no API key',
      })
    }

    // Dynamic import of Resend to avoid build issues (KEEP YOUR GOOD PRACTICE)
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { data, error } = await resend.emails.send({
      from: 'Listora AI <support@resend.dev>', // Keep your domain choice
      to: [email],
      subject: "Subscription Canceled - We'll Miss You 💔",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Subscription Canceled - Listora AI</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
          <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Enhanced Header -->
            <div style="text-align: center; margin-bottom: 40px;">
              <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); width: 60px; height: 60px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="color: white; font-size: 24px;">💔</span>
              </div>
              <h1 style="color: #1f2937; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">Subscription Canceled</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">We're sorry to see you go, but we understand.</p>
            </div>
            
            <!-- Main Message -->
            <div style="background: #fef2f2; padding: 30px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #ef4444;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 20px;">Hi ${name || 'there'}, 👋</h2>
              <p style="margin: 0 0 15px 0; color: #374151; font-size: 16px; line-height: 1.6;">Your Listora AI subscription has been successfully canceled. You'll continue to have access to your current plan until:</p>
              <div style="background: white; padding: 16px; border-radius: 8px; text-align: center; margin: 15px 0;">
                <strong style="color: #ef4444; font-size: 18px;">${cancelDate || 'your next billing date'}</strong>
              </div>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">After this date, you'll automatically be moved to our free Starter plan.</p>
            </div>
            
            <!-- What Happens Next Section */}
            <div style="margin-bottom: 30px;">
              <h3 style="color: #1f2937; margin: 0 0 20px 0; font-size: 18px;">📋 What happens next:</h3>
              <div style="space-y: 12px;">
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px; padding: 12px; background: #f0fdf4; border-radius: 8px;">
                  <span style="background: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; flex-shrink: 0;">✓</span>
                  <span style="color: #374151; font-size: 14px;">Continue using all premium features until ${cancelDate || 'your billing date'}</span>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px; padding: 12px; background: #eff6ff; border-radius: 8px;">
                  <span style="background: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; flex-shrink: 0;">📱</span>
                  <span style="color: #374151; font-size: 14px;">Access to Starter plan (10 generations/month) after cancellation</span>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px; padding: 12px; background: #fefbf3; border-radius: 8px;">
                  <span style="background: #f59e0b; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; flex-shrink: 0;">💾</span>
                  <span style="color: #374151; font-size: 14px;">All your existing content and images remain accessible forever</span>
                </div>
                <div style="display: flex; align-items: flex-start; margin-bottom: 12px; padding: 12px; background: #faf5ff; border-radius: 8px;">
                  <span style="background: #8b5cf6; color: white; width: 24px; height: 24px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 12px; flex-shrink: 0;">🔄</span>
                  <span style="color: #374151; font-size: 14px;">Reactivate anytime with just one click in your billing settings</span>
                </div>
              </div>
            </div>
            
            <!-- Feedback Section */}
            <div style="background: #e0f2fe; border-left: 4px solid #0288d1; padding: 20px; border-radius: 8px; margin: 30px 0;">
              <h4 style="color: #01579b; margin: 0 0 12px 0; font-size: 16px; font-weight: bold;">💝 Help us improve</h4>
              <p style="margin: 0 0 12px 0; color: #0277bd; font-size: 14px;">We'd love to know what we could have done better. Your feedback helps us build a product that truly serves content creators like you.</p>
              <p style="margin: 0; color: #0288d1; font-size: 13px; font-style: italic;">Was it pricing, features, ease of use, or something else? Every response helps us improve.</p>
            </div>
            
            <!-- Special Offer (Optional) -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 12px; margin: 30px 0; text-align: center;">
              <h4 style="margin: 0 0 12px 0; font-size: 18px;">🎁 Changed your mind?</h4>
              <p style="margin: 0 0 16px 0; font-size: 14px; opacity: 0.9;">We miss you already! If you want to give us another try, your account is ready to reactivate.</p>
              <p style="margin: 0; font-size: 13px; opacity: 0.8;">All your content, settings, and preferences are exactly as you left them.</p>
            </div>
            
            <!-- Action Buttons */}
            <div style="text-align: center; margin: 40px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/profile?tab=billing" 
                 style="background: #4f46e5; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 0 8px 12px 8px; font-size: 14px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                🔄 Reactivate Subscription
              </a>
              <a href="mailto:support@resend.dev?subject=Feedback%20on%20Cancellation&body=Hi%20Listora%20AI%20team,%0A%0AI%20recently%20canceled%20my%20subscription%20and%20wanted%20to%20share%20feedback:%0A%0A" 
                 style="background: #6b7280; color: white; padding: 16px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; margin: 0 8px 12px 8px; font-size: 14px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                💬 Share Feedback
              </a>
            </div>
            
            <!-- Footer */}
            <div style="text-align: center; padding-top: 30px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">Thank you for being part of the Listora AI community.</p>
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 20px 0;">We hope to see you again soon! 🚀</p>
              <p style="color: #374151; font-size: 14px; margin: 0; font-weight: 500;">The Listora AI Team</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send cancellation email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Cancellation email error:', error)
    return NextResponse.json(
      { error: 'Failed to send cancellation email' },
      { status: 500 }
    )
  }
}
