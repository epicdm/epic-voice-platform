import { NextRequest, NextResponse } from 'next/server'

async function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authenticated: false, error: 'Missing or invalid authorization header' }
  }

  const apiKey = authHeader.substring(7)
  
  if (!apiKey.startsWith('sk_live_')) {
    return { authenticated: false, error: 'Invalid API key format' }
  }

  return { 
    authenticated: true, 
    userId: 'user_from_api_key',
  }
}

// POST /api/v1/calls - Initiate outbound call
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    const body = await req.json()
    
    // Validate required fields
    const { agent_id, to_number, from_number } = body
    
    if (!agent_id || !to_number) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, to_number' },
        { status: 400 }
      )
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/
    if (!phoneRegex.test(to_number.replace(/[\s()-]/g, ''))) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    // TODO: Initiate call via backend
    // const response = await fetch(`${process.env.BACKEND_URL}/api/outbound-call`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ agent_id, to_number, from_number })
    // })

    // Mock response
    const call = {
      id: `call_${Date.now()}`,
      agent_id,
      to_number,
      from_number: from_number || '+1 (555) 999-0000',
      status: 'initiated',
      started_at: new Date().toISOString(),
    }

    return NextResponse.json({
      data: call,
    }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/v1/calls - List calls
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // Query parameters
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // TODO: Fetch from backend
    // Mock response
    const calls = [
      {
        id: 'call_123',
        agent_id: 'agent_456',
        to_number: '+1 (555) 123-4567',
        from_number: '+1 (555) 999-0000',
        status: 'completed',
        duration: 125,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      data: calls,
      pagination: {
        limit,
        offset,
        total: calls.length,
      },
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
