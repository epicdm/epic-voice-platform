/**
 * Funnel Detail API Route
 * Proxies requests to Flask backend /api/user/funnels/:id
 *
 * GET /api/user/funnels/:id - Get funnel
 * PUT /api/user/funnels/:id - Update funnel
 * DELETE /api/user/funnels/:id - Delete funnel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5001";

async function getUserEmail(request: NextRequest): Promise<string | null> {
  const hostname = request.headers.get("host") || "";
  const isLocalhost =
    hostname.includes("localhost") || hostname.includes("127.0.0.1");

  if (isLocalhost) {
    console.log("🔓 LOCALHOST: Using test user for funnels API");
    return "giraud.eric@gmail.com";
  }

  const session = await auth();
  return session?.user?.email || null;
}

function wrapSuccess(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

function wrapError(message: string, code: string, status = 500) {
  return NextResponse.json(
    { success: false, error: { message, code } },
    { status }
  );
}

/**
 * GET /api/user/funnels/:id
 * Get a single funnel by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return wrapError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;

    // Fetch from Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/user/funnels/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Flask API error:", error);
      return wrapError("Failed to fetch funnel", "FETCH_ERROR", response.status);
    }

    const data = await response.json();
    return wrapSuccess(data);
  } catch (error) {
    console.error("Error fetching funnel:", error);
    return wrapError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * PUT /api/user/funnels/:id
 * Update a funnel
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return wrapError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;
    const body = await request.json();

    // Update via Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/user/funnels/${id}`, {
      method: "PUT",
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
      return wrapError("Failed to update funnel", "UPDATE_ERROR", response.status);
    }

    const data = await response.json();
    return wrapSuccess(data);
  } catch (error) {
    console.error("Error updating funnel:", error);
    return wrapError("Internal server error", "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/user/funnels/:id
 * Delete a funnel
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userEmail = await getUserEmail(request);

    if (!userEmail) {
      return wrapError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { id } = await params;

    // Delete via Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/user/funnels/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": userEmail,
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Flask API error:", error);
      return wrapError("Failed to delete funnel", "DELETE_ERROR", response.status);
    }

    return wrapSuccess({ success: true });
  } catch (error) {
    console.error("Error deleting funnel:", error);
    return wrapError("Internal server error", "INTERNAL_ERROR", 500);
  }
}
