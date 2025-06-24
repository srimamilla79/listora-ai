// src/app/dmca/page.tsx
import Link from 'next/link'
import ListoraAILogo from '@/components/ui/ListoraAILogo'

export default function DMCAPage() {
  return (
    <div className="min-h-screen bg-gray-50">
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
                href="/contact"
                className="text-gray-600 hover:text-slate-600"
              >
                Contact
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8 lg:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            DMCA Copyright Policy
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-gray-700 leading-relaxed mb-6">
              Listora AI respects the intellectual property rights of others and
              expects our users to do the same. We comply with the Digital
              Millennium Copyright Act (DMCA) and will respond to valid
              copyright infringement notices promptly.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Filing a DMCA Takedown Notice
            </h2>

            <p className="text-gray-700 mb-4">
              If you believe that content on our platform infringes your
              copyright, please send a written notification to our designated
              DMCA agent with the following information:
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-900 mb-3">
                DMCA Agent Contact Information
              </h3>
              <p className="text-blue-800 mb-2">
                <strong>Email:</strong> dmca@listora.ai
              </p>
              <p className="text-blue-800 mb-2">
                <strong>Subject Line:</strong> DMCA Takedown Request
              </p>
              <p className="text-blue-800 mb-2">
                <strong>Company:</strong> Listora AI
              </p>
              <p className="text-blue-800">
                <strong>Address:</strong> 24272 Yellow Hammer Ct, Aldie, VA
                20105
              </p>
            </div>

            <h3 className="text-xl font-medium text-gray-900 mb-3">
              Required Information for DMCA Notice
            </h3>
            <ul className="list-disc pl-6 text-gray-700 mb-6 space-y-2">
              <li>
                Identification of the copyrighted work you claim has been
                infringed
              </li>
              <li>
                Identification of the material on our site that you claim is
                infringing and where it is located
              </li>
              <li>
                Your contact information (name, address, phone number, email
                address)
              </li>
              <li>
                A statement that you have a good faith belief that use of the
                material is not authorized
              </li>
              <li>
                A statement that the information in your notice is accurate and,
                under penalty of perjury, that you are authorized to act on
                behalf of the copyright owner
              </li>
              <li>Your physical or electronic signature</li>
            </ul>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Counter-Notification Process
            </h2>
            <p className="text-gray-700 mb-4">
              If you believe your content was removed in error, you may file a
              counter-notification to the same DMCA agent email address with the
              required counter-notice information as specified by the DMCA.
            </p>

            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Repeat Infringer Policy
            </h2>
            <p className="text-gray-700 mb-4">
              We will terminate user accounts that are determined to be repeat
              infringers of copyrighted material.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <p className="text-yellow-800 text-sm">
                <strong>Note:</strong> This policy is effective as of June 10,
                2025. Misrepresentations in a DMCA notice may result in
                liability for damages under Section 512(f) of the DMCA.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
