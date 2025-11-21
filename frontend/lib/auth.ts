import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { addDays } from "date-fns"

export const authOptions: NextAuthOptions = {
  // Note: Adapter commented out when using JWT strategy with CredentialsProvider
  // adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials")
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google" && user.email) {
        // Check if user exists in database
        let existingUser = await prisma.users.findUnique({
          where: { email: user.email },
          include: {
            accounts: true,
            organizations: true,
            memberships: {
              include: {
                organizations: {
                  include: {
                    subscription: true
                  }
                }
              }
            }
          }
        })

        // Create user if doesn't exist
        if (!existingUser) {
          existingUser = await prisma.users.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: new Date(),
            },
            include: {
              accounts: true,
              organizations: true,
              memberships: true,
            }
          })
          console.log(`✅ Created new user: ${user.email}`)
        }

        // Link Google account if not already linked
        const hasGoogleAccount = existingUser.accounts.some(
          acc => acc.provider === "google" && acc.providerAccountId === account.providerAccountId
        )

        if (!hasGoogleAccount) {
          await prisma.accounts.create({
            data: {
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
            }
          })
          console.log(`✅ Linked Google account for user: ${user.email}`)
        }

        // Create organization and trial if user doesn't have one
        if (existingUser.organizations.length === 0) {
          const orgName = user.name ? `${user.name}'s Organization` : `${user.email}'s Organization`
          
          await prisma.organizations.create({
            data: {
              name: orgName,
              ownerId: existingUser.id,
              memberships: {
                create: {
                  userId: existingUser.id,
                  role: "owner"
                }
              },
              subscription: {
                create: {
                  status: "trialing",
                  trialEndsAt: addDays(new Date(), parseInt(process.env.TRIAL_DAYS || "14")),
                  provider: "stripe",
                }
              }
            }
          })
          console.log(`✅ Created organization and trial for user ${user.email}`)
        }

        // Update user.id to match database ID for session
        user.id = existingUser.id
      }
      
      return true
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string
        
        // Fetch user's organization and subscription status
        const user = await prisma.user.findUnique({
          where: { id: token.sub },
          include: {
            memberships: {
              include: {
                organizations: {
                  include: {
                    subscription: true
                  }
                }
              }
            }
          }
        })

        if (user && user.memberships.length > 0) {
          const membership = user.memberships[0]
          const subscription = membership.organizations.subscription

          session.user.organizationId = membership.organizationId
          session.user.organizationName = membership.organizations.name
          session.user.role = membership.role
          
          if (subscription) {
            session.user.subscriptionStatus = subscription.status
            session.user.trialEndsAt = subscription.trialEndsAt?.toISOString() || null
            session.user.hasActiveSubscription = 
              subscription.status === "active" || 
              (subscription.status === "trialing" && 
               subscription.trialEndsAt && 
               new Date(subscription.trialEndsAt) > new Date())
          }
        }
      }
      
      return session
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.sub = user.id
      }
      return token
    }
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      console.log(`🔐 User signed in: ${user.email} via ${account?.provider}`)
      if (isNewUser) {
        console.log(`🎉 New user registered: ${user.email}`)
      }
    }
  },
  debug: process.env.NODE_ENV === "development",
}
