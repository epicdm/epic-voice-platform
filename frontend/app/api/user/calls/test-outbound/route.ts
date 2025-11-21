import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/auth';

/**
 * Test Outbound Call API Route
 *
 * Proxies test call requests from the frontend to the Flask backend.
 * This route is necessary because the frontend uses relative URLs which go through Next.js.
 */
export async function POST(request: NextRequest) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = request.headers.get('host') || '';
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

    // Parse request body
    const body = await request.json();
    const { to_number, agent_id } = body;

    // Validate required fields
    if (!to_number || !agent_id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "agent_id and to_number are required",
            code: "MISSING_PARAMETERS",
          },
        },
        { status: 400 }
      );
    }

    // Forward request to Flask backend
    const flaskUrl = process.env.BACKEND_URL || "http://localhost:5001";
    const response = await fetch(`${flaskUrl}/api/user/calls/test-outbound`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      body: JSON.stringify({
        to_number,
        agent_id,
      }),
    });

    // Parse Flask response
    const data = await response.json();

    // Return Flask response with appropriate status code
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error proxying test-outbound call request:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to initiate test call",
          code: "PROXY_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
