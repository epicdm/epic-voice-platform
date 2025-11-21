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

    // Proxy to Flask backend analytics stats
    const response = await fetch(`${BACKEND_URL}/api/analytics/stats`, {
      headers: {
        'X-User-Email': session.user.email,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: 'Backend request failed',
            code: 'BACKEND_ERROR'
          }
        },
        { status: response.status }
      )
    }

    const flaskResponse = await response.json()
    const stats = flaskResponse.stats || {}

    // Get call volume data for daily breakdown
    const volumeResponse = await fetch(`${BACKEND_URL}/api/analytics/call-volume?period=${period}`, {
      headers: {
        'X-User-Email': session.user.email,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    const volumeData = volumeResponse.ok ? await volumeResponse.json() : { data: [] }

    // Calculate estimated cost breakdown (rough estimates)
    const totalCost = stats.total_cost || 0
    const estimatedBreakdown = {
      llm_cost: totalCost * 0.7,  // ~70% LLM costs
      stt_cost: totalCost * 0.15, // ~15% STT costs
      tts_cost: totalCost * 0.15, // ~15% TTS costs
    }

    // Create cost by day from call volume (estimate based on average)
    const callsByDay = volumeData.data || []
    const totalCalls = callsByDay.reduce((sum: number, item: any) => sum + (item.calls || 0), 0)
    const avgCostPerCall = totalCalls > 0 ? totalCost / totalCalls : 0

    const byDay = callsByDay.map((item: any) => ({
      date: item.date || item.name,
      cost: (item.calls || 0) * avgCostPerCall
    }))

    // Transform to expected format
    const costAnalytics = {
      period: period,
      total_cost: totalCost,
      breakdown: estimatedBreakdown,
      by_day: byDay
    }

    return NextResponse.json({
      success: true,
      data: costAnalytics
    })
  } catch (error) {
    console.error('Failed to get cost analytics:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to get cost analytics',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    )
  }
}
