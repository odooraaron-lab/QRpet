import { activate, getBuddy } from './buddies';
import { welcomeEmail } from './email';
import { reportToHQ } from './hq';
import { buddyUrl } from './config';

/** After payment (or the trial starts): switch the buddy on, email the parent, tell the admin. Safe to call twice. */
export async function activateBuddy(slug: string, extra: { subscriptionId?: string | null; customerId?: string | null; sessionId?: string | null } = {}) {
  const b = await activate(slug, extra);
  if (!b) return getBuddy(slug);
  await welcomeEmail(b).catch((e) => console.error('welcome email failed', slug, e));
  await reportToHQ({ type: 'site.upsert', slug, url: buddyUrl(slug), owner_email: b.email, owner_name: slug, theme: b.colour, status: 'live', order_id: extra.sessionId ?? undefined });
  return b;
}
