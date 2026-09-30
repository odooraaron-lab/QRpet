import { cookies } from 'next/headers';
import { activate, createDevice, createPending, getBuddy, sign } from '@/lib/buddies';
import { deviceCookie, parentCookie, cookieOpts } from '@/lib/session';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Local testing only: /api/dev/seed?name=teddy&days=12 makes an active buddy, fakes N days of growth,
 * remembers this browser as a device and as the parent, and opens it. Off in production.
 */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_ROUTES !== 'true') return new Response('Not found', { status: 404 });
  const q = new URL(req.url).searchParams;
  const slug = (q.get('name') || 'teddy').toLowerCase();
  const days = Math.max(0, Math.min(120, Number(q.get('days') || 0)));
  const sql = await db();
  if (!(await getBuddy(slug)) || q.get('reset')) {
    await sql`delete from qb_buddies where slug = ${slug}`;
    await createPending({ slug, email: q.get('email') || 'dev@example.com', colour: q.get('colour') || 'honey', childName: q.get('child') ?? 'Poppy', ageBand: '4-5', plan: 'monthly' });
    await activate(slug);
    // Fake earlier days so today's visit is day days+1.
    const { nextItem, ITEM } = await import('@/lib/growth');
    const learned: string[] = [];
    for (let d = 1; d <= days; d++) {
      const recent = learned.slice(-2).reverse().map((id) => ITEM[id]?.track);
      const it = nextItem(learned, d, {}, recent as never);
      if (!it) break;
      learned.push(it.id);
      await sql`insert into qb_unlocks (slug, unlocked_on, visit_day, item_id) values (${slug}, current_date - ${days - d + 1}::int, ${d}, ${it.id})`;
    }
    await sql`update qb_buddies set visit_day = ${learned.length} where slug = ${slug}`;
  }
  const t = await createDevice(slug, q.get('tv') ? 'tv' : 'phone', 'Dev browser');
  const c = await cookies();
  c.set(deviceCookie(slug), t, cookieOpts(30));
  const b = await getBuddy(slug);
  if (b) c.set(parentCookie(slug), sign({ slug, pid: b.parent_id }, 30 * 1440), cookieOpts(30));
  return new Response(null, { status: 303, headers: { location: `/b/${slug}${q.get('tv') ? '/tv' : ''}` } });
}
