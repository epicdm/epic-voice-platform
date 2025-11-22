import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy - Epic.ai',
  description: 'Privacy Policy for Epic.ai Voice Agents Platform',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground">
            Last Updated: October 30, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm space-y-6">

            {/* Introduction */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Epic.ai ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI voice agents platform (the "Service").
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                By accessing or using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
              </p>
            </section>

            {/* Information We Collect */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">2. Information We Collect</h2>

              <h3 className="text-xl font-semibold text-foreground mb-2">2.1 Information You Provide</h3>
              <p className="text-muted-foreground leading-relaxed">
                We collect information that you voluntarily provide when you:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Create an account (name, email address, password)</li>
                <li>Configure AI voice agents (instructions, voice preferences, phone numbers)</li>
                <li>Upload contact lists or lead data for campaigns</li>
                <li>Make or receive phone calls through our platform</li>
                <li>Contact our support team</li>
                <li>Participate in surveys or provide feedback</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.2 Automatically Collected Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                When you use our Service, we automatically collect:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Call Data:</strong> Phone numbers, call duration, timestamps, call outcomes, and conversation transcripts</li>
                <li><strong>Usage Data:</strong> Features accessed, agent configurations, campaign metrics, API usage</li>
                <li><strong>Device Information:</strong> Browser type, operating system, IP address, device identifiers</li>
                <li><strong>Log Data:</strong> Error logs, performance data, security events</li>
                <li><strong>Cookies and Tracking:</strong> Session cookies, authentication tokens, analytics cookies</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">2.3 Third-Party Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may receive information from third-party services you integrate with our platform:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>CRM Systems:</strong> Contact data from Odoo, HubSpot, or other integrated CRMs</li>
                <li><strong>Payment Processors:</strong> Billing information from Stripe (we do not store credit card details)</li>
                <li><strong>Telephony Providers:</strong> Call detail records from Magnus Billing and other SIP providers</li>
              </ul>
            </section>

            {/* How We Use Your Information */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Service Delivery:</strong> To provide, operate, and maintain our AI voice agent platform</li>
                <li><strong>Voice AI Processing:</strong> To generate responses, transcribe conversations, and improve AI agent performance</li>
                <li><strong>Campaign Execution:</strong> To initiate calls, track outcomes, and provide analytics</li>
                <li><strong>Account Management:</strong> To manage your account, authenticate users, and provide customer support</li>
                <li><strong>Billing and Payments:</strong> To process subscriptions, calculate usage fees, and generate invoices</li>
                <li><strong>Service Improvement:</strong> To analyze usage patterns, identify bugs, and enhance features</li>
                <li><strong>Communication:</strong> To send service updates, security alerts, and promotional materials (with consent)</li>
                <li><strong>Legal Compliance:</strong> To comply with legal obligations, prevent fraud, and enforce our terms</li>
              </ul>
            </section>

            {/* Voice and Call Data */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">4. Voice and Call Data Processing</h2>

              <h3 className="text-xl font-semibold text-foreground mb-2">4.1 Call Recording and Transcription</h3>
              <p className="text-muted-foreground leading-relaxed">
                Our Service may record and transcribe phone conversations for quality assurance, training, and analytics purposes. You are responsible for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Obtaining proper consent from call participants where required by law</li>
                <li>Providing appropriate call recording disclosures</li>
                <li>Complying with federal and state recording consent laws (one-party vs. two-party consent)</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.2 AI Processing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Voice data is processed by third-party AI providers:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>OpenAI:</strong> GPT-4 for conversation generation, text-to-speech for voice synthesis</li>
                <li><strong>Deepgram:</strong> Speech-to-text transcription</li>
                <li><strong>LiveKit:</strong> Real-time audio/video infrastructure</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                These providers process voice data in accordance with their own privacy policies and data processing agreements.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">4.3 Data Retention</h3>
              <p className="text-muted-foreground leading-relaxed">
                We retain call recordings and transcripts for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Active Accounts:</strong> Duration of your subscription plus 90 days</li>
                <li><strong>Closed Accounts:</strong> Up to 1 year for legal compliance and dispute resolution</li>
                <li><strong>Compliance Requirements:</strong> Longer retention if required by law or legal hold</li>
              </ul>
            </section>

            {/* Data Sharing and Disclosure */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">5. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share your information with:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-3">5.1 Service Providers</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>AI Providers:</strong> OpenAI, Deepgram for voice processing</li>
                <li><strong>Infrastructure:</strong> LiveKit (real-time communications), hosting providers</li>
                <li><strong>Payment Processing:</strong> Stripe for billing and subscriptions</li>
                <li><strong>Analytics:</strong> Usage analytics and monitoring services</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.2 Business Transfers</h3>
              <p className="text-muted-foreground leading-relaxed">
                In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.3 Legal Requirements</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may disclose your information if required by law, court order, or legal process, or to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Comply with legal obligations</li>
                <li>Protect our rights, privacy, safety, or property</li>
                <li>Prevent fraud or security threats</li>
                <li>Respond to government requests</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">5.4 With Your Consent</h3>
              <p className="text-muted-foreground leading-relaxed">
                We may share your information with other third parties when you explicitly consent to such sharing.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">6. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li><strong>Encryption:</strong> TLS/SSL for data in transit, encryption at rest for sensitive data</li>
                <li><strong>Access Controls:</strong> Multi-factor authentication, role-based access, principle of least privilege</li>
                <li><strong>Network Security:</strong> Firewalls, intrusion detection, DDoS protection</li>
                <li><strong>Monitoring:</strong> Security logging, anomaly detection, regular security audits</li>
                <li><strong>Vendor Management:</strong> Due diligence on third-party security practices</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                However, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your information.
              </p>
            </section>

            {/* Your Rights and Choices */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">7. Your Rights and Choices</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the following rights regarding your personal information:
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-3">7.1 Access and Portability</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can access and export your data through our dashboard or by contacting support.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.2 Correction and Update</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can update your account information, agent configurations, and preferences at any time through your account settings.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.3 Deletion</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can request deletion of your account and associated data by contacting support. Please note:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Some data may be retained for legal compliance (e.g., financial records, call logs)</li>
                <li>Backup copies may persist for up to 90 days</li>
                <li>Anonymized data may be retained for analytics</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.4 Marketing Communications</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can opt out of marketing emails by clicking "unsubscribe" in any promotional email or updating your communication preferences.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.5 Cookies</h3>
              <p className="text-muted-foreground leading-relaxed">
                You can control cookies through your browser settings. Note that disabling cookies may limit functionality.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">7.6 Do Not Track</h3>
              <p className="text-muted-foreground leading-relaxed">
                We do not currently respond to "Do Not Track" browser signals.
              </p>
            </section>

            {/* State-Specific Privacy Rights */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">8. State-Specific Privacy Rights</h2>

              <h3 className="text-xl font-semibold text-foreground mb-2">8.1 California Residents (CCPA/CPRA)</h3>
              <p className="text-muted-foreground leading-relaxed">
                California residents have additional rights under the California Consumer Privacy Act:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Right to know what personal information is collected, used, and shared</li>
                <li>Right to delete personal information</li>
                <li>Right to opt-out of sale of personal information (we do not sell personal information)</li>
                <li>Right to non-discrimination for exercising CCPA rights</li>
                <li>Right to correct inaccurate personal information</li>
                <li>Right to limit use of sensitive personal information</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">8.2 Other U.S. States</h3>
              <p className="text-muted-foreground leading-relaxed">
                Residents of Virginia, Colorado, Connecticut, Utah, and other states with privacy laws may have similar rights. Contact us to exercise these rights.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-2 mt-4">8.3 Exercising Your Rights</h3>
              <p className="text-muted-foreground leading-relaxed">
                To exercise your privacy rights, email us at{' '}
                <a href="mailto:privacy@epic.dm" className="text-primary hover:underline">privacy@epic.dm</a>
                {' '}or use the data request form in your account settings.
              </p>
            </section>

            {/* International Users */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">9. International Data Transfers</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is operated in the United States. If you access our Service from outside the U.S., your information may be transferred to, stored, and processed in the United States or other countries where our service providers operate.
              </p>
              <p className="text-muted-foreground leading-relaxed mt-2">
                By using our Service, you consent to the transfer of your information to the United States and other countries that may have different data protection laws than your country of residence.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
              </p>
            </section>

            {/* Changes to Privacy Policy */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">11. Changes to This Privacy Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of material changes by:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                <li>Posting the updated policy on this page with a new "Last Updated" date</li>
                <li>Sending an email notification to your registered email address</li>
                <li>Displaying a prominent notice in your dashboard</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-2">
                Your continued use of the Service after the effective date of the updated Privacy Policy constitutes your acceptance of the changes.
              </p>
            </section>

            {/* Contact Us */}
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="mt-3 text-muted-foreground space-y-1">
                <p><strong>Email:</strong> <a href="mailto:privacy@epic.dm" className="text-primary hover:underline">privacy@epic.dm</a></p>
                <p><strong>Support:</strong> <a href="mailto:support@epic.dm" className="text-primary hover:underline">support@epic.dm</a></p>
                <p><strong>Website:</strong> <a href="https://ai.epic.dm" className="text-primary hover:underline">https://ai.epic.dm</a></p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-3">
                For privacy-related requests (access, deletion, correction), please include "Privacy Request" in your email subject line and provide sufficient information to verify your identity.
              </p>
            </section>

            {/* Footer */}
            <section className="border-t border-border pt-4 mt-8">
              <p className="text-sm text-muted-foreground">
                This Privacy Policy was last updated on October 30, 2025 and is effective immediately.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                For our Terms of Service, please visit{' '}
                <Link href="/tos" className="text-primary hover:underline">
                  https://ai.epic.dm/tos
                </Link>
              </p>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
