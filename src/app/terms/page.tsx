import type { Metadata } from 'next';
import { SiteFoot, SiteHead } from '@/components/Site';
import { PRICES, PRODUCT, SUPPORT_EMAIL, TRIAL_DAYS } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms', alternates: { canonical: '/terms' } };

export default function Terms() {
  return (
    <>
      <SiteHead />
      <main className="narrow section">
        <h1>Terms</h1>
        <h3>The subscription</h3>
        <p>{PRODUCT} costs {PRICES.monthly.label} or {PRICES.yearly.label} (NZD, including GST){TRIAL_DAYS > 0 ? `, after a ${TRIAL_DAYS}-day free trial` : ''}. It renews automatically until you cancel from the parent page. Cancelling stops the next payment; there are no part-period refunds, but if something went wrong just email us.</p>
        <h3>Buddy names</h3>
        <p>A buddy’s name is also its web address. We can change or remove names that are offensive, misleading or belong to someone else’s brand.</p>
        <h3>Grown-ups in charge</h3>
        <p>An adult must set up and manage the buddy. You’re responsible for who has the QR card and which devices are connected (you can remove devices and replace the card at any time).</p>
        <h3>Changes</h3>
        <p>We keep adding things for QR to learn. If we ever change the price we’ll email you at least 30 days before.</p>
        <p>Questions: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
      </main>
      <SiteFoot />
    </>
  );
}
