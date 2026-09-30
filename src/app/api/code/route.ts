import { buddyByCode } from '@/lib/buddies';
import { normalizeCode } from '@/lib/codes';
import { rateLimited } from '@/lib/guard';
import { buddyUrl } from '@/lib/config';

export const runtime = 'nodejs';

/** A typed buddy code (login page, TV): says where to go to open that buddy on this device. */
export async function POST(req: Request) {
  if (rateLimited(req, 'code', 30)) return Response.json({ error: 'Too many tries. Please wait a while.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const buddy = await buddyByCode(b.code);
  if (!buddy) return Response.json({ error: 'That code didn’t match a buddy. Check the spelling on your card.' }, { status: 404 });
  const tv = b.tv ? '&tv=1' : '';
  return Response.json({ url: buddyUrl(buddy.slug, `/go?c=${encodeURIComponent(normalizeCode(buddy.card_key))}${tv}`) });
}
