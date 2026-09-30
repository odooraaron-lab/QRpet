import { NAME_RE, PARTY_SITE, RESERVED, isClean } from './config';
import { nameTaken } from './buddies';

export const cleanName = (raw: unknown) => String(raw ?? '').trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);

/**
 * Can this name be a buddy's address (teddy.myqr.co.nz)? Checks the format, reserved words, a
 * blocked-word list, our own buddies, and the party site's parties (the two apps share *.myqr.co.nz).
 */
export async function checkName(slug: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!NAME_RE.test(slug)) return { ok: false, reason: 'Use 3 to 24 letters or numbers, starting with a letter.' };
  if (RESERVED.has(slug) || !isClean(slug)) return { ok: false, reason: 'That name isn’t available. Try another.' };
  if (await nameTaken(slug)) return { ok: false, reason: 'Another buddy already has that name. Try adding a number, like teddy2.' };
  if (PARTY_SITE) {
    try {
      const r = await fetch(`${PARTY_SITE}/api/slug-status?s=${encodeURIComponent(slug)}`, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (r.ok && (await r.json()).taken) return { ok: false, reason: 'That address is being used for a party. Try another name.' };
    } catch {
      // The party site didn't answer: allow it, and the party site checks buddies before taking a name too.
    }
  }
  return { ok: true };
}
