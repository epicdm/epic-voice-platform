/**
 * Funnels API Route
 * Proxies requests to Flask backend /api/user/funnels
 *
 * GET /api/user/funnels - List funnels
 * POST /api/user/funnels - Create funnel
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5001";

/**
 * GET /api/user/funnels
 * List all funnels for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = request.headers.get("host") || "";
    const isLocalhost =
      hostname.includes("localhost") || hostname.includes("127.0.0.1");

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = "giraud.eric@gmail.com";
      console.log("🔓 LOCALHOST: Using test user for funnels API");
    } else {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userEmail = session.user.email;
    }

    // Forward query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();

    // Fetch from Flask backend
    const response = await fetch(
      `${FLASK_API_URL}/api/user/funnels${query ? `?${query}` : ""}`,
      {
        method: "GET",
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
        {
          success: false,
          error: {
            message: "Failed to fetch funnels",
            code: "FETCH_ERROR",
          },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    // Wrap response in expected format
    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching funnels:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/funnels
 * Create a new funnel
 */
export async function POST(request: NextRequest) {
  try {
    // LOCALHOST BYPASS: Use test user email for local development
    const hostname = request.headers.get("host") || "";
    const isLocalhost =
      hostname.includes("localhost") || hostname.includes("127.0.0.1");

    let userEmail: string | null = null;

    if (isLocalhost) {
      userEmail = "giraud.eric@gmail.com";
      console.log("🔓 LOCALHOST: Using test user for funnels API");
    } else {
      const session = await auth();

      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      userEmail = session.user.email;
    }

    // Get request body
    const body = await request.json();

    // Create funnel via Flask backend
    const response = await fetch(`${FLASK_API_URL}/api/user/funnels`, {
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
        {
          success: false,
          error: {
            message: "Failed to create funnel",
            code: "CREATE_ERROR",
          },
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating funnel:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Internal server error",
          code: "INTERNAL_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
