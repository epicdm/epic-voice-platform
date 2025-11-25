/**
 * Funnel Node Detail API Route
 * Proxies requests to Flask backend /api/funnels/:id/nodes/:nodeId
 *
 * PUT /api/user/funnels/:id/nodes/:nodeId - Update node
 * DELETE /api/user/funnels/:id/nodes/:nodeId - Delete node
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
 * PUT /api/user/funnels/:id/nodes/:nodeId
 * Update a node
 */
export async function PUT(
  request: NextRequest,

  props: { params: Promise<{ id: string; nodeId: string }> }
) {
  const params = await props.params
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, nodeId } = params;
    const body = await request.json();

    // Update node via Flask backend
    const response = await fetch(
      `${FLASK_API_URL}/api/funnels/${id}/nodes/${nodeId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": userEmail,
        },
        credentials: "include",
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Flask API error:", error);
      return NextResponse.json(
        { error: "Failed to update node" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error updating node:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/funnels/:id/nodes/:nodeId
 * Delete a node
 */
export async function DELETE(
  request: NextRequest,

  props: { params: Promise<{ id: string; nodeId: string }> }
) {
  const params = await props.params
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, nodeId } = params;

    // Delete node via Flask backend
    const response = await fetch(
      `${FLASK_API_URL}/api/funnels/${id}/nodes/${nodeId}`,
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
        { error: "Failed to delete node" },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: { success: true } });
  } catch (error) {
    console.error("Error deleting node:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
