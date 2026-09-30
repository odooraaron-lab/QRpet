import type { Metadata } from 'next';
import { Buddy } from '@/components/Buddy';
import { SiteFoot, SiteHead } from '@/components/Site';
import { stripe } from '@/lib/stripe';
import { getBuddy, type Buddy as B } from '@/lib/buddies';
import { activateBuddy } from '@/lib/activate';
import { DEV_CHECKOUT, HQ_PRODUCT, LOGIN_URL, buddyUrl } from '@/lib/config';

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
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)' }}>{name} is on the way!</h1>
        {buddy?.status === 'active' ? (
          <>
            <p className="lede" style={{ margin: '0 auto 18px' }}>An egg arrives on the first visit and hatches on the fourth. Write these down (we’ve emailed them to <b>{buddy.email}</b> too):</p>
            <div className="codes">
              <div><small>Buddy code</small><b>{buddy.card_key}</b><span>Opens {name} on any phone, tablet or TV at {LOGIN_URL.replace(/^https?:\/\//, '')}</span></div>
              <div><small>Parent PIN</small><b className="pin">{buddy.parent_pin}</b><span>For the parent page</span></div>
            </div>
            <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
              <a className="btn" href={buddyUrl(buddy.slug, `/go?c=${encodeURIComponent(buddy.card_key)}`)}>Open {name} on this device</a>
              <a className="btn ghost" href={buddyUrl(buddy.slug, '/parent')}>Parent page</a>
            </div>
          </>
        ) : (
          <p className="lede" style={{ margin: '0 auto' }}>Thanks! We’re just confirming your payment. Your buddy code will arrive by email in a minute or two.</p>
        )}
      </main>
      <SiteFoot />
    </>
  );
}
