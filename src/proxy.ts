import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore internal paths and API
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // file extension (favicon.ico, etc)
  ) {
    return NextResponse.next();
  }

  const isPublic = PUBLIC_ROUTES.some((route) => pathname === route);
  // Check for HttpOnly cookie (wr_access_token)
  const token = request.cookies.get('wr_access_token')?.value;

  let response: NextResponse;

  // 1. Unauthenticated User requesting Protected Route -> Login
  if (!isPublic && !token) {
    response = NextResponse.redirect(new URL('/login', request.url));
  }
  // 2. Authenticated User requesting Public Route (Login) -> Home
  else if (isPublic && token) {
    response = NextResponse.redirect(new URL('/', request.url));
  } else {
    response = NextResponse.next();
  }

  // --- Enhanced Security Headers ---
  const headers = response.headers;

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // XSS Protection (legacy but still useful)
  headers.set('X-XSS-Protection', '1; mode=block');

  // HTTPS enforcement in production
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  // Content Security Policy - Different for dev/prod
  const isDev = process.env.NODE_ENV === 'development';

  const cspPolicy = isDev
    ? // Development: Allow Next.js hot reload and inline scripts
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' blob: data: https: http:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: http: wss: ws:; " +
      "media-src 'self' https: http: blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-ancestors 'none';"
    : // Production: CSP that works with Next.js and Vercel
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://*.vercel-scripts.com; " +
      "style-src 'self' 'unsafe-inline' https://vercel.live; " +
      "img-src 'self' blob: data: https:; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https: wss: https://api.rudrasahoo.live wss://api.rudrasahoo.live https://vercel.live wss://*.pusher.com wss://*.vercel.live; " +
      "media-src 'self' https://api.rudrasahoo.live https://*.net51.cc https://*.net20.cc blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self'; " +
      "frame-src 'self' https://vercel.live; " +
      "worker-src 'self' blob:; " +
      "frame-ancestors 'none'; " +
      'upgrade-insecure-requests;';

  headers.set('Content-Security-Policy', cspPolicy);

  // Permissions Policy - Allow camera/microphone for WebRTC, restrict other dangerous features
  headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - stream (HLS streaming proxy)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|stream|_next/static|_next/image|favicon.ico).*)',
  ],
};
