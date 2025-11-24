import NextAuth, { DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId: string
      organizationName: string
      role: string
      subscriptionStatus: string
      trialEndsAt: string | null
      hasActiveSubscription: boolean
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId?: string
    organizationName?: string
    role?: string
    subscriptionStatus?: string
    trialEndsAt?: string | null
    hasActiveSubscription?: boolean
  }
}
