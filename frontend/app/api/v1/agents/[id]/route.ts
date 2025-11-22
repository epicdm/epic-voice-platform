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

// GET /api/v1/agents/[id] - Get specific agent
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

    const agentId = params.id

    // TODO: Fetch from backend
    // const response = await fetch(`${process.env.BACKEND_URL}/api/user/agents/${agentId}`)
    
    // Mock response
    const agent = {
      id: agentId,
      name: 'Customer Support Agent',
      instructions: 'You are a helpful customer support agent',
      status: 'active',
      phone_number: '+1 (555) 123-4567',
      created_at: new Date().toISOString(),
    }

    return NextResponse.json({ data: agent })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/agents/[id] - Delete agent
export async function DELETE(
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

    const agentId = params.id

    // TODO: Delete via backend
    // await fetch(`${process.env.BACKEND_URL}/api/user/agents/${agentId}`, {
    //   method: 'DELETE'
    // })

    return NextResponse.json({
      success: true,
      message: `Agent ${agentId} deleted`,
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
