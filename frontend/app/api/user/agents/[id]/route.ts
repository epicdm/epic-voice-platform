import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

// GET /api/user/agents/[id] - Get single agent
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
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for API route');
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

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}`, {
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

    // Flask already returns {success: true, data: {...}}, so just pass it through
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching agent:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to fetch agent', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

// PUT /api/user/agents/[id] - Update agent
export async function PUT(
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
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for API route');
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
    const body = await req.json();

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}`, {
      method: 'PUT',
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

    // Flask already returns {success: true, data: {...}}, so just pass it through
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating agent:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to update agent', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}

// DELETE /api/user/agents/[id] - Delete agent
export async function DELETE(
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
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for API route');
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

    // Forward to Flask backend
    const response = await fetch(`${BACKEND_URL}/api/user/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      // Flask returns {success: false, error: {message, code}}
      // Pass through as-is without double-wrapping
      return NextResponse.json(data, { status: response.status });
    }

    // Flask returns {success: true, data: {...}}
    // Pass through as-is
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting agent:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to delete agent', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    );
  }
}
