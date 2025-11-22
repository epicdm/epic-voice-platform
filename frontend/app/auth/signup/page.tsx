'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button, Input } from '@heroui/react'
import { FcGoogle } from 'react-icons/fc'
import { Mail, Lock, User, ArrowRight, Sparkles } from 'lucide-react'

export default function SignUpPage() {
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error('Google sign-up error:', error)
      setError('Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Create account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account')
      }

      // Auto sign-in after successful signup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Account created but failed to sign in. Please try signing in manually.')
        setIsLoading(false)
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Sign-up error:', error)
      setError(error.message || 'Failed to create account')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Epic Voice</h1>
          </div>
          <p className="text-muted-foreground">
            Start your free 14-day trial
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          {/* Google Sign-Up (Primary CTA) */}
          <Button
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            size="lg"
            className="w-full mb-6 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300"
          >
            <FcGoogle className="h-5 w-5 mr-2" />
            Continue with Google
          </Button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-card text-muted-foreground">or sign up with email</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            {error && (
              <div className="bg-danger/10 border border-danger text-danger rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <Input
              type="text"
              label="Name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              startContent={<User className="h-4 w-4 text-muted-foreground" />}
              required
              disabled={isLoading}
            />

            <Input
              type="email"
              label="Email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              startContent={<Mail className="h-4 w-4 text-muted-foreground" />}
              required
              disabled={isLoading}
            />

            <Input
              type="password"
              label="Password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              startContent={<Lock className="h-4 w-4 text-muted-foreground" />}
              required
              minLength={8}
              disabled={isLoading}
            />

            <Button
              type="submit"
              color="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          {/* Sign In Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Already have an account? </span>
            <Link
              href="/auth/signin"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <p>✓ 14-day free trial • ✓ No credit card required • ✓ 1,000 free minutes</p>
          <p className="text-[10px]">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  )
}
