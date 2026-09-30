import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { nextItem, ITEM, abilities, type Track } from './growth';
import { token, shortId } from './guard';
import { newCode, newPin, normalizeCode } from './codes';

export type Settings = {
  weights: Record<string, number>;   // learning sliders: counting, colours, shapes, songs, feelings (0.25 to 3)
  sessionMinutes: number;            // QR says bye-bye after this long
  dailyCapMinutes: number;           // 0 = no cap
  bedtime: string;                   // "19:00": bedtime mode (lullaby, then sleep) from here…
  wakeTime: string;                  // …until here
  volume: 'low' | 'medium' | 'high';
  readAloud: boolean;                // read parent messages with the device's voice
  games: Record<string, boolean>;
  accessory: string | null;          // chosen from what's unlocked; null = QR picks the newest
  paused: boolean;                   // holiday mode: no new unlocks
};

export const DEFAULT_SETTINGS: Settings = {
  weights: { counting: 1, colours: 1, shapes: 1, songs: 1, feelings: 1 },
  sessionMinutes: 10,
  dailyCapMinutes: 30,
  bedtime: '19:00',
  wakeTime: '07:00',
  volume: 'medium',
  readAloud: true,
  games: { peekaboo: true, count: true, colours: true, shapes: true },
  accessory: null,
  paused: false,
};

export type Buddy = {
  slug: string; parent_id: string; colour: string; child_name: string; age_band: string; tz: string;
  status: 'pending' | 'active' | 'lapsed' | 'disabled'; plan: string; stripe_subscription_id: string | null;
  checkout_session_id: string | null; card_key: string; settings: Settings; visit_day: number; parent_pin: string | null;
  created_at: string; activated_at: string | null; email?: string;
};

export const settingsOf = (b: Pick<Buddy, 'settings'>): Settings => ({
  ...DEFAULT_SETTINGS, ...(b.settings || {}),
  weights: { ...DEFAULT_SETTINGS.weights, ...(b.settings?.weights || {}) },
  games: { ...DEFAULT_SETTINGS.games, ...(b.settings?.games || {}) },
});

/** Today's date (YYYY-MM-DD) and minutes past midnight, in the family's time zone. */
export function localNow(tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return (h || 0) * 60 + (m || 0); };
export function isBedtime(s: Settings, minutes: number) {
  const a = toMin(s.bedtime), b = toMin(s.wakeTime);
  return a > b ? minutes >= a || minutes < b : minutes >= a && minutes < b;
}

// ── buddies ──
export async function getBuddy(slug: string): Promise<Buddy | null> {
  const sql = await db();
  const rows = await sql<Buddy[]>`select b.*, p.email from qb_buddies b join qb_parents p on p.id = b.parent_id where b.slug = ${slug}`;
  return rows[0] ?? null;
}

export async function buddiesForEmail(email: string): Promise<Buddy[]> {
  const sql = await db();
  return sql<Buddy[]>`select b.*, p.email from qb_buddies b join qb_parents p on p.id = b.parent_id
                      where lower(p.email) = lower(${email}) and b.status <> 'pending' order by b.created_at`;
}

export async function nameTaken(slug: string) {
  const sql = await db();
  // Unpaid sign-ups hold a name for 30 minutes.
  const rows = await sql`select 1 from qb_buddies where slug = ${slug} and (status <> 'pending' or created_at > now() - interval '30 minutes')`;
  return rows.length > 0;
}

export async function createPending(o: { slug: string; email: string; colour: string; childName: string; ageBand: string; plan: string }) {
  const sql = await db();
  const [parent] = await sql<{ id: string }[]>`
    insert into qb_parents (id, email) values (${shortId(12)}, ${o.email})
    on conflict (email) do update set email = excluded.email returning id`;
  await sql`delete from qb_buddies where slug = ${o.slug} and status = 'pending'`;
  await sql`insert into qb_buddies (slug, parent_id, colour, child_name, age_band, plan, card_key, parent_pin, settings)
            values (${o.slug}, ${parent.id}, ${o.colour}, ${o.childName}, ${o.ageBand}, ${o.plan}, ${newCode()}, ${newPin()}, ${sql.json(DEFAULT_SETTINGS as never)})`;
  return parent.id;
}

/** Pending → active, exactly once. Returns the buddy only to the caller that made the change. */
export async function activate(slug: string, extra: { subscriptionId?: string | null; customerId?: string | null; sessionId?: string | null } = {}) {
  const sql = await db();
  const rows = await sql<Buddy[]>`
    update qb_buddies set status = 'active', activated_at = now(),
      stripe_subscription_id = coalesce(${extra.subscriptionId ?? null}, stripe_subscription_id),
      checkout_session_id = coalesce(${extra.sessionId ?? null}, checkout_session_id)
    where slug = ${slug} and status = 'pending' returning *`;
  if (rows[0] && extra.customerId) await sql`update qb_parents set stripe_customer_id = ${extra.customerId} where id = ${rows[0].parent_id}`;
  return rows[0] ? getBuddy(slug) : null;
}

export async function setStatus(slug: string, status: Buddy['status']) {
  const sql = await db();
  await sql`update qb_buddies set status = ${status} where slug = ${slug}`;
}

export async function setSessionId(slug: string, sessionId: string) {
  const sql = await db();
  await sql`update qb_buddies set checkout_session_id = ${sessionId} where slug = ${slug}`;
}

/** The buddy a typed (or scanned) code belongs to. Pending and deleted buddies don't open. */
export async function buddyByCode(raw: unknown): Promise<Buddy | null> {
  const code = normalizeCode(raw);
  if (code.length < 8) return null;
  const sql = await db();
  const rows = await sql<Buddy[]>`select b.*, p.email from qb_buddies b join qb_parents p on p.id = b.parent_id
    where regexp_replace(upper(b.card_key), '[^A-Z0-9]', '', 'g') = ${code} and b.status <> 'pending'`;
  return rows[0] ?? null;
}

/** Checks the parent PIN. Five wrong tries lock it for 10 minutes. */
export async function checkPin(slug: string, pin: string): Promise<'ok' | 'wrong' | 'locked'> {
  const sql = await db();
  const [b] = await sql<{ parent_pin: string | null; locked: boolean }[]>`
    select parent_pin, coalesce(pin_locked_until > now(), false) as locked from qb_buddies where slug = ${slug}`;
  if (!b) return 'wrong';
  if (b.locked) return 'locked';
  if (b.parent_pin && b.parent_pin === pin) {
    await sql`update qb_buddies set pin_fails = 0, pin_locked_until = null where slug = ${slug}`;
    return 'ok';
  }
  const [r] = await sql<{ pin_fails: number }[]>`update qb_buddies set pin_fails = pin_fails + 1 where slug = ${slug} returning pin_fails`;
  if (r.pin_fails >= 5) {
    await sql`update qb_buddies set pin_fails = 0, pin_locked_until = now() + interval '10 minutes' where slug = ${slug}`;
    return 'locked';
  }
  return 'wrong';
}

export async function setPin(slug: string, pin: string) {
  const sql = await db();
  await sql`update qb_buddies set parent_pin = ${pin}, pin_fails = 0, pin_locked_until = null where slug = ${slug}`;
}

export async function updateBuddy(slug: string, patch: Partial<Pick<Buddy, 'colour' | 'child_name' | 'age_band' | 'tz'>> & { settings?: Partial<Settings> }) {
  const sql = await db();
  const b = await getBuddy(slug);
  if (!b) return;
  const settings = { ...settingsOf(b), ...(patch.settings || {}) };
  await sql`update qb_buddies set colour = ${patch.colour ?? b.colour}, child_name = ${patch.child_name ?? b.child_name},
            age_band = ${patch.age_band ?? b.age_band}, tz = ${patch.tz ?? b.tz}, settings = ${sql.json(settings as never)} where slug = ${slug}`;
}

export async function newCardKey(slug: string) {
  const sql = await db();
  const key = newCode();
  await sql`update qb_buddies set card_key = ${key} where slug = ${slug}`;
  return key;
}

export async function deleteBuddy(slug: string) {
  const sql = await db();
  await sql`delete from qb_buddies where slug = ${slug}`;
}

// ── growth ──
export type Unlock = { item_id: string; visit_day: number; unlocked_on: string };

export async function unlocks(slug: string): Promise<Unlock[]> {
  const sql = await db();
  return sql<Unlock[]>`select item_id, visit_day, to_char(unlocked_on, 'YYYY-MM-DD') as unlocked_on from qb_unlocks where slug = ${slug} order by visit_day`;
}

/**
 * The daily step. The first visit of each day (in the family's time zone) unlocks one new item and
 * adds a visit day; later visits that day see the same item. The unique key on (slug, day) means two
 * devices opening at the same moment can't unlock twice.
 */
export async function visitToday(b: Buddy) {
  const sql = await db();
  const { date } = localNow(b.tz);
  let list = await unlocks(b.slug);
  let todays = list.find((u) => u.unlocked_on === date) ?? null;
  let isNew = false;
  if (!todays && b.status === 'active' && !settingsOf(b).paused) {
    const day = b.visit_day + 1;
    const recent = list.slice(-2).reverse().map((u) => ITEM[u.item_id]?.track).filter(Boolean) as Track[];
    const item = nextItem(list.map((u) => u.item_id), day, settingsOf(b).weights, recent);
    const id = item?.id ?? `sparkle-${day}`; // past the end of the catalogue: a daily sparkle, nothing new
    const inserted = await sql`insert into qb_unlocks (slug, unlocked_on, visit_day, item_id) values (${b.slug}, ${date}, ${day}, ${id})
                               on conflict do nothing returning slug`;
    if (inserted.length) {
      await sql`update qb_buddies set visit_day = ${day} where slug = ${b.slug}`;
      b.visit_day = day;
      isNew = true;
    }
    list = await unlocks(b.slug);
    todays = list.find((u) => u.unlocked_on === date) ?? null;
  }
  const learned = list.map((u) => u.item_id);
  return { date, today: todays, isNew, learned, timeline: list, abilities: abilities(learned, b.visit_day) };
}

// ── messages ──
export async function messagesFor(slug: string, date: string) {
  const sql = await db();
  return sql<{ id: number; text: string; show_on: string }[]>`
    select id, text, to_char(show_on, 'YYYY-MM-DD') as show_on from qb_messages where slug = ${slug} and show_on = ${date} order by id`;
}
export async function upcomingMessages(slug: string, from: string) {
  const sql = await db();
  return sql<{ id: number; text: string; show_on: string }[]>`
    select id, text, to_char(show_on, 'YYYY-MM-DD') as show_on from qb_messages where slug = ${slug} and show_on >= ${from} order by show_on, id limit 20`;
}
export async function addMessage(slug: string, text: string, showOn: string) {
  const sql = await db();
  await sql`insert into qb_messages (slug, text, show_on) values (${slug}, ${text}, ${showOn})`;
}
export async function deleteMessage(slug: string, id: number) {
  const sql = await db();
  await sql`delete from qb_messages where slug = ${slug} and id = ${id}`;
}

// ── commands: the parent's "special moment" buttons and the TV remote ──
export async function pushCommand(slug: string, command: string) {
  const sql = await db();
  await sql`insert into qb_commands (slug, command) values (${slug}, ${command})`;
  await sql`delete from qb_commands where created_at < now() - interval '1 hour'`;
}
export async function commandsSince(slug: string, since: number) {
  const sql = await db();
  return sql<{ id: number; command: string }[]>`
    select id::int, command from qb_commands where slug = ${slug} and id > ${since} and created_at > now() - interval '2 minutes' order by id limit 20`;
}
export async function lastCommandId(slug: string) {
  const sql = await db();
  const [r] = await sql<{ id: number }[]>`select coalesce(max(id), 0)::int as id from qb_commands where slug = ${slug}`;
  return r.id;
}

// ── devices (phones that scanned the card, paired TVs) ──
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

export async function createDevice(slug: string, kind: 'tv' | 'phone', name: string) {
  const sql = await db();
  const t = token(24);
  await sql`insert into qb_devices (id, slug, kind, token_hash, name, last_seen_at) values (${shortId(10)}, ${slug}, ${kind}, ${hash(t)}, ${name}, now())`;
  return t;
}
export async function deviceFor(slug: string, t: string | undefined | null) {
  if (!t) return null;
  const sql = await db();
  const rows = await sql<{ id: string; kind: string; name: string; last_hq_at: string | null }[]>`
    update qb_devices set last_seen_at = now() where slug = ${slug} and token_hash = ${hash(t)} returning id, kind, name, last_hq_at`;
  return rows[0] ?? null;
}
export async function markHq(id: string) {
  const sql = await db();
  await sql`update qb_devices set last_hq_at = now() where id = ${id}`;
}
export async function devices(slug: string) {
  const sql = await db();
  return sql<{ id: string; kind: string; name: string; last_seen_at: string | null }[]>`
    select id, kind, name, last_seen_at from qb_devices where slug = ${slug} order by created_at`;
}
export async function removeDevice(slug: string, id: string) {
  const sql = await db();
  await sql`delete from qb_devices where slug = ${slug} and id = ${id}`;
}

// ── TV pairing: the TV shows a code, the parent types it on their dashboard ──
export async function pairingStart(device: string) {
  const sql = await db();
  await sql`delete from qb_pairings where created_at < now() - interval '1 hour'`;
  const existing = await sql<{ code: string; slug: string | null; token: string | null }[]>`select code, slug, token from qb_pairings where device = ${device}`;
  if (existing[0]) {
    if (existing[0].slug && existing[0].token) {
      await sql`delete from qb_pairings where device = ${device}`;
      return { slug: existing[0].slug, token: existing[0].token };
    }
    return { code: existing[0].code };
  }
  for (let i = 0; i < 5; i++) {
    const code = String(100000 + (randomBytes(4).readUInt32BE() % 900000));
    const ok = await sql`insert into qb_pairings (code, device) values (${code}, ${device}) on conflict do nothing returning code`;
    if (ok.length) return { code };
  }
  throw new Error('Could not make a pairing code');
}
export async function pairingClaim(slug: string, code: string, name: string) {
  const sql = await db();
  const clean = code.replace(/\D/g, '');
  const rows = await sql`select device from qb_pairings where code = ${clean} and slug is null and created_at > now() - interval '1 hour'`;
  if (!rows.length) return false;
  const t = await createDevice(slug, 'tv', name || 'TV');
  await sql`update qb_pairings set slug = ${slug}, token = ${t} where code = ${clean}`;
  return true;
}

// ── play time ──
export async function addSeconds(slug: string, date: string, seconds: number) {
  const sql = await db();
  await sql`insert into qb_visits (slug, day, seconds) values (${slug}, ${date}, ${seconds})
            on conflict (slug, day) do update set seconds = qb_visits.seconds + excluded.seconds`;
}
export async function playedSeconds(slug: string, date: string) {
  const sql = await db();
  const [r] = await sql<{ s: number }[]>`select coalesce(sum(seconds), 0)::int as s from qb_visits where slug = ${slug} and day = ${date}`;
  return r.s;
}
export async function weekSeconds(slug: string, date: string) {
  const sql = await db();
  const [r] = await sql<{ s: number }[]>`select coalesce(sum(seconds), 0)::int as s from qb_visits where slug = ${slug} and day > (${date}::date - 7)`;
  return r.s;
}

// ── signed tokens: parent sessions and login links ──
const secret = () => process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-dev-secret');
export function sign(payload: Record<string, unknown>, minutes: number) {
  if (!secret()) throw new Error('SESSION_SECRET is not set');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + minutes * 60000 })).toString('base64url');
  return `${body}.${createHmac('sha256', secret()).update(body).digest('base64url')}`;
}
export function verify<T = Record<string, unknown>>(t: string | undefined | null): (T & { exp: number }) | null {
  if (!t || !secret()) return null;
  const [body, mac] = t.split('.');
  if (!body || !mac) return null;
  const want = Buffer.from(createHmac('sha256', secret()).update(body).digest('base64url'));
  const got = Buffer.from(mac);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}
