import { NextResponse, type NextRequest } from "next/server";

/**
 * Keep routing middleware network-free.
 *
 * Authentication is enforced by protected layouts/routes (for example the
 * `(app)` layout calls getCurrentUser() and redirects unauthenticated users).
 * Performing Supabase network I/O here made every request depend on an
 * external auth round-trip and could take the entire site down when that call
 * stalled. Middleware must return immediately so public routes stay reachable.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
