import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// POST /api/user/phone-numbers/provision - Provision new phone number
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    console.log('🔐 Phone provision auth check:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasEmail: !!session?.user?.email,
      email: session?.user?.email
    });

    if (!session?.user?.email) {
      console.error('🔐 Authentication failed - no session or email');
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

    console.log('🔐 Authentication successful:', session.user.email);

    const body = await req.json();

    console.log('📞 Proxying provision request to backend:', body);

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/phone-numbers/provision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': session.user.email,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log('📞 Backend response:', data);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: data.error || 'Failed to provision phone number',
            code: 'BACKEND_ERROR'
          }
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error provisioning phone number:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to provision phone number',
          code: 'INTERNAL_ERROR'
        }
      },
      { status: 500 }
    );
  }
}
