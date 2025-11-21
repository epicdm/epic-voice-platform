/**
 * Migration Script: Add Organizations and Trials to Existing Users
 * 
 * This script adds organizations and 14-day trials to users who registered
 * before the trial system was implemented.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-existing-users.ts [--dry-run]
 * 
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 */

import { PrismaClient } from "@prisma/client"
import { addDays } from "date-fns"

const prisma = new PrismaClient()

const TRIAL_DAYS = parseInt(process.env.TRIAL_DAYS || "14")
const DRY_RUN = process.argv.includes("--dry-run")

interface MigrationStats {
  totalUsers: number
  usersWithOrgs: number
  usersWithoutOrgs: number
  orgsCreated: number
  trialsCreated: number
  errors: string[]
}

async function main() {
  console.log("🔍 Epic Voice User Migration Script")
  console.log("=" .repeat(50))
  console.log(`Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "LIVE (will modify database)"}`)
  console.log(`Trial Duration: ${TRIAL_DAYS} days`)
  console.log("")

  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithOrgs: 0,
    usersWithoutOrgs: 0,
    orgsCreated: 0,
    trialsCreated: 0,
    errors: [],
  }

  try {
    // Fetch all users with their organizations
    const users = await prisma.users.findMany({
      include: {
        organizations: true,
        memberships: {
          include: {
            organizations: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    })

    stats.totalUsers = users.length
    console.log(`📊 Found ${stats.totalUsers} total users`)
    console.log("")

    // Process each user
    for (const user of users) {
      const hasOrg = user.organizations.length > 0 || user.memberships.length > 0
      
      if (hasOrg) {
        stats.usersWithOrgs++
        console.log(`✅ ${user.email} - Already has organization`)
        continue
      }

      stats.usersWithoutOrgs++
      console.log(`⚠️  ${user.email} - Missing organization`)

      if (DRY_RUN) {
        console.log(`   → Would create organization: "${user.name || user.email}'s Organization"`)
        console.log(`   → Would create 14-day trial subscription`)
        stats.orgsCreated++
        stats.trialsCreated++
      } else {
        try {
          // Create organization with subscription
          const orgName = user.name 
            ? `${user.name}'s Organization` 
            : `${user.email}'s Organization`

          const organization = await prisma.organizations.create({
            data: {
              name: orgName,
              ownerId: user.id,
              memberships: {
                create: {
                  userId: user.id,
                  role: "owner",
                },
              },
              subscription: {
                create: {
                  status: "trialing",
                  trialEndsAt: addDays(new Date(), TRIAL_DAYS),
                  provider: "stripe",
                },
              },
            },
            include: {
              subscription: true,
              memberships: true,
            },
          })

          stats.orgsCreated++
          stats.trialsCreated++

          console.log(`   ✅ Created organization: ${organization.name}`)
          console.log(`   ✅ Created trial: expires ${organization.subscription?.trialEndsAt}`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          stats.errors.push(`Failed to migrate ${user.email}: ${errorMsg}`)
          console.error(`   ❌ Error: ${errorMsg}`)
        }
      }

      console.log("")
    }

    // Print summary
    console.log("")
    console.log("=" .repeat(50))
    console.log("📊 Migration Summary")
    console.log("=" .repeat(50))
    console.log(`Total Users:                ${stats.totalUsers}`)
    console.log(`Users with Organizations:   ${stats.usersWithOrgs}`)
    console.log(`Users without Organizations: ${stats.usersWithoutOrgs}`)
    console.log(`Organizations Created:      ${stats.orgsCreated}`)
    console.log(`Trials Created:             ${stats.trialsCreated}`)
    
    if (stats.errors.length > 0) {
      console.log("")
      console.log("❌ Errors:")
      stats.errors.forEach(error => console.log(`   - ${error}`))
    }

    console.log("")
    if (DRY_RUN) {
      console.log("ℹ️  This was a DRY RUN - no changes were made")
      console.log("ℹ️  Run without --dry-run to apply changes")
    } else {
      console.log("✅ Migration complete!")
    }

  } catch (error) {
    console.error("❌ Fatal error during migration:")
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error("❌ Unhandled error:")
    console.error(error)
    process.exit(1)
  })
