import { randomBytes } from 'node:crypto';

// Small shared protections for public endpoints.

const hits = new Map<string, number[]>();

/** N requests per IP per window (per server instance: enough to stop floods). */
export function rateLimited(req: Request, bucket: string, max: number, windowMs = 60 * 60 * 1000) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  const limited = list.length >= max;
  if (!limited) list.push(now);
  hits.set(key, list);
  if (hits.size > 10000) hits.clear();
  return limited;
}

export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 200;

export const token = (bytes = 24) => randomBytes(bytes).toString('base64url');

/** A short, readable reference with no look-alike characters (no 0/o, 1/l/i). */
export function shortId(len = 8) {
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(len);
  let s = '';
  for (let i = 0; i < len; i++) s += abc[bytes[i] % abc.length];
  return s;
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
