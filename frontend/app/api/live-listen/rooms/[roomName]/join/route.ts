import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

/**
 * POST /api/live-listen/rooms/[roomName]/join
 * Generate observer token to join a room
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { roomName: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const { roomName } = params

    const response = await fetch(
      `${BACKEND_URL}/api/live-listen/rooms/${encodeURIComponent(roomName)}/join?user_id=${userId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          observer_name: session.user.name || 'Observer',
          can_publish: false
        })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error joining room:', error)
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
