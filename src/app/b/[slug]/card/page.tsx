import type { Metadata } from 'next';
import QRCode from 'qrcode';
import { access } from '@/lib/session';
import { Buddy, PALETTES } from '@/components/Buddy';
import { Notice } from '@/components/Notice';
import { PrintButton } from '@/components/PrintButton';
import { LOGIN_URL, buddyUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'QR card', robots: { index: false, follow: false } };

/** The printable card: one big fridge card and two wallet cards. The QR holds the secret card key. */
export default async function CardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { buddy, parent } = await access(slug);
  if (!buddy || !parent) return <Notice mood="shy" title="Grown-ups only" text="Sign in to print the card." link={{ href: LOGIN_URL, label: 'Email me a sign-in link' }} />;
  const url = buddyUrl(slug, `/go?c=${encodeURIComponent(buddy.card_key)}`);
  const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#2E2140', light: '#0000' } });
  const p = PALETTES[buddy.colour] ?? PALETTES.honey;
  const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  const card = (big: boolean) => (
    <div className={`qcard ${big ? 'big' : ''}`} style={{ ['--c1' as string]: p.patch, ['--c2' as string]: p.body, ['--edge' as string]: p.edge }}>
      <div className="qcard-top">
        <span className="qcard-buddy"><Buddy colour={buddy.colour} mood="grin" /></span>
        <div><b>{name}</b><small>{buddy.child_name ? `${buddy.child_name}’s buddy` : 'My QR buddy'}</small></div>
      </div>
      <div className="qcard-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <p>Scan me to play!</p>
      <small className="qcard-code">{buddy.card_key}</small>
    </div>
  );
  return (
    <main className="print-sheet">
      <div className="no-print print-bar">
        <p><b>Print this page</b> (A4 or Letter). Cut out the cards. The code under the QR opens {name} too: type it at {LOGIN_URL.replace(/^https?:\/\//, '')}. Anyone with the card can open {name}, so keep it at home. Lost it? Make a new one on the parent page.</p>
        <PrintButton />
      </div>
      {card(true)}
      <div className="qcard-row">{card(false)}{card(false)}</div>
      <p className="print-foot">On a TV: open <b>{buddyUrl(slug, '/tv').replace(/^https?:\/\//, '')}</b> and type the buddy code.</p>
    </main>
  );
}
