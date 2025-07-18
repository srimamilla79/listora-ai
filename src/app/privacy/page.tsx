// src/app/privacy/page.tsx - Enhanced for Maximum Legal Protection
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
            <strong>Effective Date:</strong> June 10, 2025
            <br />
            <strong>Last Updated:</strong> June 10, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introduction and Scope
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Welcome to Listora AI ("Company," "we," "our," or "us"). This
                Privacy Policy describes how we collect, use, process, and
                disclose your personal information when you use our AI-powered
                e-commerce content generation platform, website, mobile
                applications, and related services (collectively, the
                "Service").
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  By using our Service, you expressly consent to the collection,
                  use, and disclosure of your information as described in this
                  Privacy Policy, including our use of your content for AI model
                  training and improvement.
                </strong>{' '}
                If you do not agree with our policies and practices, do not use
                our Service.
              </p>
              <p className="text-gray-700 leading-relaxed">
                This policy applies to all users worldwide and complies with
                applicable privacy laws including the General Data Protection
                Regulation (GDPR), California Consumer Privacy Act (CCPA), and
                other relevant privacy legislation.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                2.1 Personal Information You Provide
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Account Information:</strong> Email address, name,
                  password, and profile information
                </li>
                <li>
                  <strong>Payment Information:</strong> Billing address, payment
                  method details (processed securely by third-party payment
                  processors)
                </li>
                <li>
                  <strong>Communications:</strong> Messages, feedback, and
                  correspondence you send to us
                </li>
                <li>
                  <strong>Support Data:</strong> Information provided when you
                  contact customer support
                </li>
                <li>
                  <strong>Voice Data:</strong> Audio recordings and voice inputs
                  when using voice-to-content features
                </li>
                <li>
                  <strong>Biometric Identifiers:</strong> Voice patterns and
                  audio characteristics for service provision (where legally
                  permitted)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                2.2 Content and Usage Data
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>User Content:</strong> Product descriptions, images,
                  specifications, and other content you upload or create
                </li>
                <li>
                  <strong>Generated Content:</strong> AI-generated text,
                  variations, and customizations
                </li>
                <li>
                  <strong>Usage Patterns:</strong> How you interact with our
                  Service, features used, and frequency of use
                </li>
                <li>
                  <strong>Preferences:</strong> Settings, configurations, and
                  customization choices
                </li>
                <li>
                  <strong>Platform Connections:</strong> Data from connected
                  third-party platforms (Amazon, Shopify, etc.)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                2.3 Automatically Collected Information
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Device Information:</strong> IP address, browser type,
                  operating system, device identifiers
                </li>
                <li>
                  <strong>Log Data:</strong> Access logs, error reports,
                  performance data
                </li>
                <li>
                  <strong>Analytics Data:</strong> Page views, session duration,
                  referral sources
                </li>
                <li>
                  <strong>Cookies and Tracking:</strong> See our Cookie Policy
                  below
                </li>
                <li>
                  <strong>Location Data:</strong> General geographic location
                  based on IP address
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                2.4 Third-Party Information
              </h3>
              <p className="text-gray-700 leading-relaxed">
                We may receive information about you from third-party services,
                social media platforms, business partners, and public databases,
                which we combine with information we collect directly from you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. How We Use Your Information
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We process your information for the following purposes:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.1 Service Provision
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Provide, maintain, and improve our AI content generation
                  services
                </li>
                <li>Process your requests and generate personalized content</li>
                <li>Enable account creation, authentication, and management</li>
                <li>Facilitate customer support and technical assistance</li>
                <li>Enable third-party platform integrations and publishing</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.2 Business Operations
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Process payments and manage subscriptions</li>
                <li>Send important service announcements and updates</li>
                <li>Conduct research and analytics to improve our Service</li>
                <li>Train and improve our AI models and algorithms</li>
                <li>Prevent fraud and ensure platform security</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                3.3 Legal and Security
              </h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Ensure platform security and prevent fraud or abuse</li>
                <li>
                  Comply with legal obligations and regulatory requirements
                </li>
                <li>
                  Protect our rights, property, and safety, and that of our
                  users
                </li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Comply with export control and sanctions requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. AI Model Training and Content Usage - ENHANCED
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>IMPORTANT AI TRAINING CONSENT:</strong> By using our
                Service, you expressly consent to and acknowledge the following:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.1 Explicit AI Training Rights
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Content Usage:</strong> We may use all content you
                  input, upload, or generate (including text, images, voice
                  data, and prompts) to train, improve, and develop our AI
                  models and algorithms
                </li>
                <li>
                  <strong>Dataset Creation:</strong> Your content may be
                  incorporated into AI training datasets that may be shared with
                  our AI technology partners and service providers
                </li>
                <li>
                  <strong>Model Enhancement:</strong> We use your interactions,
                  preferences, and usage patterns to enhance AI model
                  performance and accuracy
                </li>
                <li>
                  <strong>Derivative Works:</strong> AI models trained on your
                  content may generate similar content for other users based on
                  learned patterns and features
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.2 Privacy-Preserving Techniques
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  We implement anonymization and aggregation techniques where
                  technically feasible
                </li>
                <li>
                  Personal identifiers are typically removed from training data
                </li>
                <li>
                  We use differential privacy and other privacy-preserving
                  methods when appropriate
                </li>
                <li>
                  However, complete anonymization cannot be guaranteed due to
                  the nature of AI training
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                4.3 Content Ownership and Licensing
              </h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>
                  You retain ownership of your original content input into our
                  system
                </li>
                <li>
                  You grant us a perpetual, worldwide, royalty-free license to
                  use your content for AI training purposes
                </li>
                <li>
                  You own AI-generated content based on your inputs, subject to
                  our Terms of Service
                </li>
                <li>
                  You acknowledge that similar content may be generated for
                  other users based on AI training
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Information Sharing and Disclosure
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  We do not sell your personal information to third parties.
                </strong>{' '}
                We may share your information in the following circumstances:
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.1 Service Providers and AI Partners
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                We share information with trusted third-party service providers
                who perform services on our behalf, including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  Cloud hosting and infrastructure providers (AWS, Google Cloud,
                  etc.)
                </li>
                <li>
                  AI model training and machine learning service providers
                </li>
                <li>Payment processing services</li>
                <li>Analytics and monitoring services</li>
                <li>Email and communication services</li>
                <li>Customer support platforms</li>
                <li>
                  Third-party platform integrations (Amazon, Shopify, etc.)
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.2 Legal and Regulatory Compliance
              </h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>When required by law, regulation, or court order</li>
                <li>To protect our rights, property, or safety</li>
                <li>
                  To investigate potential violations of our Terms of Service
                </li>
                <li>
                  In response to lawful requests from government authorities
                </li>
                <li>To comply with export control and sanctions laws</li>
                <li>To respond to DMCA takedown notices and IP claims</li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                5.3 Business Transfers
              </h3>
              <p className="text-gray-700 leading-relaxed">
                In the event of a merger, acquisition, bankruptcy, or sale of
                assets, your information may be transferred to the acquiring
                entity, subject to the same privacy protections.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Data Security and Protection
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We implement comprehensive security measures to protect your
                information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Encryption:</strong> Data encrypted in transit
                  (TLS/SSL) and at rest (AES-256)
                </li>
                <li>
                  <strong>Access Controls:</strong> Strict employee access
                  controls and multi-factor authentication
                </li>
                <li>
                  <strong>Infrastructure:</strong> Secure cloud infrastructure
                  with leading providers
                </li>
                <li>
                  <strong>Monitoring:</strong> Continuous security monitoring
                  and threat detection
                </li>
                <li>
                  <strong>Audits:</strong> Regular security assessments and
                  vulnerability testing
                </li>
                <li>
                  <strong>Incident Response:</strong> Comprehensive data breach
                  response procedures
                </li>
                <li>
                  <strong>Data Isolation:</strong> User data logically separated
                  and protected
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>
                  However, no method of transmission over the Internet or
                  electronic storage is 100% secure.
                </strong>{' '}
                While we strive to protect your information, we cannot guarantee
                absolute security.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Your Privacy Rights and Choices
              </h2>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.1 General Rights
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                You have the following rights regarding your personal
                information:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Access:</strong> Request access to your personal
                  information
                </li>
                <li>
                  <strong>Correction:</strong> Update or correct inaccurate
                  information
                </li>
                <li>
                  <strong>Deletion:</strong> Request deletion of your personal
                  information (subject to AI training limitations)
                </li>
                <li>
                  <strong>Portability:</strong> Receive your data in a portable
                  format
                </li>
                <li>
                  <strong>Restriction:</strong> Limit how we process your
                  information
                </li>
                <li>
                  <strong>Objection:</strong> Object to certain types of
                  processing
                </li>
              </ul>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.2 AI Training Opt-Out Limitations
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Important Notice:</strong> Once your content has been
                used to train our AI models, it may not be possible to
                completely remove or "untrain" that information from our models.
                Deletion requests will prevent future use of your data but
                cannot reverse prior AI training that has already occurred.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.3 GDPR Rights (EU Residents)
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you are located in the European Union, you have additional
                rights under the GDPR, including the right to lodge a complaint
                with your local supervisory authority. Note that AI training may
                constitute a legitimate interest that limits certain rights.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.4 CCPA Rights (California Residents)
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">
                California residents have specific rights under the CCPA,
                including the right to know what personal information we collect
                and the right to opt-out of the sale of personal information (we
                do not sell personal information). AI training may constitute
                "sharing" under CCPA.
              </p>

              <h3 className="text-xl font-medium text-gray-900 mb-3">
                7.5 Exercising Your Rights
              </h3>
              <p className="text-gray-700 leading-relaxed">
                To exercise your privacy rights, contact us at{' '}
                <a
                  href="mailto:privacy@listora.ai"
                  className="text-slate-600 hover:text-slate-800"
                >
                  privacy@listora.ai
                </a>
                . We will respond to your request within the timeframes required
                by applicable law, noting any limitations due to AI training
                requirements.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Cookies and Tracking Technologies
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to enhance your
                experience:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Essential Cookies:</strong> Required for basic
                  functionality
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> Help us understand how you
                  use our Service
                </li>
                <li>
                  <strong>Preference Cookies:</strong> Remember your settings
                  and preferences
                </li>
                <li>
                  <strong>Marketing Cookies:</strong> Used for advertising and
                  marketing purposes
                </li>
                <li>
                  <strong>AI Enhancement Cookies:</strong> Help improve AI model
                  performance and personalization
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                You can control cookies through your browser settings, but
                disabling certain cookies may limit functionality.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Data Retention and Deletion - UPDATED
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We retain your information for different periods depending on
                the type and purpose:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  <strong>Account Data:</strong> Retained while your account is
                  active and for up to 90 days after deletion
                </li>
                <li>
                  <strong>AI Training Data:</strong> Retained indefinitely for
                  AI model training and improvement purposes, even after account
                  deletion
                </li>
                <li>
                  <strong>Generated Content:</strong> Retained as long as
                  necessary for service provision and AI model training
                </li>
                <li>
                  <strong>Log Data:</strong> Typically retained for 24 months
                  for security and analytics purposes
                </li>
                <li>
                  <strong>Legal Requirements:</strong> Some data may be retained
                  longer to comply with legal obligations
                </li>
                <li>
                  <strong>Backup Data:</strong> May persist in backups for up to
                  5 years for business continuity
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>Important:</strong> When you delete your account, we
                will delete your personal account information, but content used
                for AI training may remain in our systems indefinitely as it
                becomes part of our AI model training datasets.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. International Data Transfers
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Your information may be processed and stored in countries other
                than your own, including the United States. These countries may
                have different data protection laws than your jurisdiction.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                When we transfer personal information internationally, we ensure
                appropriate safeguards are in place, including Standard
                Contractual Clauses, adequacy decisions, or other lawful
                transfer mechanisms.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Export Controls:</strong> We comply with applicable
                export control and sanctions laws. Some features may not be
                available in certain countries due to legal restrictions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Children's Privacy - ENHANCED
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>
                  Our Service is not intended for children under the age of 16.
                </strong>{' '}
                We do not knowingly collect personal information from children
                under 16. This includes:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>No targeted collection of children's data</li>
                <li>No AI training on content from known minors</li>
                <li>Immediate deletion of data identified as from minors</li>
                <li>
                  Parental notification and consent procedures where legally
                  required
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                If you become aware that a child has provided us with personal
                information, please contact us immediately at{' '}
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
                12. Third-Party Links and Services
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                Our Service may contain links to third-party websites or
                integrate with third-party services (including Amazon, Shopify,
                eBay, Etsy, and other platforms). This Privacy Policy does not
                apply to those third-party services.
              </p>
              <p className="text-gray-700 leading-relaxed">
                We encourage you to read the privacy policies of any third-party
                services you access through our platform. We are not responsible
                for the privacy practices of third-party platforms or the
                consequences of publishing content to those platforms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. AI and Emerging Technology Disclosures
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>AI Technology Limitations:</strong> Our AI systems are
                subject to evolving technology and regulations. We cannot
                guarantee:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Complete accuracy or appropriateness of AI outputs</li>
                <li>Freedom from bias in AI model training or outputs</li>
                <li>Compliance with all future AI regulations and standards</li>
                <li>
                  Prevention of all potential misuse of AI-generated content
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                <strong>Regulatory Compliance:</strong> AI regulations are
                rapidly evolving. We monitor regulatory developments and will
                update our practices as needed to maintain compliance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. Business Continuity and Service Termination
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                In the event that Listora AI ceases operations or significantly
                modifies its services:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>
                  We will provide at least 30 days' notice where technically and
                  legally feasible
                </li>
                <li>
                  Users will have opportunity to export their personal content
                  and data
                </li>
                <li>
                  AI training data may be retained by successor entities or
                  technology partners
                </li>
                <li>
                  This Privacy Policy will remain in effect for retained data
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, technology, legal requirements, or
                other factors. We will provide notice of material changes by:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 space-y-2">
                <li>Posting the updated policy on our website</li>
                <li>Updating the "Last Updated" date</li>
                <li>Sending email notification for significant changes</li>
                <li>Providing in-app notifications where appropriate</li>
                <li>
                  For AI training changes, providing additional consent
                  mechanisms where required
                </li>
              </ul>
              <p className="text-gray-700 leading-relaxed">
                Your continued use of our Service after such modifications
                constitutes acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                16. Contact Information and Data Protection Officer
              </h2>
              <p className="text-gray-700 leading-relaxed mb-4">
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  <strong>Privacy Officer:</strong> privacy@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>General Support:</strong> support@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>Legal Matters:</strong> legal@listora.ai
                </p>
                <p className="text-gray-700 mb-2">
                  <strong>DMCA Agent:</strong> dmca@listora.ai
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

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <p className="text-blue-800 text-sm">
                <strong>Legal Notice:</strong> This Privacy Policy was last
                updated on June 10, 2025. This document represents our current
                privacy practices and may be subject to legal review and
                modification. For the most current version, always refer to the
                policy posted on our website.
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
