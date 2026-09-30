import { buddiesForEmail } from '@/lib/buddies';
import { loginEmail } from '@/lib/email';
import { rateLimited, validEmail } from '@/lib/guard';

export const runtime = 'nodejs';

/** Emails a sign-in link for each of this parent's buddies. Always says "sent", so it can't be used to find out who has an account. */
export async function POST(req: Request) {
  if (rateLimited(req, 'login', 10)) return Response.json({ error: 'Too many tries. Please wait a few minutes.' }, { status: 429 });
  const b = await req.json().catch(() => ({}));
  const email = String(b.email || '').trim().toLowerCase();
  if (!validEmail(email)) return Response.json({ error: 'Please check your email address.' }, { status: 400 });
  const buddies = await buddiesForEmail(email);
  if (buddies.length) await loginEmail(email, buddies);
  return Response.json({ ok: true });
}
