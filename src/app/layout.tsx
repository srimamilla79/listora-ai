import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import GoogleTag from '@/components/GoogleTag'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Listora AI - AI-Powered Product Content Generator',
  description:
    'Transform your product listings with AI-generated content. Create compelling descriptions, optimize for conversions, and scale your content creation with intelligent automation.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleTag />
        {children}
      </body>
    </html>
  )
}
