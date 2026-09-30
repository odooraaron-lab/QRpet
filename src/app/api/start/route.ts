import { stripe } from '@/lib/stripe';
import { createPending, setSessionId } from '@/lib/buddies';
import { checkName, cleanName } from '@/lib/names';
import { activateBuddy } from '@/lib/activate';
import { rateLimited, validEmail } from '@/lib/guard';
import { PALETTES } from '@/components/Buddy';
import { APP_URL, DEV_CHECKOUT, HQ_PRODUCT, PRICES, TRIAL_DAYS } from '@/lib/config';

export const runtime = 'nodejs';

const clean = (v: unknown, max: number) => String(v ?? '').replace(/[^\p{L}\p{M}' -]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Sign-up: hold the name, then Stripe Checkout for the subscription (with the free trial). */
export async function POST(req: Request) {
  if (rateLimited(req, 'start', 20)) return Response.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  if (b.company) return Response.json({ error: 'Something went wrong.' }, { status: 400 });
  const slug = cleanName(b.name);
  const check = await checkName(slug);
  if (!check.ok) return Response.json({ error: check.reason, field: 'name' }, { status: 409 });
  const email = String(b.email || '').trim().toLowerCase();
  if (!validEmail(email)) return Response.json({ error: 'Please check your email address.', field: 'email' }, { status: 400 });
  const colour = PALETTES[b.colour] ? b.colour : 'honey';
  const ageBand = ['2-3', '4-5', '6+'].includes(b.ageBand) ? b.ageBand : '4-5';
  const plan = b.plan === 'yearly' ? 'yearly' : 'monthly';
  await createPending({ slug, email, colour, childName: clean(b.childName, 24), ageBand, plan });

  if (DEV_CHECKOUT) {
    await activateBuddy(slug);
    return Response.json({ url: `/start/done?dev=${slug}` });
  }
  if (!PRICES[plan].id) return Response.json({ error: 'Payments aren’t set up yet (missing Stripe price).' }, { status: 500 });
  const meta = { product: HQ_PRODUCT, site_slug: slug };
  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PRICES[plan].id, quantity: 1 }],
      customer_email: email,
      allow_promotion_codes: true,
      metadata: meta,
      subscription_data: { metadata: meta, ...(TRIAL_DAYS > 0 ? { trial_period_days: TRIAL_DAYS } : {}) },
      success_url: `${APP_URL}/start/done?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/start?cancelled=1`,
    });
    await setSessionId(slug, session.id);
    return Response.json({ url: session.url });
  } catch (e: unknown) {
    console.error('stripe checkout failed', (e as Error)?.message);
    return Response.json({ error: 'Payment couldn’t start. Please try again in a moment.' }, { status: 502 });
  }
}
