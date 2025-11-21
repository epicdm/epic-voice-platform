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

    // If backend returned an error, try to forward its ApiResponse shape directly
    if (!response.ok) {
      // Case 1: Backend already follows our ApiErrorResponse shape
      if (
        data &&
        typeof data === 'object' &&
        'success' in data &&
        data.success === false &&
        (data as any).error &&
        typeof (data as any).error.message === 'string'
      ) {
        return NextResponse.json(data, { status: response.status });
      }

      // Case 2: Extract best-effort message from various backend formats
      let backendMessage = 'Failed to provision phone number';
      if (data) {
        if (typeof (data as any).error === 'string') {
          backendMessage = (data as any).error;
        } else if (
          (data as any).error &&
          typeof (data as any).error.message === 'string'
        ) {
          backendMessage = (data as any).error.message;
        } else if (typeof (data as any).message === 'string') {
          backendMessage = (data as any).message;
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: backendMessage,
            code: 'BACKEND_ERROR',
          },
        },
        { status: response.status }
      );
    }

    // For success, if backend already returned ApiSuccessResponse<T>, just forward it
    if (data && typeof data === 'object' && 'success' in data) {
      return NextResponse.json(data, { status: response.status });
    }

    // Fallback: wrap plain data into standard success envelope
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: response.status }
    );
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
