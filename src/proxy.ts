import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get('host') || '';

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|openwakeword|images).*)',
  ],
};
