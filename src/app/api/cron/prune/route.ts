import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Daily (vercel.json): removes sign-ups that never paid, old pairing codes and old remote presses. */
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('Unauthorized', { status: 401 });
  const sql = await db();
  const a = await sql`delete from qb_buddies where status = 'pending' and created_at < now() - interval '2 days' returning slug`;
  await sql`delete from qb_pairings where created_at < now() - interval '1 day'`;
  await sql`delete from qb_commands where created_at < now() - interval '1 day'`;
  await sql`delete from qb_parents p where not exists (select 1 from qb_buddies b where b.parent_id = p.id) and p.created_at < now() - interval '2 days'`;
  return Response.json({ ok: true, removed: a.length });
}
