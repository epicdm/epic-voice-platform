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

// GET /api/v1/phone-numbers - List phone numbers
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: auth.error },
        { status: 401 }
      )
    }

    // TODO: Fetch from backend
    // Mock response
    const phoneNumbers = [
      {
        id: 'phone_123',
        phone_number: '+1 (555) 123-4567',
        agent_id: 'agent_456',
        agent_name: 'Customer Support Agent',
        status: 'active',
        created_at: new Date().toISOString(),
      },
    ]

    return NextResponse.json({
      data: phoneNumbers,
      count: phoneNumbers.length,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/phone-numbers - Add/assign phone number
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
    
    const { phone_number, agent_id } = body
    
    if (!phone_number || !agent_id) {
      return NextResponse.json(
        { error: 'Missing required fields: phone_number, agent_id' },
        { status: 400 }
      )
    }

    // TODO: Assign phone number via backend
    // Mock response
    const mapping = {
      id: `phone_${Date.now()}`,
      phone_number,
      agent_id,
      status: 'active',
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({
      data: mapping,
    }, { status: 201 })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
