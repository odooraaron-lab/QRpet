// Addresses, prices and switches. Everything here can be changed with env vars.

export const BRAND = 'myQR';
export const PRODUCT = process.env.PRODUCT_NAME || 'QR Buddy';
const prod = process.env.NODE_ENV === 'production';

/** The sales site, sign-up and API: https://create.myqr.co.nz */
export const APP_URL = (process.env.APP_URL || (prod ? 'https://create.myqr.co.nz' : 'http://localhost:3000')).replace(/\/+$/, '');

/**
 * Buddies live at <name>.<BUDDY_DOMAIN> (teddy.myqr.co.nz). The party site owns *.myqr.co.nz on Vercel and
 * forwards buddy names here (see README). Without BUDDY_DOMAIN every buddy works at APP_URL/b/<name>.
 */
export const BUDDY_DOMAIN = (process.env.BUDDY_DOMAIN || '').toLowerCase();

/** Where parents sign in (the app opens this too). */
export const LOGIN_URL = (process.env.LOGIN_URL || (prod ? 'https://login.myqr.co.nz' : `${APP_URL}/login`)).replace(/\/+$/, '');

export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'adminmyqr@gmail.com';
export const HQ_PRODUCT = process.env.HQ_PRODUCT || 'buddy';

export const PRICES = {
  monthly: { id: process.env.STRIPE_PRICE_MONTHLY || '', label: process.env.PRICE_MONTHLY_LABEL || '$4.99 a month' },
  yearly: { id: process.env.STRIPE_PRICE_YEARLY || '', label: process.env.PRICE_YEARLY_LABEL || '$39 a year' },
};
export const TRIAL_DAYS = Math.max(0, Number(process.env.TRIAL_DAYS ?? 7));

/** On a developer's machine without Stripe keys, sign-up skips payment. */
export const DEV_CHECKOUT = !process.env.STRIPE_SECRET_KEY && !prod;

/** The party site, for the shared name check (so a buddy and a party never get the same address). */
export const PARTY_SITE = (process.env.PARTY_SITE_URL || (prod ? 'https://myqr.co.nz' : '')).replace(/\/+$/, '');

/** Full address of one of a buddy's pages. */
export function buddyUrl(slug: string, path = '') {
  if (BUDDY_DOMAIN) return `https://${slug}.${BUDDY_DOMAIN}${path}`;
  return `${APP_URL}/b/${slug}${path}`;
}

/** Names nobody can take (also reserved on the party site). */
export const RESERVED = new Set([
  'www', 'admin', 'api', 'app', 'mail', 'email', 'hq', 'help', 'support', 'create', 'login', 'buddy', 'buddies', 'blog',
  'tv', 'shop', 'static', 'assets', 'cdn', 'test', 'dev', 'demo', 'p', 'b', 'party', 'resthome', 'care', 'digitalsignage',
  'signage', 'reviews', 'review', 'reviewqr', 'status', 'privacy', 'terms',
]);

export const NAME_RE = /^[a-z][a-z0-9-]{1,22}[a-z0-9]$/;

/** Words kept out of buddy names and parent messages. Kept short on purpose; extend as needed. */
export const BLOCKED = ['sex', 'porn', 'fuck', 'shit', 'cunt', 'dick', 'kill', 'nazi', 'drug', 'bitch', 'slut', 'rape'];
export const isClean = (s: string) => !BLOCKED.some((w) => s.toLowerCase().replace(/[^a-z]/g, '').includes(w));
