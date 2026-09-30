import { NextResponse, type NextRequest } from 'next/server';

/**
 * login.<domain>/…        → /login
 * teddy.<BUDDY_DOMAIN>/…  → /b/teddy/…   (when this app receives the buddy's own host)
 * Buddy hosts normally reach us through the party site, which forwards teddy.myqr.co.nz/… to
 * APP_URL/b/teddy/… with an x-qb-buddy header (see README). Works locally at teddy.localhost:3000
 * with BUDDY_DOMAIN=localhost.
 */
const RESERVED = new Set(['www', 'create', 'login', 'admin', 'api']);

export function middleware(req: NextRequest) {
  const headers = new Headers(req.headers);
  const domain = (process.env.BUDDY_DOMAIN || '').toLowerCase();
  const host = (req.headers.get('host') || '').split(':')[0].toLowerCase();
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/_next/')) return NextResponse.next();

  if (host.startsWith('login.')) {
    if (pathname === '/' || pathname === '/login') {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.rewrite(url);
    }
    // Links in the page chrome (home, make a buddy, privacy…) belong to the main site.
    if (!pathname.startsWith('/api/') && process.env.APP_URL) return NextResponse.redirect(new URL(pathname + req.nextUrl.search, process.env.APP_URL));
    return NextResponse.next();
  }
  if (domain && host.endsWith(`.${domain}`)) {
    const sub = host.slice(0, -(domain.length + 1));
    if (!sub.includes('.') && !RESERVED.has(sub)) {
      const url = req.nextUrl.clone();
      url.pathname = `/b/${sub}${pathname === '/' ? '' : pathname}`;
      headers.set('x-qb-buddy', sub);
      return NextResponse.rewrite(url, { request: { headers } });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)'] };
