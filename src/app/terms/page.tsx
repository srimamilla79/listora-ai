// src/app/terms/page.tsx - Enhanced for Maximum Legal Protection
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - UPDATED */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center">
              <ListoraAILogo size="header" showText={true} />
            </Link>
            <nav className="flex space-x-6">
              <Link href="/" className="text-gray-600 hover:text-slate-600">
                Home
              </Link>
              <Link
                href="/login"
                className="text-gray-600 hover:text-slate-600"
              >
                Login
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Terms of Service
          </h1>

          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> June 4, 2025
            <br />
            <strong>Last Updated:</strong> June 4, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Acceptance of Terms and Binding Agreement
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Listora AI ("Company," "we," "our," or "us"). These
                Terms of Service ("Terms," "Agreement") constitute a legally
                binding agreement between you ("User," "you," or "your") and
                Listora AI regarding your use of our AI-powered e-commerce
                content generation platform, website, mobile applications, and
                all related services (collectively, the "Service").
              </p>
              <p className="text-gray-700 font-medium">
                IMPORTANT: BY ACCESSING, USING, OR REGISTERING FOR OUR SERVICE,
                YOU EXPRESSLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
                AGREE TO BE BOUND BY THESE TERMS. IF YOU DO NOT AGREE TO THESE
                TERMS, DO NOT USE OUR SERVICE.
              </p>
              <p className="text-gray-700 leading-relaxed">
                These Terms apply to all users, including visitors, registered
                users, and premium subscribers. By using our Service, you
                represent that you are at least 18 years old and have the legal
                capacity to enter into this Agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Description of Service and AI Technology
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Listora AI provides an artificial intelligence-powered platform
                designed to help users generate e-commerce content, including
                but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>AI-generated product descriptions and marketing copy</li>
                <li>
                  Content optimization for multiple e-commerce platforms
                  (Amazon, Shopify, Etsy, Instagram, etc.)
                </li>
                <li>Image processing, editing, and background removal tools</li>
                <li>
                  Content templates, variations, and customization options
                </li>
                <li>Export capabilities and platform integrations</li>
                <li>Analytics and performance tracking tools</li>
              </ul>
              <p className="text-gray-700 font-medium">
                AI Disclaimer: Our Service uses artificial intelligence and
                machine learning algorithms. While we strive for accuracy and
                quality, AI-generated content may contain errors, inaccuracies,
                or inappropriate material. You are solely responsible for
                reviewing, editing, and verifying all content before use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. User Registration and Account Security
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.1 Account Creation Requirements
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  You must provide accurate, current, and complete information
                  during registration
                </li>
                <li>
                  You must be at least 18 years old or the age of majority in
                  your jurisdiction
                </li>
                <li>You may only create one account per person or entity</li>
                <li>
                  You must verify your email address before accessing certain
                  features
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.2 Account Security and Responsibility
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  You are solely responsible for maintaining the confidentiality
                  of your login credentials
                </li>
                <li>
                  You are fully responsible for all activities that occur under
                  your account
                </li>
                <li>
                  You must immediately notify us of any suspected unauthorized
                  use of your account
                </li>
                <li>
                  We are not liable for any loss or damage arising from
                  unauthorized account access
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.3 Account Suspension and Termination
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend, disable, or terminate your
                account at any time, with or without notice, for any violation
                of these Terms or any reason we deem appropriate in our sole
                discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Acceptable Use Policy and Prohibited Activities
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.1 Prohibited Content Generation
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You agree NOT to use our Service to generate content that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Is illegal, harmful, threatening, abusive, harassing,
                  defamatory, or discriminatory
                </li>
                <li>Contains false, misleading, or deceptive product claims</li>
                <li>
                  Infringes on intellectual property rights, trademarks, or
                  copyrights of others
                </li>
                <li>
                  Promotes illegal activities, violence, or harm to individuals
                  or groups
                </li>
                <li>
                  Contains adult content, pornography, or sexually explicit
                  material
                </li>
                <li>
                  Violates platform policies of e-commerce sites (Amazon, eBay,
                  etc.)
                </li>
                <li>
                  Constitutes spam, bulk messaging, or unwanted commercial
                  communications
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.2 Technical Restrictions
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Do not attempt to reverse engineer, decompile, or extract our
                  AI models
                </li>
                <li>
                  Do not use automated tools, bots, or scripts to access our
                  Service
                </li>
                <li>
                  Do not attempt to overwhelm our servers or infrastructure
                </li>
                <li>
                  Do not circumvent usage limits, security measures, or access
                  controls
                </li>
                <li>
                  Do not interfere with other users' access to or use of the
                  Service
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.3 Consequences of Violations
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Violation of this Acceptable Use Policy may result in immediate
                account suspension or termination, removal of content, legal
                action, and reporting to appropriate authorities. You may be
                held liable for damages resulting from prohibited use.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Intellectual Property Rights and Content Ownership
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.1 Our Intellectual Property
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service, including all software, AI models, algorithms,
                databases, content, trademarks, logos, and intellectual
                property, is owned by Listora AI and protected by copyright,
                trademark, patent, and other intellectual property laws. You
                acknowledge that we retain all rights, title, and interest in
                our intellectual property.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.2 Your Content and Data Rights
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of any original content, data, or materials
                you upload to our Service ("User Content"). However, by using
                our Service, you grant us certain rights as described below.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.3 License Grant to Listora AI
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                IMPORTANT LICENSE TERMS: By uploading or inputting content into
                our Service, you grant Listora AI a worldwide, non-exclusive,
                royalty-free, sublicensable, and transferable license to use,
                reproduce, modify, adapt, publish, translate, distribute, and
                display your User Content for the purposes of:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Providing and improving our Service</li>
                <li>Training and enhancing our AI models</li>
                <li>Developing new features and capabilities</li>
                <li>Analytics and service optimization</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.4 AI-Generated Content Ownership
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You own the content generated by our AI based on your inputs and
                prompts. However, you acknowledge that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  Similar content may be generated for other users based on
                  similar inputs
                </li>
                <li>
                  You are responsible for ensuring your use complies with all
                  applicable laws
                </li>
                <li>
                  You must verify that generated content does not infringe
                  third-party rights
                </li>
                <li>
                  We provide no warranties regarding the originality or legal
                  compliance of generated content
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Subscription Plans, Payment Terms, and Billing
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.1 Service Plans and Pricing
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service is offered through various subscription plans with
                different features, usage limits, and pricing. Current plan
                details and pricing are available on our website and may be
                updated from time to time with appropriate notice.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.2 Payment and Billing Terms
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Advance Payment:</strong> All subscription fees are
                  billed in advance on a monthly or annual basis
                </li>
                <li>
                  <strong>Automatic Renewal:</strong> Subscriptions
                  automatically renew unless cancelled before the renewal date
                </li>
                <li>
                  <strong>Payment Authorization:</strong> You authorize us to
                  charge your payment method for all fees
                </li>
                <li>
                  <strong>Failed Payments:</strong> Service may be suspended for
                  failed payments until resolved
                </li>
                <li>
                  <strong>Currency:</strong> All fees are in US Dollars unless
                  otherwise specified
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.3 Refund and Cancellation Policy
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                NO REFUNDS: All fees paid are non-refundable except as required
                by applicable law or as explicitly stated in these Terms. This
                includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>Subscription fees for completed billing periods</li>
                <li>Usage-based charges for completed services</li>
                <li>Upgrade or downgrade fee differences</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.4 Price Changes
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We may change our pricing at any time with at least 30 days'
                notice. Price changes will take effect at your next billing
                cycle. Continued use of the Service after a price change
                constitutes acceptance of the new pricing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Privacy, Data Protection, and AI Training
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your privacy is governed by our Privacy Policy, which is
                incorporated into these Terms by reference. Key points include:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  We collect and process your data as described in our Privacy
                  Policy
                </li>
                <li>
                  Your content may be used to train and improve our AI models
                </li>
                <li>
                  We implement industry-standard security measures to protect
                  your data
                </li>
                <li>
                  You have certain rights regarding your personal information
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                By using our Service, you consent to our data practices as
                described in our Privacy Policy and these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Service Availability and Modifications
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                8.1 Service Availability
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                While we strive to provide reliable service, we do not guarantee
                100% uptime or uninterrupted access. The Service may be
                temporarily unavailable due to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Scheduled maintenance and updates</li>
                <li>Technical difficulties or server issues</li>
                <li>Third-party service interruptions</li>
                <li>Force majeure events beyond our control</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                8.2 Service Modifications
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any
                aspect of our Service at any time, with or without notice. We
                are not liable for any modification, suspension, or
                discontinuation of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Disclaimers and Limitations of Warranties
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.1 AI Content Disclaimers
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                CRITICAL AI DISCLAIMER: Our AI generates content based on
                algorithms and training data. We make no representations or
                warranties regarding:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>
                  Accuracy, completeness, or reliability of generated content
                </li>
                <li>Suitability for any particular purpose or use case</li>
                <li>
                  Compliance with industry standards or platform requirements
                </li>
                <li>Freedom from errors, biases, or inappropriate content</li>
                <li>Originality or non-infringement of third-party rights</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.2 General Disclaimers
              </h3>
              <p className="text-gray-700 font-medium mb-4">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS.
                TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL
                WARRANTIES, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-1">
                <li>WARRANTIES OF MERCHANTABILITY</li>
                <li>WARRANTIES OF FITNESS FOR A PARTICULAR PURPOSE</li>
                <li>WARRANTIES OF NON-INFRINGEMENT</li>
                <li>
                  WARRANTIES THAT THE SERVICE WILL BE UNINTERRUPTED OR
                  ERROR-FREE
                </li>
                <li>
                  WARRANTIES REGARDING THE SECURITY OR TIMELINESS OF THE SERVICE
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Limitation of Liability and Damages
              </h2>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
                SHALL LISTORA AI, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR
                AFFILIATES BE LIABLE FOR ANY:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                  DAMAGES
                </li>
                <li>LOST PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES</li>
                <li>BUSINESS INTERRUPTION OR LOSS OF GOODWILL</li>
                <li>DAMAGES RESULTING FROM AI-GENERATED CONTENT</li>
                <li>
                  DAMAGES EXCEEDING THE AMOUNT PAID BY YOU IN THE 12 MONTHS
                  PRECEDING THE CLAIM
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Some jurisdictions do not allow the limitation of liability, so
                these limitations may not apply to you. In such cases, our
                liability is limited to the fullest extent permitted by law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Indemnification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  You agree to indemnify, defend, and hold harmless Listora AI
                  and its officers, directors, employees, agents, and affiliates
                  from and against any and all claims, damages, losses, costs,
                  and expenses (including reasonable attorneys' fees) arising
                  from or relating to:
                </strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Your use of the Service or violation of these Terms</li>
                <li>
                  Your User Content or any content you generate using our
                  Service
                </li>
                <li>Your violation of any third-party rights</li>
                <li>Your violation of any applicable laws or regulations</li>
                <li>Any misrepresentation made by you</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Termination
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                12.1 Termination by You
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may terminate your account at any time by canceling your
                subscription through your account settings or contacting our
                support team. Termination will be effective at the end of your
                current billing period.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                12.2 Termination by Us
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may suspend or terminate your account immediately, with or
                without notice, for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Violation of these Terms or our policies</li>
                <li>Non-payment of fees</li>
                <li>Suspicious or fraudulent activity</li>
                <li>Legal or regulatory requirements</li>
                <li>Any reason we deem appropriate in our sole discretion</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                12.3 Effects of Termination
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Upon termination: (a) your access to the Service will cease
                immediately; (b) you remain liable for all outstanding fees; (c)
                we may delete your account and data after a reasonable period;
                (d) all provisions that should survive termination will remain
                in effect.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Dispute Resolution and Arbitration
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.1 Mandatory Arbitration
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                PLEASE READ CAREFULLY: Any dispute, claim, or controversy
                arising out of or relating to these Terms or the Service shall
                be resolved through binding arbitration rather than in court,
                except for claims that may be brought in small claims court.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.2 Class Action Waiver
              </h3>
              <p className="text-gray-700 leading-relaxed">
                <strong>
                  YOU WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS.
                </strong>{' '}
                Any arbitration will be conducted on an individual basis and not
                as a class, collective, or representative action.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms are governed by and construed in accordance with the
                laws of the State of Delaware, United States, without regard to
                conflict of law principles. Any legal action not subject to
                arbitration shall be brought exclusively in the federal or state
                courts located in Delaware.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. General Provisions
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.1 Entire Agreement
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms, together with our Privacy Policy and any other
                policies referenced herein, constitute the entire agreement
                between you and Listora AI and supersede all prior agreements
                and understandings.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.2 Severability
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If any provision of these Terms is found to be unenforceable,
                the remaining provisions will remain in full force and effect.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.3 Assignment
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not assign these Terms without our written consent. We
                may assign these Terms at any time without notice.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.4 Force Majeure
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We are not liable for any failure to perform due to causes
                beyond our reasonable control, including natural disasters, war,
                terrorism, labor disputes, or government actions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                16. Changes to Terms
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We reserve the right to modify these Terms at any time. We will
                provide notice of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Posting updated Terms on our website with a new effective date
                </li>
                <li>Sending email notification to registered users</li>
                <li>Providing in-app notifications</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>
                  Your continued use of the Service after such modifications
                  constitutes acceptance of the updated Terms.
                </strong>{' '}
                If you do not agree to the modifications, you must stop using
                the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                17. Contact Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For questions about these Terms or our Service, please contact
                us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Legal Department:</strong> legal@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>General Support:</strong> support@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Business Inquiries:</strong> business@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Website:</strong>{' '}
                  <a
                    href="https://listora.ai"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    https://listora.ai
                  </a>
                </p>
                <p className="text-gray-700 mt-4">
                  <strong>Mailing Address:</strong>
                  <br />
                  Listora AI
                  <br />
                  24272 Yellow Hammer Ct
                  <br />
                  Aldie, VA, 20105
                  <br />
                  United States
                </p>
              </div>
            </section>

            <p className="text-gray-700 text-sm">
              Legal Notice: These Terms of Service were last updated on June 4,
              2025. This document represents our current terms and conditions
              and may be subject to legal review and modification. For the most
              current version, always refer to the terms posted on our website.
              BY USING OUR SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ AND
              UNDERSTOOD THESE TERMS.
            </p>
          </div>
        </div>
      </main>

      {/* Footer - UPDATED */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <ListoraAILogo size="sm" showText={false} />
              <span className="ml-2 text-lg font-semibold text-gray-900">
                Listora AI
              </span>
            </div>
            <div className="flex space-x-6">
              <Link
                href="/privacy"
                className="text-gray-600 hover:text-slate-600"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-gray-600 hover:text-slate-600"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-slate-600"
              >
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
