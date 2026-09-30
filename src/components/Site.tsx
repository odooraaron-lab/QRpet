import Link from 'next/link';
import { MyqrFamily } from './MyqrFamily';
import { BRAND, LOGIN_URL, PRODUCT, SUPPORT_EMAIL } from '@/lib/config';

/** The mark: a round QR buddy face on a plum tile. Same drawing as src/app/icon.svg. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#2E2140" />
      <path d="M32 12c13 0 19 4 19.6 19C52.3 47 47.6 54 32 54S11.7 47 12.4 31C13 16 19 12 32 12z" fill="#FFD98E" />
      <ellipse cx="25" cy="30" rx="4" ry="5" fill="#2E2140" /><ellipse cx="39" cy="30" rx="4" ry="5" fill="#2E2140" />
      <path d="M26 38q6 6 12 0" stroke="#2E2140" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="36" cy="8" r="4.5" fill="#FFC857" />
    </svg>
  );
}

export function SiteHead({ cta = true }: { cta?: boolean }) {
  return (
    <header className="wrap site-head">
      <Link href="/" className="logo" aria-label={`${PRODUCT} home`}>
        <LogoMark />
        <span className="wordmark"><span>{PRODUCT}</span><small>BY {BRAND.toUpperCase()}</small></span>
      </Link>
      <nav className="head-links" aria-label="Main">
        <Link href="/#how" className="hide-sm">How it works</Link>
        <a href={LOGIN_URL}>Log in</a>
        {cta && <Link href="/start" className="btn small">Make a buddy</Link>}
      </nav>
    </header>
  );
}

export function SiteFoot() {
  return (
    <footer className="site-foot">
      <div className="wrap foot-in">
        <nav aria-label={PRODUCT}>
          <Link href="/">Home</Link>
          <Link href="/start">Make a buddy</Link>
          <a href={LOGIN_URL}>Parent login</a>
          <Link href="/#safety">Safety</Link>
          <Link href="/#questions">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href={`mailto:${SUPPORT_EMAIL}`}>Contact us</a>
        </nav>
        <MyqrFamily current="buddy" />
        <p>{PRODUCT} is made by {BRAND} in Aotearoa New Zealand. No ads, no chat, no in-app purchases. Prices in NZD.</p>
      </div>
    </footer>
  );
}
