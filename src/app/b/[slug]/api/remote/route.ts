import { access } from '@/lib/session';
import { pushCommand } from '@/lib/buddies';
import { rateLimited } from '@/lib/guard';
import { REMOTE_COMMANDS } from '@/lib/commands';

export const runtime = 'nodejs';

/** The big buttons on the phone remote, played on the paired TV. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (rateLimited(req, `remote:${slug}`, 240)) return Response.json({ error: 'Slow down a little!' }, { status: 429 });
  const { buddy, device, parent } = await access(slug);
  if (!buddy || (!device && !parent)) return Response.json({ error: 'Not allowed' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!REMOTE_COMMANDS.includes(b.command)) return Response.json({ error: 'Unknown button' }, { status: 400 });
  await pushCommand(slug, b.command);
  return Response.json({ ok: true });
}
