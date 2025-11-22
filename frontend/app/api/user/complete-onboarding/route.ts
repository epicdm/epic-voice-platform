import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Authentication required',
            code: 'UNAUTHORIZED'
          }
        },
        { status: 401 }
      )
    }

    // Update user's onboarding status
    await prisma.users.update({
      where: { email: session.user.email },
      data: { onboardingCompleted: true }
    })

    return NextResponse.json({
      success: true,
      data: { onboardingCompleted: true }
    })
  } catch (error) {
    console.error('Failed to mark onboarding complete:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to update onboarding status',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
