import { NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

// Force Node.js runtime for Prisma compatibility
export const runtime = 'nodejs'

export async function GET(request: Request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const queryString = searchParams.toString()

    // Proxy to Flask backend
    const url = `${BACKEND_URL}/api/user/call-logs${queryString ? `?${queryString}` : ''}`
    const response = await fetch(url, {
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

    // Flask returns plain array, ensure we have an array
    const callLogs = Array.isArray(flaskResponse) ? flaskResponse : (flaskResponse.data || flaskResponse.calls || [])

    return NextResponse.json({
      success: true,
      data: callLogs
    })
  } catch (error) {
    console.error('Failed to get call logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get call logs',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
