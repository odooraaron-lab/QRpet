import { cookies } from 'next/headers';
import { createDevice, getBuddy } from '@/lib/buddies';
import { buddyBase, cookieOpts, deviceCookie, deviceOf } from '@/lib/session';
import { normalizeCode } from '@/lib/codes';
import { rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';

/**
 * Opens the buddy on this device for good: the printed card's QR, the "Open" button after sign-up and the
 * code typed on the login page all land here with the buddy code. `tv=1` remembers the device as a TV.
 */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const base = await buddyBase(slug);
  const q = new URL(req.url).searchParams;
  const tv = q.get('tv') === '1';
  // A relative redirect keeps the visitor on whichever address they came in on (teddy.myqr.co.nz or /b/teddy).
  const home = (wrong = false) => new Response(null, { status: 303, headers: { location: `${base}/${tv ? 'tv' : ''}${wrong ? '?code=wrong' : ''}` } });
  if (rateLimited(req, 'go', 60)) return home();
  const code = normalizeCode(q.get('c'));
  const buddy = await getBuddy(slug);
  const existing = await deviceOf(slug);
  if (buddy && code && code === normalizeCode(buddy.card_key) && (!existing || (tv && existing.kind !== 'tv'))) {
    const t = await createDevice(slug, tv ? 'tv' : 'phone', tv ? 'TV' : 'Phone or tablet');
    (await cookies()).set(deviceCookie(slug), t, cookieOpts(365));
  }
  return home(!!buddy && !!code && code !== normalizeCode(buddy.card_key));
}
