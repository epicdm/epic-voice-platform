/**
 * Admin utilities and authentication
 */

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// Admin email addresses - add yours here
const ADMIN_EMAILS = [
  'admin@epic.dm',
  // Add other admin emails here
]

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth()
  if (!session?.user?.email) return false
  
  return ADMIN_EMAILS.includes(session.user.email)
}

/**
 * Require admin access or throw
 */
export async function requireAdmin() {
  const admin = await isAdmin()
  if (!admin) {
    throw new Error('Admin access required')
  }
}

/**
 * Get user by email or ID
 */
export async function getUser(identifier: string) {
  return await prisma.users.findFirst({
    where: {
      OR: [
        { email: identifier },
        { id: identifier }
      ]
    },
    include: {
      accounts: true,
      organizations: {
        include: {
          subscription: true,
          memberships: true
        }
      },
      memberships: true,
      agentConfigs: true,
      phoneMappings: true,
      callLogs: true,
      sipConfigs: true
    }
  })
}

/**
 * Delete user and all associated data
 */
export async function deleteUser(userId: string) {
  // This will cascade delete:
  // - Accounts (via schema)
  // - Sessions (via schema)
  // - Memberships (via schema)
  // - Organizations owned by user (via schema)
  //   - Which cascades to subscriptions, memberships, etc.
  
  await prisma.users.delete({
    where: { id: userId }
  })
}

/**
 * List all users with stats
 */
export async function listAllUsers() {
  const users = await prisma.users.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      emailVerified: true,
      onboardingCompleted: true,
      isActive: true,
      organizations: {
        include: {
          subscription: true
        }
      },
      _count: {
        select: {
          agentConfigs: true,
          callLogs: true,
          phoneMappings: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return users.map(user => ({
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    emailVerified: user.emailVerified,
    onboardingCompleted: user.onboardingCompleted,
    isActive: user.isActive,
    stats: {
      agents: user._count.agentConfigs,
      calls: user._count.callLogs,
      phoneNumbers: user._count.phoneMappings
    },
    subscription: user.organizations[0]?.subscription ? {
      status: user.organizations[0].subscription.status,
      trialEndsAt: user.organizations[0].subscription.trialEndsAt,
      currentPeriodEnd: user.organizations[0].subscription.currentPeriodEnd
    } : null
  }))
}
