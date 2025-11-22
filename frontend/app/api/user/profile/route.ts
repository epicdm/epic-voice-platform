import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

    // Fetch user profile from database using Prisma
    const user = await prisma.users.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        createdAt: true,
        isActive: true,
        onboardingCompleted: true,
        memberships: {
          include: {
            organizations: {
              include: {
                subscriptions: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'User not found',
            code: 'NOT_FOUND'
          }
        },
        { status: 404 }
      )
    }

    // Build profile response
    const profile = {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
      isActive: user.isActive,
      onboardingCompleted: user.onboardingCompleted,
      organization: user.memberships[0]?.organizations || null,
      subscription: user.memberships[0]?.organizations?.subscriptions || null
    }

    return NextResponse.json({
      success: true,
      data: profile
    })
  } catch (error) {
    console.error('Failed to get user profile:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get profile',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
