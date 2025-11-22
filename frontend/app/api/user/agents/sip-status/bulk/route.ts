import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// POST /api/user/agents/sip-status/bulk - Get SIP status for multiple agents
export async function POST(req: NextRequest) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = req.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for bulk SIP status API route');
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

    // Get request body
    const body = await req.json();

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/sip-status/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching bulk SIP status:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch bulk SIP status', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
