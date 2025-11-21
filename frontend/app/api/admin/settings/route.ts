import { NextRequest, NextResponse } from 'next/server'

// Use localhost for server-side API calls
const BACKEND_URL = 'http://localhost:5001'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')

    const url = category
      ? `${BACKEND_URL}/api/admin/settings?category=${category}`
      : `${BACKEND_URL}/api/admin/settings`

    const response = await fetch(url, {
      headers: {
        'X-Admin-Auth': 'true'
      }
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching admin settings:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const settingId = body.id

    const response = await fetch(`${BACKEND_URL}/api/admin/settings/${settingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Auth': 'true'
      },
      body: JSON.stringify({ value: body.value })
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating admin setting:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update setting' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, updates, service, settings } = body

    if (action === 'bulk-update') {
      const response = await fetch(`${BACKEND_URL}/api/admin/settings/bulk-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'true'
        },
        body: JSON.stringify({ updates })
      })

      const data = await response.json()
      return NextResponse.json(data)
    } else if (action === 'test-connection') {
      const response = await fetch(`${BACKEND_URL}/api/admin/settings/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Auth': 'true'
        },
        body: JSON.stringify({ service, settings })
      })

      const data = await response.json()
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error in admin settings POST:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    )
  }
}
