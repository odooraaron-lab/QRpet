import { cookies } from 'next/headers';
import { access, parentCookie, deviceCookie } from '@/lib/session';
import {
  addMessage, deleteBuddy, deleteMessage, getBuddy, localNow, newCardKey, pairingClaim, pushCommand, removeDevice,
  settingsOf, updateBuddy, devices, type Settings,
} from '@/lib/buddies';
import { PARENT_COMMANDS } from '@/lib/commands';
import { PALETTES } from '@/components/Buddy';
import { abilities } from '@/lib/growth';
import { unlocks } from '@/lib/buddies';
import { rateLimited } from '@/lib/guard';
import { stripe } from '@/lib/stripe';
import { reportToHQ } from '@/lib/hq';
import { buddyUrl, isClean } from '@/lib/config';
import { db } from '@/lib/db';
import { GAMES, BANDS } from '@/lib/learning';
import { validPin } from '@/lib/codes';
import { setPin } from '@/lib/buddies';

export const runtime = 'nodejs';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const clamp = (n: unknown, lo: number, hi: number, d: number) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };
const text = (v: unknown, max: number) => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

/** Everything the parent page can change. Parent cookie only. */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  if (rateLimited(req, `parent:${slug}`, 120)) return Response.json({ error: 'Too many changes. Wait a minute.' }, { status: 429 });
  const { buddy, parent } = await access(slug);
  if (!buddy || !parent) return Response.json({ error: 'Please sign in again.' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const today = localNow(buddy.tz).date;

  switch (b.action) {
    case 'settings': {
      const cur = settingsOf(buddy);
      const s = b.settings || {};
      const learned = (await unlocks(slug)).map((u) => u.item_id);
      const dress = abilities(learned, buddy.visit_day).dress;
      const next: Partial<Settings> = {};
      if (s.weights) next.weights = Object.fromEntries(Object.keys(cur.weights).map((k) => [k, clamp(s.weights[k], 0.25, 3, cur.weights[k])]));
      if (s.sessionMinutes !== undefined) next.sessionMinutes = clamp(s.sessionMinutes, 0, 60, cur.sessionMinutes);
      if (s.dailyCapMinutes !== undefined) next.dailyCapMinutes = clamp(s.dailyCapMinutes, 0, 240, cur.dailyCapMinutes);
      if (HHMM.test(s.bedtime)) next.bedtime = s.bedtime;
      if (HHMM.test(s.wakeTime)) next.wakeTime = s.wakeTime;
      if (['low', 'medium', 'high'].includes(s.volume)) next.volume = s.volume;
      if (typeof s.readAloud === 'boolean') next.readAloud = s.readAloud;
      if (typeof s.paused === 'boolean') next.paused = s.paused;
      if (s.games) next.games = Object.fromEntries(Object.keys(GAMES).map((k) => [k, k in s.games ? s.games[k] !== false : cur.games[k] !== false]));
      if ('accessory' in s) next.accessory = s.accessory === null || dress.includes(s.accessory) ? s.accessory : cur.accessory;
      const patch: Parameters<typeof updateBuddy>[1] = { settings: next };
      if (b.colour && PALETTES[b.colour]) patch.colour = b.colour;
      if (typeof b.childName === 'string') patch.child_name = text(b.childName, 24);
      if (BANDS.includes(b.ageBand)) patch.age_band = b.ageBand;
      if (typeof b.tz === 'string' && Intl.supportedValuesOf('timeZone').includes(b.tz)) patch.tz = b.tz;
      await updateBuddy(slug, patch);
      await pushCommand(slug, 'refresh');
      return Response.json({ ok: true });
    }
    case 'message.add': {
      const t = text(b.text, 140);
      const date = /^\d{4}-\d{2}-\d{2}$/.test(b.date) && b.date >= today ? b.date : today;
      if (!t) return Response.json({ error: 'Type a message first.' }, { status: 400 });
      if (!isClean(t)) return Response.json({ error: 'Please keep messages kind and simple.' }, { status: 400 });
      const sql = await db();
      const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from qb_messages where slug = ${slug} and show_on >= ${today}`;
      if (n >= 20) return Response.json({ error: 'That’s plenty of messages for now. Delete one first.' }, { status: 400 });
      await addMessage(slug, t, date);
      if (date === today) await pushCommand(slug, 'refresh');
      return Response.json({ ok: true });
    }
    case 'message.delete':
      await deleteMessage(slug, Number(b.id) || 0);
      return Response.json({ ok: true });
    case 'moment':
      if (!PARENT_COMMANDS.includes(b.command)) return Response.json({ error: 'Unknown moment' }, { status: 400 });
      await pushCommand(slug, b.command);
      return Response.json({ ok: true });
    case 'pair': {
      if (rateLimited(req, `pair:${slug}`, 10)) return Response.json({ error: 'Too many tries. Wait a minute.' }, { status: 429 });
      const ok = await pairingClaim(slug, String(b.code || ''), text(b.name, 30) || 'TV');
      return ok ? Response.json({ ok: true }) : Response.json({ error: 'That code didn’t work. Check the TV and try again.' }, { status: 400 });
    }
    case 'device.remove':
      await removeDevice(slug, String(b.id || ''));
      return Response.json({ ok: true });
    case 'card.new': {
      // A lost card or a leaked code: the old code and QR stop working, and phones that used them are signed out.
      const code = await newCardKey(slug);
      for (const d of await devices(slug)) if (d.kind === 'phone') await removeDevice(slug, d.id);
      return Response.json({ ok: true, code });
    }
    case 'pin.set': {
      if (!validPin(b.pin)) return Response.json({ error: 'The PIN must be 4 numbers.' }, { status: 400 });
      await setPin(slug, b.pin);
      return Response.json({ ok: true });
    }
    case 'billing': {
      if (!process.env.STRIPE_SECRET_KEY) return Response.json({ error: 'Billing isn’t set up on this server.' }, { status: 400 });
      const sql = await db();
      const [p] = await sql<{ stripe_customer_id: string | null }[]>`select stripe_customer_id from qb_parents where id = ${buddy.parent_id}`;
      let customer = p?.stripe_customer_id;
      if (!customer && buddy.stripe_subscription_id) {
        const sub = await stripe().subscriptions.retrieve(buddy.stripe_subscription_id);
        customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      }
      if (!customer) return Response.json({ error: 'No billing record yet. Email us and we’ll sort it.' }, { status: 400 });
      const portal = await stripe().billingPortal.sessions.create({ customer, return_url: buddyUrl(slug, '/parent') });
      return Response.json({ url: portal.url });
    }
    case 'delete': {
      if (String(b.confirm || '').trim().toLowerCase() !== slug) return Response.json({ error: `Type ${slug} to confirm.` }, { status: 400 });
      const fresh = await getBuddy(slug);
      if (fresh?.stripe_subscription_id && process.env.STRIPE_SECRET_KEY) {
        try { await stripe().subscriptions.cancel(fresh.stripe_subscription_id); } catch (e) { console.error('cancel failed', slug, e); }
      }
      await deleteBuddy(slug);
      await reportToHQ({ type: 'site.upsert', slug, status: 'disabled' }, { type: 'event', name: 'buddy.deleted', slug });
      const c = await cookies();
      c.delete(parentCookie(slug));
      c.delete(deviceCookie(slug));
      return Response.json({ ok: true });
    }
    case 'logout':
      (await cookies()).delete(parentCookie(slug));
      return Response.json({ ok: true });
    default:
      return Response.json({ error: 'Unknown action' }, { status: 400 });
  }
}
