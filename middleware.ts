import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware to capture API metrics
 * Note: PostHog capture happens in API routes since middleware has limited runtime
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add timing header for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    response.headers.set("X-Request-Start", Date.now().toString());
  }

  return response;
}

export const config = {
  matcher: [
    // Match all API routes
    "/api/:path*",
  ],
};
