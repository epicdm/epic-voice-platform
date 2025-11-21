import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service - Epic.ai',
  description: 'Terms of Service for Epic.ai Voice Agents Platform',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
          <p className="text-muted-foreground">Last Updated: October 30, 2025</p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
          {/* 1. Introduction */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="mb-4">
              Welcome to Epic.ai (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;). These Terms of Service
              (&ldquo;Terms&rdquo;) govern your access to and use of the Epic.ai platform, including our AI-powered
              voice agent services, web applications, APIs, and related services (collectively, the &ldquo;Service&rdquo;).
            </p>
            <p className="mb-4">
              By accessing or using our Service, you agree to be bound by these Terms and our{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . If you do not agree to these Terms, you may not access or use the Service.
            </p>
            <p>
              <strong>PLEASE READ THESE TERMS CAREFULLY BEFORE USING THE SERVICE.</strong>
            </p>
          </section>

          {/* 2. Service Description */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="mb-4">
              Epic.ai provides an AI-powered voice agent platform that enables businesses to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Create and deploy intelligent voice AI agents</li>
              <li>Manage inbound and outbound voice calls</li>
              <li>Run automated calling campaigns</li>
              <li>Monitor call performance and outcomes in real-time</li>
              <li>Access call transcripts and analytics</li>
              <li>Integrate with external systems via webhooks and APIs</li>
            </ul>
            <p>
              The Service is provided on a subscription basis and is subject to availability. We reserve the right
              to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.
            </p>
          </section>

          {/* 3. Account Registration and Security */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration and Security</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">3.1 Account Creation</h3>
            <p className="mb-4">
              To use the Service, you must create an account by providing accurate, current, and complete information.
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Provide truthful and accurate registration information</li>
              <li>Maintain and update your information to keep it current</li>
              <li>Be solely responsible for all activities under your account</li>
              <li>Maintain the security and confidentiality of your login credentials</li>
              <li>Notify us immediately of any unauthorized account access</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.2 Account Responsibilities</h3>
            <p className="mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>All activities that occur under your account</li>
              <li>Ensuring only authorized personnel access your account</li>
              <li>Compliance with all applicable laws and regulations</li>
              <li>All content transmitted through your account</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">3.3 Business Accounts</h3>
            <p>
              If you register on behalf of a business or organization, you represent that you have authority
              to bind that entity to these Terms, and &ldquo;you&rdquo; refers to both you and that entity.
            </p>
          </section>

          {/* 4. Acceptable Use Policy */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">4.1 Permitted Uses</h3>
            <p className="mb-4">
              You may use the Service only for lawful business purposes in compliance with all applicable laws.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.2 Prohibited Activities</h3>
            <p className="mb-4">You agree NOT to:</p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Make unsolicited calls in violation of Do Not Call regulations</li>
              <li>Engage in fraudulent, deceptive, or misleading practices</li>
              <li>Harass, threaten, or abuse call recipients</li>
              <li>Impersonate any person or entity</li>
              <li>Transmit spam, malware, or harmful code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Reverse engineer or decompile any part of the Service</li>
              <li>Use the Service to compete with us</li>
              <li>Scrape, crawl, or data mine the Service</li>
              <li>Overload or disrupt our infrastructure</li>
              <li>Share your account credentials with unauthorized parties</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">4.3 Telemarketing Compliance</h3>
            <p className="mb-4">
              If you use the Service for telemarketing or sales calls, you must:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Comply with all applicable telemarketing laws (TCPA, TSR, etc.)</li>
              <li>Maintain your own Do Not Call list and honor opt-out requests</li>
              <li>Obtain proper consent before calling consumers</li>
              <li>Clearly identify your business and purpose of the call</li>
              <li>Provide accurate caller ID information</li>
            </ul>
            <p>
              <strong>You are solely responsible for compliance with all telemarketing regulations.</strong>
            </p>
          </section>

          {/* 5. AI Voice Agent Terms */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">5. AI Voice Agent Terms</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">5.1 Call Recording and Consent</h3>
            <p className="mb-4">
              Our Service records all voice calls for quality assurance, training, and functionality purposes.
              You agree to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Comply with all call recording laws in applicable jurisdictions</li>
              <li>Obtain proper consent from call participants where required by law</li>
              <li>Provide appropriate call recording disclosures</li>
              <li>Inform callers that they are speaking with an AI agent</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.2 AI Agent Configuration</h3>
            <p className="mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Configuring your AI agents appropriately for your use case</li>
              <li>Training and testing agents before production deployment</li>
              <li>Monitoring agent behavior and performance</li>
              <li>Ensuring agent instructions comply with applicable laws</li>
              <li>Content and accuracy of information provided by your agents</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">5.3 No Warranties on AI Performance</h3>
            <p>
              While we strive for high-quality AI performance, we do not guarantee that AI agents will always
              respond accurately or appropriately. You should monitor and review agent interactions, especially
              in critical or regulated use cases.
            </p>
          </section>

          {/* 6. Intellectual Property Rights */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property Rights</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">6.1 Our Intellectual Property</h3>
            <p className="mb-4">
              The Service, including all software, designs, text, graphics, and other content, is owned by
              Epic.ai and protected by copyright, trademark, and other intellectual property laws. You may not:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Copy, modify, or create derivative works of the Service</li>
              <li>Use our trademarks or branding without permission</li>
              <li>Remove or alter copyright notices</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.2 Your Content</h3>
            <p className="mb-4">
              You retain ownership of all content you upload or create using the Service (&ldquo;Your Content&rdquo;).
              By using the Service, you grant us a limited, worldwide, non-exclusive license to:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Host, store, and transmit Your Content</li>
              <li>Process Your Content to provide the Service</li>
              <li>Create backups and archives</li>
              <li>Use aggregated, anonymized data for analytics and improvement</li>
            </ul>
            <p>
              This license terminates when you delete Your Content or close your account, except for archived
              copies retained for legal compliance.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">6.3 Feedback</h3>
            <p>
              Any feedback, suggestions, or ideas you provide about the Service become our property, and we
              may use them without obligation to you.
            </p>
          </section>

          {/* 7. Payment Terms */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">7. Payment Terms</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">7.1 Subscription Plans</h3>
            <p className="mb-4">
              The Service is offered on various subscription plans with different features and usage limits.
              Current pricing is available on our website.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.2 Billing</h3>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Subscriptions are billed in advance on a monthly or annual basis</li>
              <li>Payments are processed automatically using your payment method</li>
              <li>You must maintain valid payment information</li>
              <li>All fees are non-refundable unless otherwise stated</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.3 Usage-Based Charges</h3>
            <p className="mb-4">
              Certain features may incur additional usage-based charges (e.g., phone minutes, API calls).
              You will be notified of such charges before incurring them.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.4 Price Changes</h3>
            <p className="mb-4">
              We may change our prices with 30 days&apos; notice. Continued use of the Service after a price
              change constitutes acceptance of the new pricing.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">7.5 Late Payments</h3>
            <p>
              If payment fails, we may suspend or terminate your access to the Service. You remain responsible
              for all amounts due, plus reasonable collection costs.
            </p>
          </section>

          {/* 8. Term and Termination */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">8. Term and Termination</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">8.1 Term</h3>
            <p className="mb-4">
              These Terms begin when you first access the Service and continue until terminated by either party.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.2 Termination by You</h3>
            <p className="mb-4">
              You may terminate your account at any time by canceling your subscription through the Service.
              Termination takes effect at the end of your current billing period.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.3 Termination by Us</h3>
            <p className="mb-4">
              We may suspend or terminate your account immediately if you:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Violate these Terms</li>
              <li>Fail to pay amounts due</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Pose a security risk to the Service or other users</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">8.4 Effect of Termination</h3>
            <p className="mb-4">
              Upon termination:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Your access to the Service will cease immediately</li>
              <li>You must pay all outstanding amounts</li>
              <li>We may delete Your Content after a reasonable grace period</li>
              <li>You may request a data export before deletion</li>
            </ul>
            <p>
              Sections that by their nature should survive termination will survive (e.g., payment obligations,
              intellectual property, limitation of liability).
            </p>
          </section>

          {/* 9. Disclaimers and Limitation of Liability */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">9. Disclaimers and Limitation of Liability</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">9.1 Service Provided &ldquo;As Is&rdquo;</h3>
            <p className="mb-4">
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
              EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              OR NON-INFRINGEMENT.
            </p>
            <p className="mb-4">
              We do not warrant that:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>The Service will be uninterrupted or error-free</li>
              <li>Defects will be corrected</li>
              <li>The Service is free of viruses or harmful components</li>
              <li>Results from use of the Service will be accurate or reliable</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.2 Limitation of Liability</h3>
            <p className="mb-4">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, EPIC.AI SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
              <li>LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES</li>
              <li>DAMAGES RESULTING FROM UNAUTHORIZED ACCESS TO YOUR ACCOUNT OR DATA</li>
              <li>DAMAGES FROM THIRD-PARTY CONDUCT OR CONTENT</li>
              <li>DAMAGES FROM SERVICE INTERRUPTIONS OR DOWNTIME</li>
            </ul>
            <p className="mb-4">
              OUR TOTAL LIABILITY FOR ALL CLAIMS UNDER THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US
              IN THE 12 MONTHS PRECEDING THE CLAIM.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">9.3 Indemnification</h3>
            <p>
              You agree to indemnify and hold harmless Epic.ai from any claims, damages, losses, or expenses
              (including legal fees) arising from:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or third-party rights</li>
              <li>Your Content</li>
            </ul>
          </section>

          {/* 10. Dispute Resolution */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">10. Dispute Resolution</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">10.1 Informal Resolution</h3>
            <p className="mb-4">
              Before filing a claim, you agree to contact us at{' '}
              <a href="mailto:legal@epic.dm" className="text-primary hover:underline">
                legal@epic.dm
              </a>{' '}
              to attempt informal resolution.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">10.2 Arbitration Agreement</h3>
            <p className="mb-4">
              Any dispute arising from these Terms shall be resolved through binding arbitration in accordance
              with the American Arbitration Association&apos;s Commercial Arbitration Rules, rather than in court.
            </p>
            <p className="mb-4">
              <strong>You waive your right to a jury trial and to participate in class action lawsuits.</strong>
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">10.3 Exceptions to Arbitration</h3>
            <p className="mb-4">
              Either party may seek injunctive relief in court for:
            </p>
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4">
              <li>Intellectual property infringement</li>
              <li>Unauthorized access to systems or data</li>
              <li>Violations of the Acceptable Use Policy</li>
            </ul>

            <h3 className="text-xl font-semibold mb-3 mt-4">10.4 Governing Law</h3>
            <p>
              These Terms are governed by the laws of the State of Delaware, USA, without regard to conflict
              of law provisions.
            </p>
          </section>

          {/* 11. General Provisions */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">11. General Provisions</h2>
            <h3 className="text-xl font-semibold mb-3 mt-4">11.1 Changes to Terms</h3>
            <p className="mb-4">
              We may modify these Terms at any time. Material changes will be notified via email or Service
              notification at least 30 days before taking effect. Continued use after changes constitutes
              acceptance.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">11.2 Entire Agreement</h3>
            <p className="mb-4">
              These Terms, together with our Privacy Policy and any other policies referenced herein, constitute
              the entire agreement between you and Epic.ai regarding the Service.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">11.3 Severability</h3>
            <p className="mb-4">
              If any provision is found unenforceable, the remaining provisions will remain in full effect.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">11.4 No Waiver</h3>
            <p className="mb-4">
              Our failure to enforce any right or provision does not constitute a waiver of that right.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">11.5 Assignment</h3>
            <p className="mb-4">
              You may not assign these Terms without our consent. We may assign them without restriction.
            </p>

            <h3 className="text-xl font-semibold mb-3 mt-4">11.6 Force Majeure</h3>
            <p>
              We are not liable for delays or failures due to causes beyond our reasonable control (natural
              disasters, wars, labor disputes, government actions, internet outages, etc.).
            </p>
          </section>

          {/* 12. Contact Information */}
          <section className="bg-card rounded-lg p-6 shadow-sm border">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
            <p className="mb-4">
              If you have questions about these Terms, please contact us:
            </p>
            <div className="space-y-2">
              <p>
                <strong>Email:</strong>{' '}
                <a href="mailto:legal@epic.dm" className="text-primary hover:underline">
                  legal@epic.dm
                </a>
              </p>
              <p>
                <strong>Support:</strong>{' '}
                <a href="mailto:support@epic.dm" className="text-primary hover:underline">
                  support@epic.dm
                </a>
              </p>
              <p>
                <strong>Website:</strong>{' '}
                <a href="https://epic.dm" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  https://epic.dm
                </a>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground">
                By using Epic.ai, you acknowledge that you have read, understood, and agree to be bound by
                these Terms of Service.
              </p>
            </div>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-12 pt-6 border-t text-center">
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
