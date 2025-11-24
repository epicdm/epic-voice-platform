/**
 * Funnel Edges API Route
 * Proxies requests to Flask backend /api/funnels/:id/edges
 *
 * POST /api/user/funnels/:id/edges - Add edge to funnel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5001";

/**
 * Helper to get user email with localhost bypass
 */
async function getUserEmail(request: NextRequest): Promise<string | null> {
  const hostname = request.headers.get('host') || '';
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

  if (isLocalhost) {
    return 'giraud.eric@gmail.com';
  }

  const session = await auth();
  return session?.user?.email || null;
}

/**
 * POST /api/user/funnels/:id/edges
 * Add an edge to a funnel
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Add edge via Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/funnels/${id}/edges`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Flask API error:", error);
      return NextResponse.json(
        { error: "Failed to add edge" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Error adding edge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
