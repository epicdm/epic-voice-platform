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

// GET /api/v1/calls/[id] - Get call status and details
export async function GET(
  req: NextRequest,

  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    const callId = params.id

    // TODO: Fetch from backend
    // const response = await fetch(`${process.env.BACKEND_URL}/api/call-logs/${callId}`)
    
    // Mock response
    const call = {
      id: callId,
      agent_id: 'agent_456',
      agent_name: 'Customer Support Agent',
      to_number: '+1 (555) 123-4567',
      from_number: '+1 (555) 999-0000',
      status: 'completed',
      duration: 125, // seconds
      started_at: '2025-10-20T10:30:00Z',
      ended_at: '2025-10-20T10:32:05Z',
      transcript: 'AI: Hello! How can I help you today?\nCustomer: I need help with my order...',
      recording_url: 'https://example.com/recordings/call_123.mp3',
      cost: 0.15,
    }

    return NextResponse.json({ data: call })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
