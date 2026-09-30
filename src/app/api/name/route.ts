import { checkName, cleanName } from '@/lib/names';
import { rateLimited } from '@/lib/guard';

export const runtime = 'nodejs';

/** Live name check on the sign-up form: /api/name?n=teddy */
export async function GET(req: Request) {
  if (rateLimited(req, 'name', 300)) return Response.json({ ok: false, reason: 'Too many tries. Wait a minute.' }, { status: 429 });
  const slug = cleanName(new URL(req.url).searchParams.get('n'));
  return Response.json({ slug, ...(await checkName(slug)) });
}
