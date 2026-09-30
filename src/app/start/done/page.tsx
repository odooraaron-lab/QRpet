import type { Metadata } from 'next';
import { Buddy } from '@/components/Buddy';
import { SiteFoot, SiteHead } from '@/components/Site';
import { stripe } from '@/lib/stripe';
import { getBuddy, type Buddy as B } from '@/lib/buddies';
import { activateBuddy } from '@/lib/activate';
import { parentLink } from '@/lib/email';
import { DEV_CHECKOUT, HQ_PRODUCT } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your buddy is ready', robots: { index: false } };

export default async function Done({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  let buddy: B | null = null;
  if (DEV_CHECKOUT && q.dev) buddy = await getBuddy(q.dev);
  else if (q.session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(q.session_id);
      if (s.metadata?.product === HQ_PRODUCT && s.metadata.site_slug && (s.status === 'complete')) {
        // The webhook normally gets here first; this covers a slow webhook.
        buddy = (await activateBuddy(s.metadata.site_slug, {
          subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription?.id, sessionId: s.id,
        })) ?? (await getBuddy(s.metadata.site_slug));
      }
    } catch (e) { console.error('done page lookup failed', e); }
  }
  const name = buddy ? buddy.slug.charAt(0).toUpperCase() + buddy.slug.slice(1) : 'Your buddy';
  return (
    <>
      <SiteHead cta={false} />
      <main className="narrow section center">
        <div style={{ width: 200, margin: '0 auto' }}><Buddy colour={buddy?.colour || 'honey'} mood="grin" action="jump" /></div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>{name} is ready to hatch!</h1>
        {buddy?.status === 'active' ? (
          <>
            <p className="lede" style={{ margin: '0 auto 20px' }}>We’ve emailed your sign-in link to <b>{buddy.email}</b>. Next: print the QR card from the parent page and let your child scan it.</p>
            {/* Only shown right after paying, on this browser: saves a trip to the inbox. */}
            <a className="btn" href={parentLink(buddy, 1)}>Open the parent page</a>
          </>
        ) : (
          <p className="lede" style={{ margin: '0 auto' }}>Thanks! We’re just confirming your payment. Your sign-in link will arrive by email in a minute or two.</p>
        )}
      </main>
      <SiteFoot />
    </>
  );
}
