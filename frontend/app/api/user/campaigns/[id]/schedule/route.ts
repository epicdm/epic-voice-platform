import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

export const runtime = 'nodejs'

// POST /api/user/campaigns/[id]/schedule - Schedule/start campaign
export async function POST(
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

    const body = await request.json()

    const response = await fetch(`${BACKEND_URL}/api/user/campaigns/${params.id}/schedule`, {
      method: 'POST',
      headers: {
        'X-User-Email': session.user.email,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backend request failed' }))
      return NextResponse.json(error, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to schedule campaign:', error)
    return NextResponse.json(
      { error: 'Failed to schedule campaign' },
      { status: 500 }
    )
  }
}
