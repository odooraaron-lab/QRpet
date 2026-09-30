import type { Metadata } from 'next';
import { access, buddyBase } from '@/lib/session';
import { buildState } from '@/lib/state';
import { Player } from '@/components/Player';
import { Notice } from '@/components/Notice';
import { CodeEntry } from '@/components/CodeEntry';
import { APP_URL } from '@/lib/config';

export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const base = await buddyBase(slug);
  const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return { title: name, robots: { index: false, follow: false }, manifest: `${base}/manifest.webmanifest`, appleWebApp: { capable: true, title: name, statusBarStyle: 'black-translucent' } };
}

export default async function BuddyPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  const base = await buddyBase(slug);
  const { buddy, device, parent } = await access(slug);
  if (!buddy) return <Notice mood="think" title="No buddy lives here yet" text="Check the address on your card, or make your own buddy." link={{ href: APP_URL, label: 'Make a buddy' }} />;
  if (buddy.status === 'pending') return <Notice mood="sleepy" title="Almost ready" text="This buddy is still being set up. Finish sign-up, then scan the card again." />;
  if (buddy.status === 'disabled' || buddy.status === 'lapsed') return <Notice colour={buddy.colour} mood="asleep" title="Shh… sleeping" text="Ask a grown-up to check the buddy’s plan on the parent page." link={{ href: `${base}/parent`, label: 'Parent page' }} />;
  if (!device && !parent) {
    return (
      <Notice colour={buddy.colour} mood="shy" title="Open your buddy" text="Scan the QR card, or type the buddy code from the card or your welcome email. This device remembers it after that." link={{ href: `${base}/parent`, label: 'I’m the parent' }}>
        <CodeEntry base={base} wrong={q.code === 'wrong'} />
      </Notice>
    );
  }
  return <Player initial={await buildState(buddy)} base={base} />;
}
