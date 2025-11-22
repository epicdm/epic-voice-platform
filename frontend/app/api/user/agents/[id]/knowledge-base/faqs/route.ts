import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

// GET /api/user/agents/:id/knowledge-base/faqs - List FAQs
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = req.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for knowledge-base FAQs API');
    } else {
      const session = await auth();

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
        );
      }

      userEmail = session.user.email;
    }

    const agentId = params.id;

    // Proxy to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/knowledge-base/faqs`, {
      headers: {
        'X-User-Email': userEmail,
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        success: false,
        error: { message: 'Backend request failed', code: 'BACKEND_ERROR' }
      }))
      return NextResponse.json(error, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Knowledge Base FAQs API Error:', error)
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

// POST /api/user/agents/:id/knowledge-base/faqs - Create FAQ
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = req.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for FAQ creation');
    } else {
      const session = await auth();

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
        );
      }

      userEmail = session.user.email;
    }

    const agentId = params.id;
    const body = await req.json()

    // Proxy to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/knowledge-base/faqs`, {
      method: 'POST',
      headers: {
        'X-User-Email': userEmail,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        success: false,
        error: { message: 'Backend request failed', code: 'BACKEND_ERROR' }
      }))
      return NextResponse.json(error, { status: response.status })
    }

    const result = await response.json()
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Knowledge Base FAQ Create API Error:', error)
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
