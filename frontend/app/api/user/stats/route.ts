import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

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

    // Proxy to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/v1/stats`, {
      headers: {
        'X-User-Email': session.user.email,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backend request failed' }))
      return NextResponse.json(error, { status: response.status })
    }

    const flaskResponse = await response.json()

    // Flask returns plain object with stats, ensure we have valid data
    const stats = flaskResponse.data || flaskResponse

    return NextResponse.json({
      success: true,
      data: stats
    })
  } catch (error) {
    console.error('Failed to get user stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get stats',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
