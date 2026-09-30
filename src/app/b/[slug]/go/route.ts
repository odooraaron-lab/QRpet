import { cookies } from 'next/headers';
import { createDevice, getBuddy } from '@/lib/buddies';
import { buddyBase, cookieOpts, deviceCookie, deviceOf } from '@/lib/session';
import { rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';

/** What the printed card's QR code opens: remembers this phone or tablet, then shows the buddy. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const base = await buddyBase(slug);
  // A relative redirect keeps the visitor on whichever address they came in on (teddy.myqr.co.nz or /b/teddy).
  const home = () => new Response(null, { status: 303, headers: { location: `${base}/` } });
  if (rateLimited(req, 'go', 60)) return home();
  const key = new URL(req.url).searchParams.get('c') || '';
  const buddy = await getBuddy(slug);
  if (buddy && key && key === buddy.card_key && !(await deviceOf(slug))) {
    const t = await createDevice(slug, 'phone', 'Phone or tablet');
    (await cookies()).set(deviceCookie(slug), t, cookieOpts(365));
  }
  return home();
}
