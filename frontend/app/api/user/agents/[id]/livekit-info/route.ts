import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET /api/user/agents/[id]/livekit-info - Get LiveKit deployment details
export async function GET(
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
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/livekit-info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': session.user.email,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: data.error || 'Failed to fetch LiveKit info',
            code: 'BACKEND_ERROR'
          }
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching LiveKit info:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to fetch LiveKit info',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
