import { cookies, headers } from 'next/headers';
import { BUDDY_DOMAIN } from './config';
import { deviceFor, getBuddy, verify, type Buddy } from './buddies';

// Who is asking, for a buddy's pages and APIs.
//   device cookie  qbd_<slug>  a phone that scanned the card, or a paired TV
//   parent cookie  qbp_<slug>  a signed parent session (from a login link), 30 days

export const deviceCookie = (slug: string) => `qbd_${slug}`;
export const parentCookie = (slug: string) => `qbp_${slug}`;

/**
 * Links inside a buddy: "" when the page is served at teddy.myqr.co.nz (directly or forwarded by the
 * party site), "/b/teddy" when it's reached at create.myqr.co.nz/b/teddy.
 */
export async function buddyBase(slug: string) {
  const h = await headers();
  if (h.get('x-qb-buddy') === slug) return '';
  const host = (h.get('x-forwarded-host') || h.get('host') || '').split(',')[0].split(':')[0].trim().toLowerCase();
  if (BUDDY_DOMAIN && host === `${slug}.${BUDDY_DOMAIN}`) return '';
  return `/b/${slug}`;
}

export async function parentOf(slug: string) {
  const c = await cookies();
  const p = verify<{ slug: string; pid: string }>(c.get(parentCookie(slug))?.value);
  return p && p.slug === slug ? p : null;
}

export async function deviceOf(slug: string) {
  const c = await cookies();
  return deviceFor(slug, c.get(deviceCookie(slug))?.value);
}

/** Loads a buddy and says whether this browser may see it (a known device, or its parent). */
export async function access(slug: string): Promise<{ buddy: Buddy | null; device: Awaited<ReturnType<typeof deviceOf>>; parent: boolean }> {
  const buddy = await getBuddy(slug);
  if (!buddy) return { buddy: null, device: null, parent: false };
  const [device, parent] = await Promise.all([deviceOf(slug), parentOf(slug)]);
  return { buddy, device, parent: !!parent && parent.pid === buddy.parent_id };
}

export const cookieOpts = (days: number) => ({
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: days * 86400,
});
