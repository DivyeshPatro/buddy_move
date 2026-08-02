import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED = ['/dashboard', '/rides', '/subscriptions', '/wallet', '/profile', '/tracking'];

// Routes that require admin role
const ADMIN_ONLY = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  // Redirect unauthenticated users trying to access protected routes
  const isProtected = PROTECTED.some(p => pathname.startsWith(p));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/auth/login?redirect=${pathname}`, request.url));
  }

  // Redirect non-admin users trying to access admin routes
  const isAdmin = ADMIN_ONLY.some(p => pathname.startsWith(p));
  if (isAdmin) {
    const adminRole = request.cookies.get('admin_role')?.value;
    if (!token || !adminRole) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets, images, and internal Next.js routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
