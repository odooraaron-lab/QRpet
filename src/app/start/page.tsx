import type { Metadata } from 'next';
import { StartForm } from '@/components/StartForm';
import { SiteFoot, SiteHead } from '@/components/Site';
import { APP_URL, BUDDY_DOMAIN, PRICES, TRIAL_DAYS } from '@/lib/config';

export const metadata: Metadata = { title: 'Make your buddy', description: 'Name your QR buddy, pick a colour and you’re away. Takes a minute.', alternates: { canonical: '/start' } };

export default async function Start({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const domain = BUDDY_DOMAIN || `${APP_URL.replace(/^https?:\/\//, '')}/b`;
  return (
    <>
      <SiteHead cta={false} />
      <main className="wrap">
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 48px)', marginTop: 16 }}>Make your buddy</h1>
        <StartForm domain={domain} prices={{ monthly: PRICES.monthly.label, yearly: PRICES.yearly.label }} trialDays={TRIAL_DAYS} initialPlan={q.plan === 'yearly' ? 'yearly' : 'monthly'} cancelled={q.cancelled === '1'} />
      </main>
      <SiteFoot />
    </>
  );
}
