import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { addDays } from "date-fns"

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.users.findUnique({
          where: { email: credentials.email as string }
        })

        if (!user || !user.password) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email!,
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
    async signIn({ user, account }) {
      try {
        // Handle Google OAuth sign-in
        if (account?.provider === "google" && user.email) {
          // Check if user exists in database
          let existingUser = await prisma.users.findUnique({
            where: { email: user.email },
            include: {
              accounts: true,
              organizations: true,
            }
          })

          // Create user if doesn't exist
          if (!existingUser) {
            const { randomUUID } = await import('crypto')
            existingUser = await prisma.users.create({
              data: {
                id: randomUUID(),
                email: user.email,
                name: user.name,
                image: user.image,
                emailVerified: new Date(),
                updatedAt: new Date(),
              },
              include: {
                accounts: true,
                organizations: true,
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
          console.log(`✅ Linked Google account for: ${user.email}`)
        }

        // Create organization and trial if user doesn't have one
        if (existingUser.organizations.length === 0) {
          const orgName = user.name ? `${user.name}'s Organization` : `${user.email}'s Organization`
          const trialDays = parseInt(process.env.TRIAL_DAYS || "14")
          const trialEndsAt = addDays(new Date(), trialDays)
          
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
                  trialEndsAt: trialEndsAt,
                  provider: "stripe",
                }
              }
            }
          })
          console.log(`✅ Created org and trial for: ${user.email}`)
          
          // Send welcome email (non-blocking)
          try {
            const { sendWelcomeEmail } = await import('./lib/email')
            await sendWelcomeEmail({
              name: user.name || user.email?.split('@')[0] || 'there',
              email: user.email,
              trialEndsAt: trialEndsAt,
              loginUrl: `${process.env.NEXTAUTH_URL}/dashboard`
            })
          } catch (emailError) {
            console.error('Failed to send welcome email:', emailError)
            // Don't block sign-in if email fails
          }
        }

          // Update user.id to match database ID
          user.id = existingUser.id
        }
        
        return true
      } catch (error) {
        console.error('Error in signIn callback:', error)
        // Return true to allow sign-in even if database operations fail
        // The user will still be authenticated via OAuth
        return true
      }
    },
    async session({ session, token }) {
      // Copy data from JWT token to session (no database queries - edge runtime compatible)
      if (token && session.user) {
        session.user.id = token.sub as string
        session.user.organizationId = token.organizationId as string
        session.user.organizationName = token.organizationName as string
        session.user.role = token.role as string
        session.user.subscriptionStatus = token.subscriptionStatus as string
        session.user.trialEndsAt = token.trialEndsAt as string | null
        session.user.hasActiveSubscription = token.hasActiveSubscription as boolean
      }
      
      return session
    },
    async jwt({ token, user }) {
      // Set basic user data from the user object on sign-in
      if (user) {
        token.sub = user.id
        token.email = user.email
        token.name = user.name
      }
      
      // Set default values for subscription data
      // These will be fetched by API routes instead of in the JWT callback
      // to avoid Prisma edge runtime issues
      if (!token.organizationId) {
        token.organizationId = "default"
        token.organizationName = "Personal"
        token.role = "owner"
        token.subscriptionStatus = "trialing"
        token.trialEndsAt = null
        token.hasActiveSubscription = true // Allow access by default
      }
      
      return token
    }
  },
  debug: process.env.NODE_ENV === "development",
})
