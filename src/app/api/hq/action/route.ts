import { verifyHQRequest, reportToHQ } from '@/lib/hq';
import { getBuddy, setStatus } from '@/lib/buddies';
import { welcomeEmail } from '@/lib/email';

export const runtime = 'nodejs';

/** The admin's buttons (Sites page). A "site" is one buddy. */
export async function POST(req: Request) {
  const msg = await verifyHQRequest(req);
  if (!msg) return new Response('Unauthorized', { status: 401 });
  const b = await getBuddy(msg.slug);
  if (!b) return new Response('No such buddy', { status: 404 });
  switch (msg.action) {
    case 'disable': await setStatus(b.slug, 'disabled'); await reportToHQ({ type: 'site.upsert', slug: b.slug, status: 'disabled' }); break;
    case 'enable': await setStatus(b.slug, 'active'); await reportToHQ({ type: 'site.upsert', slug: b.slug, status: 'live' }); break;
    case 'extend': return Response.json({ ok: true, note: 'Subscription product: extend in Stripe instead.' });
    case 'resend_email': await welcomeEmail(b); break;
    default: return new Response('Unknown action', { status: 400 });
  }
  return Response.json({ ok: true, slug: b.slug });
}
