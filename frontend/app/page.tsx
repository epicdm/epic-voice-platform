'use client'

import Link from 'next/link'
import { Bot, Zap, Shield, Code, Phone, BarChart3, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@heroui/react'

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-6xl font-bold text-foreground mb-6">
              Build AI Voice Agents
              <span className="block text-primary mt-2">in Minutes, Not Months</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8">
              Create production-ready AI phone agents that sound natural, respond instantly, 
              and scale to millions of calls. Powered by LiveKit's industry-leading voice AI framework.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <Button color="primary" size="lg" className="w-full sm:w-auto">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="bordered" size="lg" className="w-full sm:w-auto">
                  View Documentation
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>1,000 free minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Deploy in 5 minutes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 blur-3xl opacity-20">
            <div className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary to-secondary" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Everything you need to build AI voice agents
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Production-ready features that scale from prototype to millions of calls
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Sub-500ms response time. Your agents respond as quickly as humans, creating natural conversations.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real Phone Numbers</h3>
              <p className="text-muted-foreground">
                Connect real phone numbers instantly. Make and receive calls on actual phone lines.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <Code className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Developer Friendly</h3>
              <p className="text-muted-foreground">
                Simple REST API and SDKs. Integrate in minutes with your existing tools and workflows.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Enterprise Security</h3>
              <p className="text-muted-foreground">
                SOC 2 compliant. End-to-end encryption. Your data is safe and private.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Real-time Analytics</h3>
              <p className="text-muted-foreground">
                Track every call, monitor performance, and optimize your agents with detailed insights.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-card border border-border rounded-lg p-6 hover:shadow-lg transition-shadow">
              <div className="rounded-lg bg-primary/10 p-3 w-fit mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Multi-Channel</h3>
              <p className="text-muted-foreground">
                Voice, SMS, WhatsApp, and more. Reach customers on their preferred channel.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">330ms</div>
              <div className="text-muted-foreground">Average Response Time</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.99%</div>
              <div className="text-muted-foreground">Uptime SLA</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">25%</div>
              <div className="text-muted-foreground">Of US 911 Centers</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Ready to build your first AI agent?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Start with 1,000 free minutes. No credit card required.
          </p>
          <Link href="/dashboard">
            <Button color="primary" size="lg">
              Start Building Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Epic.ai. All rights reserved.
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/tos"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
