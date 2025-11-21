import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/auth"

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

  // Get session
  const session = await auth()
  
  console.log(` Middleware check: ${pathname}, session: ${session?.user?.email || 'NONE'}`)

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route))
  const isPublicRoute = publicRoutes.some((route) => pathname === route)

  // Redirect unauthenticated users to sign in
  if (isProtectedRoute && !session?.user) {
    console.log(` Redirecting to sign-in: ${pathname} (no session)`)
    const signInUrl = new URL("/auth/signin", request.url)
    signInUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && session?.user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Check trial status for protected routes (DISABLED - allow all authenticated users)
  if (isProtectedRoute && session?.user) {
    const hasActiveSubscription = session.user.hasActiveSubscription

    // Log subscription status for monitoring
    if (!hasActiveSubscription) {
      console.log(`⚠️  User ${session.user.email} - no active subscription (showing trial banner)`, {
        email: session.user.email,
        subscriptionStatus: session.user.subscriptionStatus,
      })
    } else {
      console.log(`✅ User ${session.user.email} - has active subscription`)
    }

    // Allow access - trial banner will be shown in UI via TrialBanner component
    return NextResponse.next()
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
