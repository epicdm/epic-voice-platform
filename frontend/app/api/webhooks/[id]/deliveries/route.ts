import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

export const runtime = 'nodejs'

// GET /api/webhooks/[id]/deliveries - Get delivery logs
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get query parameters from URL
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    const response = await fetch(
      `${BACKEND_URL}/api/webhooks/${params.id}/deliveries${queryString ? `?${queryString}` : ''}`,
      {
        headers: {
          'X-User-Email': session.user.email,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backend request failed' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to get webhook deliveries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deliveries' },
      { status: 500 }
    )
  }
}
