/**
 * Funnel Edge Detail API Route
 * Proxies requests to Flask backend /api/funnels/:id/edges/:edgeId
 *
 * DELETE /api/user/funnels/:id/edges/:edgeId - Delete edge
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
 * DELETE /api/user/funnels/:id/edges/:edgeId
 * Delete an edge
 */
export async function DELETE(
  request: NextRequest,

  props: { params: Promise<{ id: string; edgeId: string }> }
) {
  const params = await props.params
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, edgeId } = params;

    // Delete edge via Flask backend
    const response = await fetch(
      `${FLASK_API_URL}/api/funnels/${id}/edges/${edgeId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Flask API error:", error);
      return NextResponse.json(
        { error: "Failed to delete edge" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error("Error deleting edge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
