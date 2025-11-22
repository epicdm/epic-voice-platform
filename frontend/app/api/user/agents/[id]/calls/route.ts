import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET /api/user/agents/[id]/calls - Get call history for a specific agent
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
      console.log('🔓 LOCALHOST: Using test user for agent calls API route');
    } else {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json(
          { success: false, error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
          { status: 401 }
        );
      }

      userEmail = session.user.email;
    }

    const agentId = params.id;

    // Get pagination parameters from query string
    const { searchParams } = new URL(req.url);
    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    // Forward to Flask backend with agent_id as query parameter
    const backendUrl = `${BACKEND_URL}/api/user/call-logs?agent_id=${agentId}&page=${page}&limit=${limit}`;

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    // Extract calls array from the backend response structure
    // Backend returns: { success: true, data: { calls: [...], pagination: {...} } }
    // Frontend expects: CallLog[]
    const calls = data?.data?.calls || [];

    return NextResponse.json(calls);
  } catch (error) {
    console.error('Error fetching agent call history:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch call history', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
