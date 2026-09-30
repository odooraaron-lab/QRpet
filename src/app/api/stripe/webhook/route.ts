import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { activateBuddy } from '@/lib/activate';
import { getBuddy, setStatus } from '@/lib/buddies';
import { reportToHQ } from '@/lib/hq';
import { HQ_PRODUCT } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * This app's own Stripe webhook. Events: checkout.session.completed, customer.subscription.updated,
 * customer.subscription.deleted. Every myQR site shares one Stripe account: anything not tagged
 * with this product is ignored.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get('stripe-signature') || '', process.env.STRIPE_WEBHOOK_SECRET || '');
  } catch {
    return new Response('Bad signature', { status: 400 });
  }
  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.metadata?.product === HQ_PRODUCT && s.metadata.site_slug) {
        await activateBuddy(s.metadata.site_slug, {
          subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id,
          customerId: typeof s.customer === 'string' ? s.customer : s.customer?.id, sessionId: s.id,
        });
      }
    }
    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const slug = sub.metadata?.product === HQ_PRODUCT ? sub.metadata.site_slug : null;
      const b = slug ? await getBuddy(slug) : null;
      if (b && b.status !== 'pending' && b.status !== 'disabled') {
        const live = ['active', 'trialing', 'past_due'].includes(sub.status) && event.type !== 'customer.subscription.deleted';
        await setStatus(b.slug, live ? 'active' : 'lapsed');
        await reportToHQ({ type: 'site.upsert', slug: b.slug, status: live ? 'live' : 'expired' });
      }
    }
  } catch (e) {
    console.error('webhook failed', event.type, e);
    return new Response('Handler error', { status: 500 });
  }
  return Response.json({ received: true });
}
