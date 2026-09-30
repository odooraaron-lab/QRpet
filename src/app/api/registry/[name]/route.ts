import { nameTaken } from '@/lib/buddies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * For the party site, which owns *.myqr.co.nz: "is teddy a buddy?" It forwards buddy names here and
 * won't hand the name to a party. Answers only yes or no; cached briefly at the edge.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  const buddy = /^[a-z0-9-]{1,40}$/.test(name) ? await nameTaken(name) : false;
  return Response.json({ buddy }, { headers: { 'cache-control': 'public, s-maxage=30, stale-while-revalidate=300' } });
}
