// src/app/privacy/page.tsx
'use client'

import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function PrivacyPolicyPage() {
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
            Privacy Policy
          </h1>

          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> August 02, 2025
            <br />
            <strong>Last Updated:</strong> August 02, 2025
            <br />
            <strong className="text-green-600">
              Version 2.0 - Your Data Is Never Used for AI Training
            </strong>
          </p>

          {/* Privacy First Notice */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-green-900 mb-2">
              🔒 Your Data Privacy is Our #1 Priority
            </h2>
            <p className="text-green-800 mb-3">
              Unlike many AI companies, we do <strong>NOT</strong> use your
              content to train our AI models. Your data remains exclusively
              yours.
            </p>
            <ul className="list-disc pl-6 text-green-800 space-y-1">
              <li>We never use your content for AI training</li>
              <li>We never share your data with other users</li>
              <li>We never sell your personal information</li>
              <li>
                You can request data deletion anytime via privacy@listora.ai
              </li>
            </ul>
          </div>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Listora AI ("Company," "we," "our," or "us"). This
                Privacy Policy describes how we collect, use, and protect your
                personal information when you use our AI-powered e-commerce
                content generation platform and services (the "Service").
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  IMPORTANT PRIVACY COMMITMENT: Unlike many AI companies, we do
                  NOT use your content to train our AI models. Your data remains
                  exclusively yours. This policy explains our privacy-first
                  approach in detail.
                </strong>
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                By using our Service, you consent to the practices described in
                this Privacy Policy. If you have questions about these
                practices, please contact us at{' '}
                <a
                  href="mailto:privacy@listora.ai"
                  className="text-slate-600 hover:text-slate-800"
                >
                  privacy@listora.ai
                </a>{' '}
                before using our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Our Privacy Principles
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Before detailing our practices, we want to be clear about our
                core privacy principles:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li className="font-semibold">
                  YOUR DATA IS NEVER USED FOR AI TRAINING
                </li>
                <li className="font-semibold">
                  We do NOT sell your personal information
                </li>
                <li>Your content is visible only to you</li>
                <li>We use industry-standard security measures</li>
                <li>We are transparent about our data practices</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Information We Collect
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.1 Information You Provide
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Account Information:</strong> Email, name, password,
                  profile details
                </li>
                <li>
                  <strong>Payment Information:</strong> Processed securely by
                  third-party payment processors
                </li>
                <li>
                  <strong>Content Data:</strong> Product names, descriptions,
                  features you input
                </li>
                <li>
                  <strong>Voice Data:</strong> Audio recordings when using voice
                  features (processed and immediately discarded)
                </li>
                <li>
                  <strong>Images:</strong> Product images you upload for
                  processing
                </li>
                <li>
                  <strong>Communications:</strong> Support requests, feedback,
                  correspondence
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.2 Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Log Data:</strong> Error reports and performance
                  metrics for debugging
                </li>
                <li>
                  <strong>Cookies:</strong> Session cookies for authentication
                  (see Section 8 for details)
                </li>
                <li>
                  <strong>Basic Technical Data:</strong> Information necessary
                  for the service to function (such as temporary session data)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.3 Information from Third Parties
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We may receive limited information from:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>OAuth providers when you connect marketplace accounts</li>
                <li>Payment processors for transaction verification</li>
                <li>Analytics services for usage insights</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Your Content Privacy - NO AI Training
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <p className="text-blue-900 font-bold text-lg mb-3">
                  This section is critically important and unique to Listora AI:
                </p>
              </div>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.1 We DO NOT Use Your Content for AI Training
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <p className="text-green-900 font-bold mb-3">
                  EXPLICIT COMMITMENT: We do NOT:
                </p>
                <ul className="list-disc pl-6 text-green-800 space-y-2">
                  <li>Train our AI models with your data</li>
                  <li>
                    Use your product descriptions, images, or voice inputs for
                    model improvement
                  </li>
                  <li>
                    Share your content with AI providers for their training
                    purposes
                  </li>
                  <li>Create training datasets from your information</li>
                  <li>Allow our AI to "learn" from your specific content</li>
                </ul>
              </div>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.2 How We Actually Handle Your Content
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>TRANSIENT PROCESSING:</strong> Your content is sent to
                  AI providers (like OpenAI) solely for one-time processing
                </li>
                <li>
                  <strong>NO AI TRAINING ON YOUR DATA:</strong> OpenAI does not
                  train their models on data submitted through their API. They
                  may temporarily retain data for up to 30 days solely for
                  safety and abuse monitoring
                </li>
                <li>
                  <strong>API DATA PROTECTION:</strong> Per OpenAI's standard
                  API data usage policies, your content is not used to improve
                  their models, not shared with others, and not used for any
                  purpose beyond providing you results
                </li>
                <li>
                  <strong>IMMEDIATE RESULTS:</strong> Content is processed in
                  real-time and results are returned immediately
                </li>
                <li>
                  <strong>YOUR STORAGE ONLY:</strong> Generated content is
                  stored in your account for your exclusive access
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.3 Technical Implementation
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  We use pre-trained models (GPT-3.5, GPT-4) that don't adapt to
                  individual users
                </li>
                <li>
                  Each request is stateless - no learning occurs between
                  requests
                </li>
                <li>Voice data is transcribed and immediately discarded</li>
                <li>Images are processed for the specific request only</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. How We Use Your Information
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.1 To Provide Our Service
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Process your requests for content generation</li>
                <li>Store your generated content for your access</li>
                <li>Enable voice and image processing features</li>
                <li>Manage your account and subscriptions</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.2 For Business Operations
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Process payments and manage billing</li>
                <li>Send service announcements and updates</li>
                <li>Provide customer support</li>
                <li>Analyze aggregate usage patterns (anonymized)</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.3 For Security and Legal Compliance
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Prevent fraud and abuse</li>
                <li>Comply with legal obligations</li>
                <li>Protect our rights and safety</li>
                <li>Enforce our Terms of Service</li>
              </ul>

              <p className="text-gray-700 font-medium mt-4">
                IMPORTANT: None of these uses include training AI models with
                your content.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Information Sharing
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We share your information only in these limited circumstances:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.1 Service Providers
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We work with trusted providers who help us operate our Service:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Cloud hosting (AWS)</strong> - stores your data
                  securely
                </li>
                <li>
                  <strong>Payment processors (Stripe)</strong> - handles
                  transactions
                </li>
                <li>
                  <strong>Email services</strong> - sends notifications
                </li>
                <li>
                  <strong>Analytics (anonymized only)</strong> - helps us
                  improve
                </li>
              </ul>
              <p className="text-gray-700 font-medium mb-4">
                All providers are contractually bound to protect your data and
                prohibited from using it for AI training.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.2 AI Processing Partners
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>We send your inputs to OpenAI for content generation</li>
                <li>OpenAI processes your request and returns results</li>
                <li>
                  OpenAI does NOT retain or train on your data per our API
                  agreement
                </li>
                <li>Results are sent only to you</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.3 Legal Requirements
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may disclose information if required by law, court order, or
                to protect rights and safety.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.4 Business Transfers
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                In case of merger or acquisition, your information may transfer
                to the successor entity under the same privacy protections.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                6.5 With Your Consent
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may share information for other purposes with your explicit
                consent.
              </p>

              <p className="text-gray-700 font-bold text-lg">
                WE NEVER SELL YOUR PERSONAL INFORMATION.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Data Security
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We take data security seriously and implement industry-standard
                measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Secure Infrastructure:</strong> We use trusted cloud
                  providers (AWS/Supabase) that provide encrypted storage and
                  secure data centers
                </li>
                <li>
                  <strong>Encryption:</strong> Data is encrypted in transit
                  using HTTPS/TLS
                </li>
                <li>
                  <strong>Access Control:</strong> Password-protected accounts
                  and authentication required for all users
                </li>
                <li>
                  <strong>Secure Development:</strong> Following security best
                  practices in our code and infrastructure
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.1 Data Breach Notification
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                In the unlikely event of a data breach affecting your personal
                information, we will notify affected users as soon as possible
                and provide information about what occurred and steps to take.
              </p>

              <p className="text-gray-700 leading-relaxed">
                While we implement strong security practices, no online service
                is 100% secure. We encourage you to use strong, unique passwords
                and protect your account credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Cookies and Tracking
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use minimal cookies for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Essential Functions:</strong> Login sessions and
                  authentication
                </li>
                <li>
                  <strong>User Preferences:</strong> Remembering your settings
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed mb-4">
                You can control cookies through browser settings. Disabling
                cookies may prevent you from logging in.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                8.1 Do Not Track
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We don't track you across websites or use any third-party
                tracking.
              </p>

              <p className="text-gray-700 font-medium">
                We do NOT use cookies for:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Analytics or tracking</li>
                <li>Building user profiles</li>
                <li>Advertising purposes</li>
                <li>Sharing data with third parties</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Your Privacy Rights
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Depending on your location, you may have these rights:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.1 Access and Portability
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Request a copy of your personal information</li>
                <li>Export your content in standard formats</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.2 Correction
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Update inaccurate information</li>
                <li>Edit your generated content through the platform</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.3 Deletion
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  To request account or data deletion, please email us at
                  privacy@listora.ai
                </li>
                <li>We will process deletion requests within 30 days</li>
                <li>
                  Note: We cannot delete information already required for legal
                  compliance
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                9.4 Important Clarification
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">
                  Since we don't use your data for AI training, there's nothing
                  to "untrain" - your content is never incorporated into our
                  models.
                </p>
              </div>

              <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">
                9.5 Automated Decision-Making
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We do not use automated decision-making or profiling that
                produces legal effects or significantly affects you. AI is used
                only to generate content based on your specific inputs.
              </p>

              <p className="text-gray-700 leading-relaxed mt-4">
                To exercise rights, email{' '}
                <a
                  href="mailto:privacy@listora.ai"
                  className="text-slate-600 hover:text-slate-800"
                >
                  privacy@listora.ai
                </a>
                . We'll respond within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Data Retention
              </h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Account Data:</strong> Retained while your account is
                  active and up to 90 days after deletion
                </li>
                <li>
                  <strong>Generated Content:</strong> Retained until you delete
                  it
                </li>
                <li>
                  <strong>Payment Records:</strong> Retained as required by law
                  (typically 7 years)
                </li>
                <li>
                  <strong>Voice Recordings:</strong> Processed and immediately
                  discarded
                </li>
                <li>
                  <strong>Logs:</strong> Retained for 24 months for security
                </li>
                <li>
                  <strong>Backups:</strong> May persist up to 90 days after
                  deletion
                </li>
              </ul>
              <p className="text-gray-700 font-medium">
                Key Point: Even in backups, your data is NEVER used for AI
                training.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                To request deletion of your account or content before these
                retention periods, please email privacy@listora.ai. We process
                all deletion requests within 30 days.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. International Transfers
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Your data may be processed in the United States and other
                countries. We ensure appropriate safeguards for international
                transfers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Children's Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Our Service is not intended for children under 16. We do not
                knowingly collect children's data. If we discover we have
                collected such data, we will promptly delete it.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Third-Party Services
              </h2>
              <p className="text-gray-700 leading-relaxed">
                When you connect to marketplaces (Amazon, Shopify, etc.), their
                privacy policies apply to data they process. We only receive
                limited information necessary for integration.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. California Privacy Rights
              </h2>
              <p className="text-gray-700 leading-relaxed">
                California residents have additional privacy rights. We do not
                sell personal information. To exercise your rights under
                California law, including access and deletion rights, please
                email privacy@listora.ai.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. European Privacy Rights (GDPR)
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are located in the European Union, United Kingdom, or
                European Economic Area, you have additional rights under the
                General Data Protection Regulation (GDPR):
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.1 Legal Basis for Processing
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Contract:</strong> To provide the services you've
                  requested
                </li>
                <li>
                  <strong>Legitimate Interests:</strong> For security, fraud
                  prevention, and service improvement (not AI training)
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with laws
                </li>
                <li>
                  <strong>Consent:</strong> For marketing communications (if
                  applicable)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                15.2 Your GDPR Rights
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Right to access your personal data</li>
                <li>Right to correct inaccurate data</li>
                <li>Right to request deletion ("right to be forgotten")</li>
                <li>Right to restrict processing</li>
                <li>Right to data portability</li>
                <li>Right to object to processing</li>
                <li>Right to withdraw consent</li>
                <li>
                  Right to lodge a complaint with your supervisory authority
                </li>
              </ul>

              <p className="text-gray-700 leading-relaxed">
                To exercise any of these rights, please contact us at{' '}
                <a
                  href="mailto:privacy@listora.ai"
                  className="text-slate-600 hover:text-slate-800"
                >
                  privacy@listora.ai
                </a>
                . We will respond to your request within one month.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                16. Marketing Communications
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may send you:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Service updates and important notices (you cannot opt-out)
                </li>
                <li>Marketing emails about new features (you can opt-out)</li>
                <li>Survey requests to improve our service (optional)</li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                You can manage email preferences in your account settings or
                click "unsubscribe" in any marketing email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                17. Accessibility
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We are committed to ensuring our Privacy Policy is accessible to
                everyone. If you need this policy in an alternative format,
                please contact us at{' '}
                <a
                  href="mailto:privacy@listora.ai"
                  className="text-slate-600 hover:text-slate-800"
                >
                  privacy@listora.ai
                </a>
                .
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                18. Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy to reflect changes in our
                practices, technology, legal requirements, or other factors. We
                will notify you of material changes via email or in-app
                notifications.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                19. Contact Us
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                For privacy questions or concerns:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Privacy Officer:</strong>{' '}
                  <a
                    href="mailto:privacy@listora.ai"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    privacy@listora.ai
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>General Support:</strong>{' '}
                  <a
                    href="mailto:support@listora.ai"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    support@listora.ai
                  </a>
                </p>
                <p className="text-gray-700 mb-2">
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
                <p className="text-gray-700 mt-4">
                  <strong>Data Protection Officer:</strong>{' '}
                  <a
                    href="mailto:privacy@listora.ai"
                    className="text-slate-600 hover:text-slate-800"
                  >
                    privacy@listora.ai
                  </a>
                </p>
              </div>
            </section>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <p className="text-green-800 text-sm">
                <strong>Your Privacy is Our Priority:</strong> This Privacy
                Policy was updated on August 02, 2025, to better reflect our
                commitment to your privacy. Unlike many AI services, we do NOT
                use your data to train our AI models. Your content remains
                exclusively yours. Thank you for trusting Listora AI with your
                data.
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
          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              © {new Date().getFullYear()} Listora AI. All rights reserved.
              Your data is never used for AI training.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
