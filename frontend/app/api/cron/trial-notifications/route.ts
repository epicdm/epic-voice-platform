import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTrialExpirationEmail, sendTrialExpiredEmail } from '@/lib/email'

/**
 * Cron job endpoint to send trial expiration notifications
 * 
 * Should be called daily by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * 
 * Sends emails at:
 * - 7 days before expiration
 * - 3 days before expiration
 * - 1 day before expiration
 * - Day of expiration
 * 
 * Authorization: Use a secret token to prevent unauthorized access
 * Example: curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/trial-notifications
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in1Day = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)

    // Find all trialing subscriptions
    const subscriptions = await prisma.subscriptions.findMany({
      where: {
        status: 'trialing',
        trialEndsAt: {
          not: null
        }
      },
      include: {
        organizations: {
          include: {
            users: true
          }
        }
      }
    })

    const results = {
      total: subscriptions.length,
      day7: 0,
      day3: 0,
      day1: 0,
      expired: 0,
      errors: [] as string[]
    }

    for (const subscription of subscriptions) {
      try {
        const trialEndsAt = subscription.trialEndsAt
        if (!trialEndsAt) continue

        const owner = subscription.organizations.users
        if (!owner?.email) continue

        const daysUntilExpiry = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        // Trial has expired
        if (daysUntilExpiry <= 0) {
          await sendTrialExpiredEmail({
            name: owner.name || owner.email.split('@')[0],
            email: owner.email,
            trialEndsAt: trialEndsAt,
            upgradeUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`
          })
          
          // Update subscription status to expired
          await prisma.subscriptions.update({
            where: { id: subscription.id },
            data: { status: 'expired' }
          })
          
          results.expired++
        }
        // 7 days warning
        else if (daysUntilExpiry === 7) {
          await sendTrialExpirationEmail({
            name: owner.name || owner.email.split('@')[0],
            email: owner.email,
            daysLeft: 7,
            trialEndsAt: trialEndsAt,
            upgradeUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`
          })
          results.day7++
        }
        // 3 days warning
        else if (daysUntilExpiry === 3) {
          await sendTrialExpirationEmail({
            name: owner.name || owner.email.split('@')[0],
            email: owner.email,
            daysLeft: 3,
            trialEndsAt: trialEndsAt,
            upgradeUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`
          })
          results.day3++
        }
        // 1 day warning
        else if (daysUntilExpiry === 1) {
          await sendTrialExpirationEmail({
            name: owner.name || owner.email.split('@')[0],
            email: owner.email,
            daysLeft: 1,
            trialEndsAt: trialEndsAt,
            upgradeUrl: `${process.env.NEXTAUTH_URL}/dashboard/billing`
          })
          results.day1++
        }
      } catch (error) {
        const errorMsg = `Failed to process subscription ${subscription.id}: ${error instanceof Error ? error.message : String(error)}`
        results.errors.push(errorMsg)
        console.error(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results
    })
  } catch (error) {
    console.error('Trial notifications cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow POST as well for flexibility
export async function POST(request: Request) {
  return GET(request)
}
