import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/register'];

export function middleware(request: NextRequest) {
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

    const isPublic = PUBLIC_ROUTES.some(route => pathname === route);
    const token = request.cookies.get('wr_access_token')?.value;

    let response: NextResponse;

    // 1. Unauthenticated User requesting Protected Route -> Login
    if (!isPublic && !token) {
        response = NextResponse.redirect(new URL('/login', request.url));
    }
    // 2. Authenticated User requesting Public Route (Login) -> Home
    else if (isPublic && token) {
        response = NextResponse.redirect(new URL('/', request.url));
    }
    else {
        response = NextResponse.next();
    }

    // --- Security Headers Injection ---
    const headers = response.headers;

    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (process.env.NODE_ENV === 'production') {
        headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }

    headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; connect-src 'self' https:;"
    );

    headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
