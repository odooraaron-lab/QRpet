import { cookies } from 'next/headers';
import { getBuddy, sign, verify } from '@/lib/buddies';
import { buddyBase, cookieOpts, parentCookie } from '@/lib/session';

export const runtime = 'nodejs';

/** The link in the parent's email: signs this browser in to the parent page for 30 days. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const base = await buddyBase(slug);
  const t = verify<{ slug: string; pid: string; use: string }>(new URL(req.url).searchParams.get('t'));
  const b = t && t.use === 'login' && t.slug === slug ? await getBuddy(slug) : null;
  if (b && b.parent_id === t!.pid) {
    (await cookies()).set(parentCookie(slug), sign({ slug, pid: b.parent_id }, 30 * 1440), cookieOpts(30));
    return new Response(null, { status: 303, headers: { location: `${base}/parent` } });
  }
  return new Response(null, { status: 303, headers: { location: `${base}/parent?expired=1` } });
}
