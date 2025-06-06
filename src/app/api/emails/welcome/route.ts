// Enhanced Welcome Email API - src/app/api/emails/welcome/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const firstName = name || email.split('@')[0]

    const { data, error } = await resend.emails.send({
      from: 'Listora AI <onboarding@resend.dev>',
      to: email,
      subject: "🎉 Welcome to Listora AI - Let's Create Amazing Content!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to Listora AI</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
                .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
                .header { background: linear-gradient(135deg, #475569 0%, #64748b 100%); padding: 40px 30px; text-align: center; position: relative; }
                .logo { color: #ffffff; font-size: 32px; font-weight: bold; margin-bottom: 10px; position: relative; z-index: 1; }
                .subtitle { color: #e2e8f0; font-size: 18px; font-weight: 500; position: relative; z-index: 1; }
                .content { padding: 40px 30px; }
                .greeting { color: #1e293b; font-size: 28px; font-weight: bold; margin-bottom: 20px; text-align: center; }
                .message { color: #475569; font-size: 16px; line-height: 1.7; margin-bottom: 25px; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #475569 0%, #64748b 100%); color: #ffffff !important; text-decoration: none; padding: 18px 36px; border-radius: 12px; font-weight: 600; text-align: center; margin: 25px 0; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(71, 85, 105, 0.3); }
                .features { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0; }
                .feature { background-color: #f8fafc; padding: 20px; border-radius: 12px; border-left: 4px solid #475569; }
                .feature-icon { font-size: 24px; margin-bottom: 10px; }
                .feature-title { color: #1e293b; font-weight: 600; font-size: 16px; margin-bottom: 8px; }
                .feature-desc { color: #64748b; font-size: 14px; line-height: 1.5; }
                .stats { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); padding: 25px; border-radius: 12px; margin: 30px 0; text-align: center; }
                .stat { display: inline-block; margin: 0 20px; }
                .stat-number { color: #475569; font-size: 24px; font-weight: bold; display: block; }
                .stat-label { color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
                .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: #64748b; font-size: 14px; }
                .social-links { margin: 20px 0; }
                .social-link { display: inline-block; margin: 0 10px; color: #475569; text-decoration: none; font-weight: 500; }
                @media (max-width: 600px) {
                    .features { grid-template-columns: 1fr; }
                    .container { margin: 0 10px; }
                    .content { padding: 30px 20px; }
                }
            </style>
        </head>
        <body>
            <div style="padding: 20px;">
                <div class="container">
                    <div class="header">
                        <div class="logo">✨ Listora AI</div>
                        <div class="subtitle">AI-Powered E-commerce Content Generation</div>
                    </div>
                    
                    <div class="content">
                        <h1 class="greeting">Welcome, ${firstName}! 🎉</h1>
                        
                        <p class="message">
                            You've just joined <strong>thousands of successful e-commerce businesses</strong> who use Listora AI to create compelling product descriptions and marketing copy that converts browsers into buyers.
                        </p>
                        
                        <p class="message">
                            Your AI-powered content creation journey starts now. Let's generate your first amazing product description:
                        </p>
                        
                        <div style="text-align: center;">
                            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/generate" class="cta-button">
                                🚀 Start Creating Content
                            </a>
                        </div>
                        
                        <div class="stats">
                            <div class="stat">
                                <span class="stat-number">10,000+</span>
                                <span class="stat-label">Happy Creators</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">50,000+</span>
                                <span class="stat-label">Contents Generated</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">40%</span>
                                <span class="stat-label">Sales Increase</span>
                            </div>
                        </div>
                        
                        <div class="features">
                            <div class="feature">
                                <div class="feature-icon">⚡</div>
                                <div class="feature-title">Lightning Fast</div>
                                <div class="feature-desc">Generate compelling product descriptions in seconds, not hours</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">🎯</div>
                                <div class="feature-title">Multi-Platform</div>
                                <div class="feature-desc">Optimized for Amazon, Shopify, Etsy, Instagram & more</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">🧠</div>
                                <div class="feature-title">AI-Powered</div>
                                <div class="feature-desc">Advanced AI creates high-converting, SEO-optimized content</div>
                            </div>
                            <div class="feature">
                                <div class="feature-icon">📈</div>
                                <div class="feature-title">Proven Results</div>
                                <div class="feature-desc">Increase your conversion rates and boost sales immediately</div>
                            </div>
                        </div>
                        
                        <p class="message">
                            <strong>Quick Start Tips:</strong>
                        </p>
                        <ul style="color: #475569; line-height: 1.8; padding-left: 20px;">
                            <li>Upload clear product images for best results</li>
                            <li>Provide detailed product information and key features</li>
                            <li>Choose your target platform (Amazon, Shopify, etc.)</li>
                            <li>Let our AI craft compelling, conversion-focused content</li>
                        </ul>
                        
                        <p class="message">
                            Need help getting started? Our support team is here to help you succeed. 
                            <a href="mailto:support@listora.ai" style="color: #475569; font-weight: 600;">Contact us anytime!</a>
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>Listora AI</strong> - Transform Your E-commerce Content</p>
                        <div class="social-links">
                            <a href="#" class="social-link">Help Center</a>
                            <a href="#" class="social-link">Privacy Policy</a>
                            <a href="#" class="social-link">Terms of Service</a>
                        </div>
                        <p style="margin-top: 20px; font-size: 12px;">
                            You're receiving this email because you signed up for Listora AI. 
                            <a href="#" style="color: #475569;">Unsubscribe</a> if you no longer wish to receive updates.
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Welcome email error:', error)
      return NextResponse.json(
        { error: 'Failed to send welcome email' },
        { status: 500 }
      )
    }

    console.log('✅ Welcome email sent successfully:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Welcome email API error:', error)
    return NextResponse.json(
      { error: 'Failed to send welcome email' },
      { status: 500 }
    )
  }
}
