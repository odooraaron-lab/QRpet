import { cookies } from 'next/headers';
import { checkPin, getBuddy, sign } from '@/lib/buddies';
import { cookieOpts, parentCookie } from '@/lib/session';
import { validPin } from '@/lib/codes';
import { rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';

/** The parent PIN (from the buddy's secret button, or the parent page on a new device). */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (rateLimited(req, `pin:${slug}`, 30)) return Response.json({ error: 'Too many tries. Please wait a while.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const buddy = await getBuddy(slug);
  if (!buddy || !validPin(b.pin)) return Response.json({ error: 'Wrong PIN' }, { status: 400 });
  const r = await checkPin(slug, b.pin);
  if (r === 'locked') return Response.json({ error: 'Too many wrong tries. Wait 10 minutes.', locked: true }, { status: 429 });
  if (r === 'wrong') return Response.json({ error: 'Wrong PIN' }, { status: 400 });
  (await cookies()).set(parentCookie(slug), sign({ slug, pid: buddy.parent_id }, 30 * 1440), cookieOpts(30));
  return Response.json({ ok: true });
}
