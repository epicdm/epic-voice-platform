import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

/**
 * GET /api/transcripts/call/[callLogId]
 * Fetch transcript for a specific call
 */
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ callLogId: string }> }
) {
  try {
    const params = await props.params
    // Get user from NextAuth session
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { callLogId } = params
    const userId = session.user.id

    // Proxy request to backend
    const response = await fetch(
      `${BACKEND_URL}/api/transcripts/call/${callLogId}?user_id=${userId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching transcript:', error)
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
