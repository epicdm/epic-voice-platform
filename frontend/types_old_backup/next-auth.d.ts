import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      organizationId?: string
      organizationName?: string
      role?: string
      subscriptionStatus?: string
      trialEndsAt?: string | null
      hasActiveSubscription?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    organizationId?: string
    organizationName?: string
    role?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub: string
    organizationId?: string
    role?: string
  }
}
