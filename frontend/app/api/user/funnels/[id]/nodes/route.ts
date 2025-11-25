/**
 * Funnel Nodes API Route
 * Proxies requests to Flask backend /api/funnels/:id/nodes
 *
 * POST /api/user/funnels/:id/nodes - Add node to funnel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5001";

/**
 * POST /api/user/funnels/:id/nodes
 * Add a node to a funnel
 */
export async function POST(
  request: NextRequest,

  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = request.headers.get('host') || '';
    const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = 'giraud.eric@gmail.com';
      console.log('🔓 LOCALHOST: Using test user for funnel nodes API');
    } else {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userEmail = session.user.email;
    }

    const { id } = params;
    const body = await request.json();

    // Add node via Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/funnels/${id}/nodes`, {
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
        { error: "Failed to add node" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) {
    console.error("Error adding node:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
