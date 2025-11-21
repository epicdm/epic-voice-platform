// Test the admin API listAllUsers function
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testListUsers() {
  try {
    console.log('Testing listAllUsers function...')
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        emailVerified: true,
        onboardingCompleted: true,
        isActive: true,
        ownedOrgs: {
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

    console.log(`✅ Found ${users.length} users`)
    console.log(JSON.stringify(users, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testListUsers()
