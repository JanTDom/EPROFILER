import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api auth routes, favicon, logo
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname === '/login' ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.png' ||
    pathname === '/logo.png' ||
    pathname === '/icon.png' ||
    pathname === '/apple-touch-icon.png'
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('eprofiler_auth');

  if (!authCookie || authCookie.value !== 'authorized') {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
