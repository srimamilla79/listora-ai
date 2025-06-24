// src/app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { name, email, subject, message, priority } = await request.json()

    // Create transporter for GoDaddy email (FIXED: createTransport not createTransporter)
    const transporter = nodemailer.createTransport({
      host: 'smtpout.secureserver.net',
      port: 465,
      secure: true, // Use SSL
      auth: {
        user: process.env.SMTP_USER, // support@listora.ai
        pass: process.env.SMTP_PASS, // Your email password
      },
    })

    // Send email
    await transporter.sendMail({
      from: 'support@listora.ai',
      to: 'support@listora.ai',
      subject: `[Contact Form - ${priority.toUpperCase()}] ${subject}`,
      html: `
        <h3>New Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Priority:</strong> ${priority}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
        <hr>
        <p><small>Submitted: ${new Date().toLocaleString()}</small></p>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
