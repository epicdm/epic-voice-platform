import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

/**
 * GET /api/dashboard/agent-performance?hours=24
 * Get agent performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { searchParams } = new URL(request.url)
    const hours = searchParams.get('hours') || '24'

    const response = await fetch(
      `${BACKEND_URL}/api/dashboard/agent-performance?user_id=${userId}&hours=${hours}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        cache: 'no-store' // Don't cache real-time data
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching agent performance:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
