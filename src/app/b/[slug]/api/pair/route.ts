import { cookies } from 'next/headers';
import { getBuddy, pairingStart } from '@/lib/buddies';
import { cookieOpts, deviceCookie } from '@/lib/session';
import { rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';

/**
 * A TV asks for a pairing code (and then asks again every few seconds). Once the parent types the code
 * on their dashboard, the next ask hands the TV its key, kept in a cookie for a year.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (rateLimited(req, 'pair', 600)) return Response.json({ error: 'Too many tries' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const device = String(b.device || '').slice(0, 64);
  if (device.length < 16) return Response.json({ error: 'Bad device' }, { status: 400 });
  if (!(await getBuddy(slug))) return Response.json({ error: 'Not found' }, { status: 404 });
  const r = await pairingStart(device);
  if ('token' in r) {
    if (r.slug !== slug) return Response.json({ code: null, error: 'Paired to another buddy' }, { status: 409 });
    (await cookies()).set(deviceCookie(slug), r.token!, cookieOpts(365));
    return Response.json({ paired: true });
  }
  return Response.json({ code: r.code });
}
