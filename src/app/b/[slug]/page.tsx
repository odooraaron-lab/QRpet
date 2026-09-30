import type { Metadata } from 'next';
import { access, buddyBase } from '@/lib/session';
import { buildState } from '@/lib/state';
import { Player } from '@/components/Player';
import { Notice } from '@/components/Notice';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your QR buddy', robots: { index: false, follow: false } };

export default async function BuddyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await buddyBase(slug);
  const { buddy, device, parent } = await access(slug);
  if (!buddy) return <Notice mood="think" title="No buddy lives here yet" text="Check the address on your card, or make your own buddy." link={{ href: process.env.APP_URL || '/', label: 'Make a buddy' }} />;
  if (buddy.status === 'pending') return <Notice mood="sleepy" title="Almost ready" text="This buddy is still being set up. Finish sign-up, then scan the card again." />;
  if (buddy.status === 'disabled' || buddy.status === 'lapsed') return <Notice colour={buddy.colour} mood="asleep" title="Shh… sleeping" text="Ask a grown-up to check the buddy’s plan on the parent page." link={{ href: `${base}/parent`, label: 'Parent page' }} />;
  if (!device && !parent) return <Notice colour={buddy.colour} mood="shy" title="Ask a grown-up to scan your card" text="Point a phone camera at your buddy’s QR card to open it here." link={{ href: `${base}/parent`, label: 'I’m the parent' }} />;
  return <Player initial={await buildState(buddy)} base={base} />;
}
