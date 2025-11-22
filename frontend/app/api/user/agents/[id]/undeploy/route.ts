import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// POST /api/user/agents/[id]/undeploy - Stop agent process
export async function POST(
  req: NextRequest,

  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
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

    const agentId = params.id;

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/undeploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': session.user.email,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error stopping agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to stop agent',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
