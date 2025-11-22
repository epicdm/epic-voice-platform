import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET /api/user/agents/[id]/knowledge-base/statistics - Get KB statistics
export async function GET(
  req: NextRequest,

  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = req.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = 'epicsmarters@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for knowledge-base statistics API');
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

    // Proxy to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}/knowledge-base/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching KB statistics:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch statistics', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
