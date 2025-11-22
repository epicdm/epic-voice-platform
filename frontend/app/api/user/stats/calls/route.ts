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
    const period = searchParams.get('period') || '7d'

    // Fetch both call volume and agent distribution in parallel
    const [volumeResponse, agentResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/api/analytics/call-volume?period=${period}`, {
        headers: {
          'X-User-Email': session.user.email,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }),
      fetch(`${BACKEND_URL}/api/analytics/agent-distribution?period=${period}`, {
        headers: {
          'X-User-Email': session.user.email,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
    ])

    if (!volumeResponse.ok || !agentResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Backend request failed',
            code: 'BACKEND_ERROR'
          }
        },
        { status: volumeResponse.status || agentResponse.status }
      )
    }

    const volumeData = await volumeResponse.json()
    const agentData = await agentResponse.json()

    // Transform to expected format
    const callsAnalytics = {
      period: period,
      data: volumeData.data || [],
      total: (volumeData.data || []).reduce((sum: number, item: any) => sum + (item.calls || 0), 0),
      by_agent: (agentData.data || []).map((item: any) => ({
        agent_id: item.agent_id || '',
        agent_name: item.name || 'Unknown',
        count: item.value || 0
      }))
    }

    return NextResponse.json({
      success: true,
      data: callsAnalytics
    })
  } catch (error) {
    console.error('Failed to get call analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get call analytics',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
