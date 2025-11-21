import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5001";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { phoneNumber: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: { message: "Authentication required" } },
        { status: 401 }
      );
    }

    const phoneNumber = params.phoneNumber;

    const response = await fetch(
      `${BACKEND_URL}/api/user/phone-numbers/${encodeURIComponent(phoneNumber)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": session.user.email,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { success: false, error: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Error deleting phone number:", error);
    return NextResponse.json(
      {
        success: false,
        error: { message: "Failed to delete phone number" },
      },
      { status: 500 }
    );
  }
}
