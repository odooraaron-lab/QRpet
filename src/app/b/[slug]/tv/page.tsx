import type { Metadata } from 'next';
import { access, buddyBase } from '@/lib/session';
import { buildState } from '@/lib/state';
import { Player } from '@/components/Player';
import { Notice } from '@/components/Notice';
import { TvPair } from '@/components/TvPair';
import { BUDDY_DOMAIN } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'QR buddy on TV', robots: { index: false, follow: false } };

/** teddy.myqr.co.nz/tv: shows a pairing code until a parent connects it, then QR full screen. */
export default async function TvPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await buddyBase(slug);
  const { buddy, device } = await access(slug);
  if (!buddy) return <Notice mood="think" title="No buddy lives here yet" text="Check the address and try again." />;
  if (buddy.status !== 'active') return <Notice colour={buddy.colour} mood="asleep" title="Shh… sleeping" text="Ask a grown-up to check the buddy’s plan." />;
  if (device?.kind === 'tv') return <Player initial={await buildState(buddy)} base={base} tv />;
  const address = BUDDY_DOMAIN ? `${slug}.${BUDDY_DOMAIN}` : `${(process.env.APP_URL || '').replace(/^https?:\/\//, '')}/b/${slug}`;
  return <TvPair base={base} colour={buddy.colour} name={slug} address={address} />;
}
