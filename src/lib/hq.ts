// Connection to the myQR admin (HQ). Env: HQ_URL, HQ_PRODUCT, HQ_SECRET. Without HQ_URL it does nothing.
import { createHmac, timingSafeEqual } from 'crypto';
import { HQ_PRODUCT } from './config';

const sign = (body: string) => createHmac('sha256', process.env.HQ_SECRET!).update(body).digest('hex');

type HQEvent =
  | { type: 'site.upsert'; slug: string; url?: string; owner_email?: string; owner_name?: string; theme?: string;
      status?: 'live' | 'disabled' | 'expired'; expires_at?: string; storage_bytes?: number; order_id?: string }
  | { type: 'heartbeat'; slug: string }
  | { type: 'event'; name: string; slug?: string; data?: Record<string, unknown> };

/** Report one or more things to the admin. Never throws, so it can't break a family's buddy. */
export async function reportToHQ(...events: HQEvent[]) {
  if (!process.env.HQ_URL || !process.env.HQ_SECRET) return;
  const body = JSON.stringify({ ts: Date.now(), events });
  try {
    await fetch(`${process.env.HQ_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-hq-product': HQ_PRODUCT, 'x-hq-signature': sign(body) },
      body,
      cache: 'no-store',
    });
  } catch (e) {
    console.error('reportToHQ failed', e);
  }
}

/** Checks that a request really came from the admin. Returns the parsed body, or null. */
export async function verifyHQRequest(req: Request): Promise<null | {
  action: 'disable' | 'enable' | 'extend' | 'resend_email'; slug: string; expires_at?: string;
}> {
  if (!process.env.HQ_SECRET) return null;
  const raw = await req.text();
  const given = Buffer.from(req.headers.get('x-hq-signature') || '', 'hex');
  const expected = Buffer.from(sign(raw), 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const body = JSON.parse(raw);
    if (typeof body.ts !== 'number' || Math.abs(Date.now() - body.ts) > 5 * 60 * 1000) return null;
    return body;
  } catch {
    return null;
  }
}
