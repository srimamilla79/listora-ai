// src/components/GoogleTag.tsx
'use client'

import Script from 'next/script'

export default function GoogleTag() {
  return (
    <>
      {/* Google Tag Manager - Script */}
      <Script id="google-tag-manager" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','GTM-NH8RFX4L');
        `}
      </Script>

      {/* Existing Google Ads tag (gtag.js) */}
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=AW-17311261833"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'AW-17311261833');
        `}
      </Script>
    </>
  )
}
