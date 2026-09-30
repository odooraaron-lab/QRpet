import type { Metadata } from 'next';
import { SiteFoot, SiteHead } from '@/components/Site';
import { PRODUCT, SUPPORT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy', alternates: { canonical: '/privacy' } };

export default function Privacy() {
  return (
    <>
      <SiteHead />
      <main className="narrow section">
        <h1>Privacy</h1>
        <p className="lede">{PRODUCT} is for young children, so we collect as little as we can and never sell or share it for advertising.</p>
        <h3>What we store</h3>
        <ul>
          <li>The parent’s email address, to send sign-in links and receipts.</li>
          <li>The buddy’s name, colour and settings, and your child’s first name if you give it (optional).</li>
          <li>What QR has learned, messages you schedule, and minutes played each day (for the limits you set).</li>
          <li>Which devices can open the buddy (a random token, stored as a hash).</li>
        </ul>
        <h3>What we don’t</h3>
        <p>No photos, voice recordings, location, contacts, advertising IDs or tracking pixels. Children never type anything in and never talk to anyone. Spoken words come from the device’s own speech voice.</p>
        <h3>Who processes it</h3>
        <p>Stripe (payments), Resend (email), Vercel (hosting) and Neon (database). Each only gets what it needs to do that job.</p>
        <h3>Deleting</h3>
        <p>Delete your buddy from the parent page and everything about it is removed straight away. Cancelling stops billing; the buddy sleeps until you come back or delete it.</p>
        <h3>Questions</h3>
        <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We follow the New Zealand Privacy Act 2020.</p>
      </main>
      <SiteFoot />
    </>
  );
}
