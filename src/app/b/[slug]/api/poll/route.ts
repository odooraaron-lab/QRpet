import { access } from '@/lib/session';
import { commandsSince, markHq } from '@/lib/buddies';
import { reportToHQ } from '@/lib/hq';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The player asks every 3 seconds: any "special moment" or remote button pressed since `since`? TVs also check in with the admin. */
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const { buddy, device, parent } = await access(slug);
  if (!buddy || (!device && !parent)) return Response.json({ error: 'Not allowed' }, { status: 401 });
  const since = Number(new URL(req.url).searchParams.get('since')) || 0;
  const commands = await commandsSince(slug, since);
  if (device?.kind === 'tv' && (!device.last_hq_at || Date.now() - new Date(device.last_hq_at).getTime() > 5 * 60000)) {
    await markHq(device.id);
    reportToHQ({ type: 'heartbeat', slug });
  }
  return Response.json({ commands, refresh: commands.some((c) => c.command === 'refresh') }, { headers: { 'cache-control': 'no-store' } });
}
