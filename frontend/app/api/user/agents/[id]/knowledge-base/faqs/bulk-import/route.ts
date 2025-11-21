import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001'

// POST /api/user/agents/:id/knowledge-base/faqs/bulk-import - Bulk import FAQs
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
      console.log('🔓 LOCALHOST: Using test user for FAQ bulk import');
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

    // Get the FormData from the request (CSV file upload)
    const formData = await req.formData()

    // Proxy to Flask backend with FormData
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/knowledge-base/faqs/bulk-import`, {
      method: 'POST',
      headers: {
        'X-User-Email': userEmail,
        // Don't set Content-Type - let fetch set it with boundary for multipart/form-data
      },
      body: formData,
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
    console.error('Knowledge Base FAQ Bulk Import API Error:', error)
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
