import { access } from '@/lib/session';
import { buildState } from '@/lib/state';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const { buddy, device, parent } = await access(slug);
  if (!buddy) return Response.json({ error: 'Not found' }, { status: 404 });
  if (!device && !parent) return Response.json({ error: 'Scan the card first' }, { status: 401 });
  return Response.json(await buildState(buddy), { headers: { 'cache-control': 'no-store' } });
}
