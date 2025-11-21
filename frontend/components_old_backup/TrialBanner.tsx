"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { AlertCircle, Clock, CreditCard } from "lucide-react"
import { useEffect, useState } from "react"

export function TrialBanner() {
  const { data: session } = useSession()
  const [daysLeft, setDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (session?.user?.trialEndsAt) {
      const trialEnd = new Date(session.user.trialEndsAt)
      const now = new Date()
      const diffTime = trialEnd.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      setDaysLeft(diffDays)
    }
  }, [session?.user?.trialEndsAt])

  if (!session?.user) return null

  const subscriptionStatus = session.user.subscriptionStatus
  const hasActiveSub = session.user.hasActiveSubscription

  // Don't show banner if user has active paid subscription
  if (subscriptionStatus === "active") {
    return null
  }

  // Trial expired
  if (subscriptionStatus === "trialing" && daysLeft !== null && daysLeft <= 0) {
    return (
      <div className="bg-red-600 text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Your trial has expired</p>
              <p className="text-sm text-red-100">
                Upgrade to continue using Epic Voice
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="bg-white text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  // Trial active - show warning if less than 3 days left
  if (subscriptionStatus === "trialing" && daysLeft !== null && daysLeft <= 3) {
    return (
      <div className="bg-orange-600 text-white px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5" />
            <div>
              <p className="font-semibold">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your trial
              </p>
              <p className="text-sm text-orange-100">
                Upgrade now to continue using all features
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/billing"
            className="bg-white text-orange-600 hover:bg-orange-50 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            View Plans
          </Link>
        </div>
      </div>
    )
  }

  // Trial active - show info banner
  if (subscriptionStatus === "trialing" && daysLeft !== null && daysLeft > 3) {
    return (
      <div className="bg-blue-600 text-white px-4 py-2">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <p>
              <span className="font-semibold">{daysLeft} days</span> left in your free trial
            </p>
          </div>
          <Link
            href="/dashboard/billing"
            className="text-white hover:text-blue-100 text-sm font-medium underline"
          >
            View Plans
          </Link>
        </div>
      </div>
    )
  }

  return null
}
