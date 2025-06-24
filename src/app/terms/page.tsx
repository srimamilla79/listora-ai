// src/app/terms/page.tsx - Enhanced for Maximum Legal Protection
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
            <strong>Effective Date:</strong> June 10, 2025
            <br />
            <strong>Last Updated:</strong> June 10, 2025
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
              <p className="text-gray-700 font-medium mb-4">
                IMPORTANT: BY ACCESSING, USING, OR REGISTERING FOR OUR SERVICE,
                YOU EXPRESSLY ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
                AGREE TO BE BOUND BY THESE TERMS, INCLUDING THE AI-SPECIFIC
                PROVISIONS, ARBITRATION CLAUSE, AND CLASS ACTION WAIVER. IF YOU
                DO NOT AGREE TO THESE TERMS, DO NOT USE OUR SERVICE.
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
                  (Amazon, Shopify, eBay, Etsy, Instagram, etc.)
                </li>
                <li>
                  Voice-to-content generation and audio processing capabilities
                </li>
                <li>Image processing, editing, and background removal tools</li>
                <li>
                  Content templates, variations, and customization options
                </li>
                <li>Third-party platform integrations and publishing tools</li>
                <li>Export capabilities and bulk processing features</li>
                <li>Analytics and performance tracking tools</li>
              </ul>
              <p className="text-gray-700 font-medium mb-4">
                <strong>CRITICAL AI DISCLAIMER:</strong> Our Service uses
                artificial intelligence and machine learning algorithms that are
                inherently unpredictable and subject to limitations. While we
                strive for accuracy and quality, AI-generated content may
                contain errors, inaccuracies, biases, inappropriate material, or
                content that violates third-party platform policies. YOU ARE
                SOLELY RESPONSIBLE for reviewing, editing, verifying, and
                ensuring compliance of all content before use.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Export Control Notice:</strong> Our AI technology may be
                subject to export control laws. Access may be restricted in
                certain countries or for certain individuals or entities subject
                to sanctions.
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
                <li>
                  You may not register if you are located in a restricted
                  jurisdiction
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
                  unauthorized account access due to your failure to maintain
                  security
                </li>
                <li>
                  You agree to use strong passwords and enable two-factor
                  authentication when available
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.3 Account Suspension and Termination
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to suspend, disable, or terminate your
                account at any time, with or without notice, for any violation
                of these Terms, suspicious activity, legal requirements, or any
                reason we deem appropriate in our sole discretion.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Acceptable Use Policy and Prohibited Activities - ENHANCED
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
                  Shopify, Etsy, etc.)
                </li>
                <li>
                  Constitutes spam, bulk messaging, or unwanted commercial
                  communications
                </li>
                <li>
                  Promotes financial schemes, cryptocurrencies without proper
                  disclosure, or investment advice
                </li>
                <li>
                  Contains health claims, medical advice, or pharmaceutical
                  information without proper authorization
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.2 Third-Party Platform Compliance - CRITICAL
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                IMPORTANT PLATFORM LIABILITY DISCLAIMER: You acknowledge that
                AI-generated content may violate third-party platform policies
                including but not limited to Amazon, Shopify, eBay, Etsy, and
                other e-commerce platforms. YOU ASSUME FULL RESPONSIBILITY FOR:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Platform compliance and policy adherence for all published
                  content
                </li>
                <li>
                  Account suspensions, bans, or penalties imposed by third-party
                  platforms
                </li>
                <li>
                  Financial losses resulting from platform policy violations
                </li>
                <li>
                  Removal of listings, loss of seller privileges, or account
                  restrictions
                </li>
                <li>Legal consequences arising from non-compliant content</li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  YOU HOLD LISTORA AI HARMLESS from any and all consequences
                  arising from third-party platform actions, policy violations,
                  or content rejections, regardless of whether such violations
                  were foreseeable or preventable.
                </strong>
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.3 Technical Restrictions
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Do not attempt to reverse engineer, decompile, or extract our
                  AI models or proprietary algorithms
                </li>
                <li>
                  Do not use automated tools, bots, or scripts to access our
                  Service beyond authorized API usage
                </li>
                <li>
                  Do not attempt to overwhelm our servers or infrastructure
                  through excessive requests
                </li>
                <li>
                  Do not circumvent usage limits, security measures, rate
                  limits, or access controls
                </li>
                <li>
                  Do not interfere with other users' access to or use of the
                  Service
                </li>
                <li>
                  Do not attempt to train competing AI models using our outputs
                  or proprietary data
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.4 Consequences of Violations
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Violation of this Acceptable Use Policy may result in immediate
                account suspension or termination, removal of content, legal
                action, reporting to appropriate authorities, and liability for
                damages. You may be held liable for all costs and damages
                resulting from prohibited use, including legal fees and
                third-party claims.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Intellectual Property Rights and Content Ownership - ENHANCED
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.1 Our Intellectual Property
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                The Service, including all software, AI models, algorithms,
                databases, content, trademarks, logos, and intellectual
                property, is owned by Listora AI and protected by copyright,
                trademark, patent, trade secret, and other intellectual property
                laws. You acknowledge that we retain all rights, title, and
                interest in our intellectual property.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.2 Your Content and Data Rights
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You retain ownership of any original content, data, or materials
                you upload to our Service ("User Content"). However, by using
                our Service, you grant us extensive rights as described below.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.3 Comprehensive License Grant to Listora AI
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                CRITICAL LICENSE TERMS: By uploading or inputting content into
                our Service, you grant Listora AI a worldwide, perpetual,
                irrevocable, non-exclusive, royalty-free, sublicensable, and
                transferable license to use, reproduce, modify, adapt, publish,
                translate, distribute, display, and create derivative works from
                your User Content for the purposes of:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Providing and improving our Service</li>
                <li>Training and enhancing our AI models and algorithms</li>
                <li>Developing new features and capabilities</li>
                <li>Analytics and service optimization</li>
                <li>
                  Creating training datasets for internal and partner AI
                  development
                </li>
                <li>Research and development purposes</li>
                <li>
                  Marketing and promotional activities (with anonymization)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.4 AI-Generated Content Ownership and Risks
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You own the content generated by our AI based on your inputs and
                prompts, subject to the following important limitations:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Non-Exclusivity:</strong> Similar or identical content
                  may be generated for other users based on similar inputs
                </li>
                <li>
                  <strong>No Originality Guarantee:</strong> We do not warrant
                  that generated content is original or free from third-party
                  rights
                </li>
                <li>
                  <strong>Compliance Responsibility:</strong> You must verify
                  that generated content complies with all applicable laws and
                  third-party rights
                </li>
                <li>
                  <strong>Platform Policy Risk:</strong> Generated content may
                  violate third-party platform policies
                </li>
                <li>
                  <strong>Copyright Risk:</strong> AI-generated content may
                  inadvertently infringe copyrights or other IP rights
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.5 DMCA and Copyright Compliance
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We respect intellectual property rights and comply with the
                Digital Millennium Copyright Act (DMCA). If you believe content
                on our Service infringes your copyright:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Send a DMCA takedown notice to our designated agent at{' '}
                  <a
                    href="mailto:dmca@listora.ai"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    dmca@listora.ai
                  </a>
                </li>
                <li>
                  Include all required DMCA notice elements (identification of
                  work, location, contact info, good faith statement, etc.)
                </li>
                <li>We will process valid takedown notices promptly</li>
                <li>Users may submit counter-notices for wrongful takedowns</li>
                <li>Repeat infringers' accounts will be terminated</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Subscription Plans, Payment Terms, and Billing - ENHANCED
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
                  charge your payment method for all fees and give us permission
                  to obtain updated payment information
                </li>
                <li>
                  <strong>Failed Payments:</strong> Service may be suspended
                  immediately for failed payments until resolved
                </li>
                <li>
                  <strong>Currency:</strong> All fees are in US Dollars unless
                  otherwise specified
                </li>
                <li>
                  <strong>Taxes:</strong> You are responsible for all applicable
                  taxes, which may be added to your bill
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.3 No Refund Policy - STRICT
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                NO REFUNDS: ALL FEES PAID ARE STRICTLY NON-REFUNDABLE except as
                required by applicable law. This includes but is not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Subscription fees for any completed billing periods</li>
                <li>
                  Usage-based charges for completed AI generation services
                </li>
                <li>Upgrade or downgrade fee differences</li>
                <li>Fees for services accessed or used, even partially</li>
                <li>
                  Fees paid prior to account termination for policy violations
                </li>
                <li>Charges resulting from unauthorized account access</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.4 Chargeback and Dispute Prevention
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Chargeback Prohibition:</strong> You agree to contact us
                directly to resolve any billing disputes before initiating
                chargebacks or payment disputes with your financial institution.
                Unauthorized chargebacks may result in:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Immediate account termination</li>
                <li>Collection of chargeback fees and legal costs</li>
                <li>Reporting to credit agencies and fraud databases</li>
                <li>Legal action for damages and fees</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.5 Price Changes
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We may change our pricing at any time with at least 30 days'
                notice for existing subscribers. Price changes will take effect
                at your next billing cycle. Continued use of the Service after a
                price change constitutes acceptance of the new pricing.
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
                  <strong>AI Training Consent:</strong> Your content will be
                  used to train and improve our AI models indefinitely
                </li>
                <li>
                  We implement industry-standard security measures to protect
                  your data
                </li>
                <li>
                  You have certain rights regarding your personal information,
                  subject to AI training limitations
                </li>
                <li>
                  Data deletion requests cannot reverse AI training that has
                  already occurred
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                By using our Service, you consent to our data practices as
                described in our Privacy Policy and these Terms, including the
                use of your content for AI model training.
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
                <li>
                  Third-party service interruptions (AI providers, cloud
                  hosting)
                </li>
                <li>Force majeure events beyond our control</li>
                <li>Security incidents or necessary emergency measures</li>
                <li>Legal or regulatory requirements</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                8.2 Service Modifications
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any
                aspect of our Service at any time, with or without notice. This
                includes changes to AI models, features, pricing, or terms. We
                are not liable for any modification, suspension, or
                discontinuation of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Disclaimers and Limitations of Warranties - COMPREHENSIVE
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.1 Critical AI Content Disclaimers
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                ESSENTIAL AI DISCLAIMER: Our AI generates content based on
                algorithms, training data, and machine learning models that are
                inherently unpredictable and subject to biases, errors, and
                limitations. WE MAKE NO REPRESENTATIONS OR WARRANTIES REGARDING:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Accuracy, completeness, reliability, or appropriateness of
                  generated content
                </li>
                <li>
                  Suitability for any particular purpose, platform, or use case
                </li>
                <li>
                  Compliance with industry standards, platform requirements, or
                  legal regulations
                </li>
                <li>
                  Freedom from errors, biases, inappropriate content, or harmful
                  outputs
                </li>
                <li>
                  Originality, uniqueness, or non-infringement of third-party
                  rights
                </li>
                <li>
                  Compliance with Amazon, Shopify, eBay, Etsy, or other platform
                  policies
                </li>
                <li>
                  Commercial success, performance, or effectiveness of generated
                  content
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.2 User Assumption of AI Risks
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                YOU EXPRESSLY ASSUME ALL RISKS related to AI-generated content
                including but not limited to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Copyright infringement claims and legal liability</li>
                <li>
                  Third-party platform policy violations and account penalties
                </li>
                <li>Regulatory non-compliance and legal consequences</li>
                <li>Commercial failures and financial losses</li>
                <li>Reputational damage from inappropriate content</li>
                <li>Algorithmic bias and discriminatory outputs</li>
                <li>Factual errors and misinformation</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.3 General Service Disclaimers
              </h3>
              <p className="text-gray-700 font-medium mb-4">
                THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS
                WITHOUT ANY WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT
                PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, WHETHER EXPRESS,
                IMPLIED, OR STATUTORY, INCLUDING:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
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
                <li>WARRANTIES OF ACCURACY OR RELIABILITY</li>
                <li>WARRANTIES THAT DEFECTS WILL BE CORRECTED</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.4 Third-Party Platform Disclaimers
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We disclaim all responsibility for third-party platforms'
                policies, actions, or decisions. We do not guarantee that
                AI-generated content will comply with any third-party platform's
                current or future policies, and we are not responsible for any
                consequences resulting from platform policy violations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Limitation of Liability and Damages - MAXIMUM PROTECTION
              </h2>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
                SHALL LISTORA AI, ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS,
                AFFILIATES, OR SUPPLIERS BE LIABLE FOR ANY:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR
                  PUNITIVE DAMAGES
                </li>
                <li>
                  LOST PROFITS, REVENUE, DATA, BUSINESS OPPORTUNITIES, OR
                  GOODWILL
                </li>
                <li>BUSINESS INTERRUPTION OR LOSS OF USE</li>
                <li>
                  DAMAGES RESULTING FROM AI-GENERATED CONTENT, INCLUDING
                  COPYRIGHT INFRINGEMENT CLAIMS
                </li>
                <li>
                  DAMAGES FROM THIRD-PARTY PLATFORM ACTIONS, POLICY VIOLATIONS,
                  OR ACCOUNT SUSPENSIONS
                </li>
                <li>
                  DAMAGES FROM SERVICE INTERRUPTIONS, DATA LOSS, OR SECURITY
                  BREACHES
                </li>
                <li>
                  DAMAGES EXCEEDING THE TOTAL AMOUNT PAID BY YOU IN THE 12
                  MONTHS PRECEDING THE CLAIM
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                Some jurisdictions do not allow the limitation of liability, so
                these limitations may not apply to you. In such cases, our
                liability is limited to the fullest extent permitted by law.
              </p>
              <p className="text-gray-700 font-medium leading-relaxed">
                <strong>AGGREGATE LIABILITY CAP:</strong> Our total liability to
                you for all claims arising from or related to the Service shall
                not exceed the lesser of (a) $100 or (b) the total amount paid
                by you to us in the 12 months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Comprehensive Indemnification
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  You agree to indemnify, defend, and hold harmless Listora AI
                  and its officers, directors, employees, agents, affiliates,
                  and suppliers from and against any and all claims, damages,
                  losses, costs, and expenses (including reasonable attorneys'
                  fees and court costs) arising from or relating to:
                </strong>
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Your use of the Service or violation of these Terms or our
                  policies
                </li>
                <li>
                  Your User Content or any content you generate, publish, or
                  distribute using our Service
                </li>
                <li>
                  Your violation of any third-party rights, including
                  intellectual property rights
                </li>
                <li>
                  Your violation of any applicable laws, regulations, or
                  third-party platform policies
                </li>
                <li>Any misrepresentation or breach of warranty made by you</li>
                <li>
                  Claims arising from AI-generated content you use or distribute
                </li>
                <li>
                  Third-party platform actions resulting from your use of our
                  Service
                </li>
                <li>
                  Any unauthorized access to your account due to your failure to
                  maintain security
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                This indemnification obligation will survive termination of
                these Terms and your use of the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Termination and Account Closure
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                12.1 Termination by You
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may terminate your account at any time by canceling your
                subscription through your account settings or contacting our
                support team. Termination will be effective at the end of your
                current billing period, and no refunds will be provided for
                unused portions of paid subscriptions.
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
                <li>Non-payment of fees or chargebacks</li>
                <li>Suspicious, fraudulent, or illegal activity</li>
                <li>Legal or regulatory requirements</li>
                <li>Abuse of our Service or resources</li>
                <li>Any reason we deem appropriate in our sole discretion</li>
                <li>Threat to the security or integrity of our Service</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                12.3 Effects of Termination
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Upon termination: (a) your access to the Service will cease
                immediately; (b) you remain liable for all outstanding fees and
                obligations; (c) we may delete your account and data after a
                reasonable period; (d) content used for AI training will remain
                in our systems; (e) all provisions that should survive
                termination will remain in effect, including indemnification,
                limitation of liability, and dispute resolution.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Mandatory Dispute Resolution and Arbitration
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.1 Mandatory Arbitration Agreement
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                PLEASE READ CAREFULLY: Any dispute, claim, or controversy
                arising out of or relating to these Terms, the Service, or our
                relationship shall be resolved through binding arbitration
                administered by the American Arbitration Association (AAA) under
                its Commercial Arbitration Rules, rather than in court, except
                for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Claims that may be brought in small claims court</li>
                <li>
                  Claims for injunctive relief to protect intellectual property
                </li>
                <li>
                  Claims related to the validity or enforceability of this
                  arbitration clause
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.2 Arbitration Procedures
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Arbitration will be conducted in Delaware, United States
                </li>
                <li>The arbitrator's decision will be final and binding</li>
                <li>
                  Each party will bear its own costs and attorneys' fees unless
                  the arbitrator decides otherwise
                </li>
                <li>
                  Discovery will be limited as determined by the arbitrator
                </li>
                <li>The arbitration will be confidential</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.3 Class Action and Collective Action Waiver
              </h3>
              <p className="text-gray-700 font-medium leading-relaxed mb-4">
                <strong>
                  YOU WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS,
                  COLLECTIVE ACTIONS, OR REPRESENTATIVE PROCEEDINGS.
                </strong>{' '}
                Any arbitration will be conducted on an individual basis and not
                as a class, collective, or representative action. You may not
                consolidate or join claims with other users.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                13.4 Opt-Out Right
              </h3>
              <p className="text-gray-700 leading-relaxed">
                You may opt out of this arbitration agreement by sending written
                notice to legal@listora.ai within 30 days of first accepting
                these Terms. Your notice must include your name, address, and a
                clear statement that you wish to opt out of arbitration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. Governing Law and Jurisdiction
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms are governed by and construed in accordance with the
                laws of the State of Delaware, United States, without regard to
                conflict of law principles. Any legal action not subject to
                arbitration shall be brought exclusively in the federal or state
                courts located in Delaware.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>International Users:</strong> If you are accessing our
                Service from outside the United States, you acknowledge that you
                are subject to U.S. law and jurisdiction for all matters related
                to the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. Export Controls and Sanctions Compliance
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service and AI technology may be subject to export control
                laws and regulations. You represent and warrant that:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  You are not located in a country subject to U.S. government
                  embargo
                </li>
                <li>
                  You are not on any U.S. government restricted or denied party
                  list
                </li>
                <li>
                  You will comply with all applicable export control and
                  sanctions laws
                </li>
                <li>
                  You will not use our Service for any prohibited end use or end
                  user
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to restrict access to our Service based on
                geographic location or other factors to ensure compliance with
                applicable laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                16. General Provisions
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.1 Entire Agreement
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                These Terms, together with our Privacy Policy and any other
                policies referenced herein, constitute the entire agreement
                between you and Listora AI and supersede all prior agreements,
                understandings, and communications, whether written or oral.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.2 Severability
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If any provision of these Terms is found to be unenforceable or
                invalid, the remaining provisions will remain in full force and
                effect, and the invalid provision will be modified to the
                minimum extent necessary to make it enforceable.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.3 Assignment
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You may not assign, transfer, or delegate these Terms or your
                rights and obligations without our prior written consent. We may
                assign these Terms at any time without notice, including in
                connection with a merger, acquisition, or sale of assets.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.4 No Waiver
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our failure to enforce any provision of these Terms will not
                constitute a waiver of that provision or any other provision.
                Any waiver must be in writing and signed by an authorized
                representative of Listora AI.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.5 Force Majeure
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We are not liable for any failure to perform due to causes
                beyond our reasonable control, including natural disasters, war,
                terrorism, labor disputes, government actions, pandemics, or
                third-party service interruptions.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                16.6 Survival
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Provisions that by their nature should survive termination will
                survive, including intellectual property rights,
                indemnification, limitation of liability, dispute resolution,
                and governing law.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                17. Changes to Terms
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
                <li>
                  For significant changes, requiring affirmative acceptance
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>
                  Your continued use of the Service after such modifications
                  constitutes acceptance of the updated Terms.
                </strong>{' '}
                If you do not agree to the modifications, you must stop using
                the Service and may terminate your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                18. Contact Information
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
                  <strong>DMCA Agent:</strong> dmca@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Privacy Officer:</strong> privacy@listora.ai
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
                  Listora AI Legal Department
                  <br />
                  24272 Yellow Hammer Ct
                  <br />
                  Aldie, VA, 20105
                  <br />
                  United States
                </p>
              </div>
            </section>

            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 text-sm font-medium mb-2">
                <strong>IMPORTANT LEGAL NOTICE:</strong>
              </p>
              <p className="text-red-700 text-sm">
                These Terms of Service were last updated on June 10, 2025. This
                document represents our current terms and conditions and has
                been designed to provide maximum legal protection. BY USING OUR
                SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND
                AGREE TO BE BOUND BY THESE TERMS, INCLUDING THE ARBITRATION
                CLAUSE, CLASS ACTION WAIVER, AND AI-SPECIFIC PROVISIONS. If you
                do not agree to these terms, do not use our Service.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
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
