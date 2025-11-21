import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/dashboard/agents",
  "/dashboard/calls",
  "/dashboard/billing",
  "/dashboard/settings",
  "/dashboard/marketplace",
  "/dashboard/phone-numbers",
  "/admin",
  "/agents",
  "/phone-numbers",
  "/calls",
  "/analytics",
  "/settings",
]

// Routes that should redirect authenticated users away
const authRoutes = ["/auth/signin", "/auth/signup"]

// Public routes that anyone can access
const publicRoutes = ["/", "/api/auth"]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // DEVELOPMENT BYPASS: Allow localhost without auth
  const host = request.headers.get('host') || '';
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    console.log(' LOCALHOST BYPASS ENABLED');
    return NextResponse.next();
  }

  // Allow all API routes - they handle their own auth
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some((route) => pathname === route)

  // Lightweight auth check based on NextAuth session cookies
  const hasSessionCookie =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token") ||
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token")

  // Redirect unauthenticated users to sign in
  if (isProtectedRoute && !hasSessionCookie) {
    console.log(` Redirecting to sign-in: ${pathname} (no session)`)
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
