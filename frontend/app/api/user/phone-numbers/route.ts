import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

// GET /api/user/phone-numbers - List all phone numbers for authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    // Development bypass: use test user for localhost
    let userEmail = session?.user?.email
    const isDevelopment = process.env.NODE_ENV === 'development'
    const hostname = req.headers.get('host') || ''
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1')

    if (!userEmail && (isDevelopment || isLocalhost)) {
      // Use test user for local development
      userEmail = 'test@example.com'
      console.log('🔓 DEV: Using test user for API route (localhost bypass)')
    }

    if (!userEmail) {
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

    // Proxy to Flask backend with user email
    const response = await fetch(`${BACKEND_URL}/api/user/phone-numbers`, {
      headers: {
        'X-User-Email': userEmail,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Backend request failed' }))
      return NextResponse.json(error, { status: response.status })
    }

    const flaskResponse = await response.json()

    // Extract phone_numbers array from Flask response
    const phoneNumbers = flaskResponse.phone_numbers || flaskResponse.data || flaskResponse

    return NextResponse.json({
      success: true,
      data: Array.isArray(phoneNumbers) ? phoneNumbers : []
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Internal server error',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
