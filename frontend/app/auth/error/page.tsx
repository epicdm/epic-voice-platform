"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertCircle } from "lucide-react"

const errorMessages: Record<string, string> = {
  Configuration: "There is a problem with the server configuration.",
  AccessDenied: "You do not have permission to sign in. Make sure you're added as a test user in the OAuth settings.",
  Verification: "The verification token has expired or has already been used.",
  OAuthSignin: "Error in constructing an authorization URL.",
  OAuthCallback: "Error in handling the response from the OAuth provider.",
  OAuthCreateAccount: "Could not create OAuth provider user in the database.",
  EmailCreateAccount: "Could not create email provider user in the database.",
  Callback: "Error in the OAuth callback handler route.",
  OAuthAccountNotLinked: "Email already registered with different provider.",
  EmailSignin: "Check your email address.",
  CredentialsSignin: "Sign in failed. Check the details you provided are correct.",
  SessionRequired: "Please sign in to access this page.",
  Default: "An error occurred during authentication.",
}

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams?.get("error")

  const errorMessage = error && errorMessages[error] 
    ? errorMessages[error] 
    : errorMessages.Default

  const isAccessDenied = error === "AccessDenied"
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-4">
            Authentication Error
          </h1>

          {/* Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 text-center">
              {errorMessage}
            </p>
            {error && (
              <p className="text-xs text-red-600 text-center mt-2 font-mono">
                Error code: {error}
              </p>
            )}
          </div>

          {/* Additional Help for Access Denied */}
          {isAccessDenied && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                Google OAuth Test User Required
              </h3>
              <p className="text-xs text-blue-800 mb-3">
                This app is in testing mode. To sign in with Google:
              </p>
              <ol className="text-xs text-blue-800 space-y-2 ml-4 list-decimal">
                <li>Go to Google Cloud Console</li>
                <li>Navigate to: APIs & Services → OAuth consent screen</li>
                <li>Scroll to "Test users" section</li>
                <li>Click "+ ADD USERS"</li>
                <li>Add your email address</li>
                <li>Save and try signing in again</li>
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
            >
              Try Again
            </Link>
            
            <Link
              href="/"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg text-center transition-colors"
            >
              Back to Home
            </Link>
          </div>

          {/* Support Link */}
          <p className="text-xs text-gray-500 text-center mt-6">
            If the problem persists, please contact support
          </p>
        </div>
      </div>
    </div>
  )
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  )
}
