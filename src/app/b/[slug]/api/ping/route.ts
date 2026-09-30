import { access } from '@/lib/session';
import { addSeconds, localNow } from '@/lib/buddies';

export const runtime = 'nodejs';

/** Play time, sent every 30 seconds while QR is awake (for the parent's daily limit and the dashboard). */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const { buddy, device, parent } = await access(slug);
  if (!buddy || (!device && !parent)) return Response.json({ error: 'Not allowed' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const seconds = Math.max(0, Math.min(60, Number(b.seconds) || 0));
  if (seconds) await addSeconds(slug, localNow(buddy.tz).date, seconds);
  return Response.json({ ok: true });
}
