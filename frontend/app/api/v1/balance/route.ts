import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

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
            code: 'UNAUTHORIZED',
          },
        },
        { status: 401 }
      )
    }

    const response = await fetch(`${BACKEND_URL}/api/v1/balance`, {
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
    const balance = flaskResponse.data || flaskResponse

    return NextResponse.json({
      success: true,
      data: balance,
    })
  } catch (error) {
    console.error('Failed to get balance:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get balance',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 }
    )
  }
}
