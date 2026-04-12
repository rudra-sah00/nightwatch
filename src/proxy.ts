import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  // Rewrite docs subdomain to our actual Next.js docs route
  // Also rewrites localhost:3000 to the docs site if you test with local.docs.watch.rudrasahoo.live
  if (
    hostname.startsWith('docs.watch.rudrasahoo.live') ||
    hostname.startsWith('docs.localhost')
  ) {
    url.pathname = `/docs-site${url.pathname === '/' ? '' : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|openwakeword|images).*)',
  ],
};
