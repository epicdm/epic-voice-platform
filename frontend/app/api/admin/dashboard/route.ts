import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const ADMIN_EMAILS = ["admin@epic.dm"];

/**
 * Admin Dashboard Metrics API
 *
 * Provides real-time metrics for the admin dashboard including:
 * - User statistics
 * - Call metrics
 * - System health
 * - Recent alerts
 */
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await auth();

    if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json(
        { success: false, error: { message: "Admin access required", code: "FORBIDDEN" } },
        { status: 403 }
      );
    }

    // Forward request to Flask backend
    const flaskUrl = process.env.BACKEND_URL || "http://localhost:5001";
    const response = await fetch(`${flaskUrl}/api/admin/dashboard`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Email": session.user.email,
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching admin dashboard metrics:", error);

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch dashboard metrics",
          code: "PROXY_ERROR",
        },
      },
      { status: 500 }
    );
  }
}
