import type { Metadata } from 'next';
import { access, buddyBase } from '@/lib/session';
import { Notice } from '@/components/Notice';
import { Remote } from '@/components/Remote';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'QR buddy remote', robots: { index: false, follow: false } };

export default async function RemotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const base = await buddyBase(slug);
  const { buddy, device, parent } = await access(slug);
  if (!buddy || (!device && !parent)) return <Notice mood="shy" title="Ask a grown-up to scan your card" />;
  return <Remote base={base} colour={buddy.colour} name={slug} />;
}
