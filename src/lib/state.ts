import { commandsSince, devices, isBedtime, lastCommandId, localNow, messagesFor, playedSeconds, settingsOf, visitToday, type Buddy } from './buddies';
import { ITEM } from './growth';
import type { BuddyState } from '@/components/Player';

/** Everything the player needs, and the daily step if this is the first visit today. */
export async function buildState(b: Buddy): Promise<BuddyState> {
  const growth = await visitToday(b);
  const s = settingsOf(b);
  const { minutes } = localNow(b.tz);
  const [messages, played, devs, since] = await Promise.all([
    messagesFor(b.slug, growth.date), playedSeconds(b.slug, growth.date), devices(b.slug), lastCommandId(b.slug),
  ]);
  return {
    slug: b.slug,
    name: b.slug.charAt(0).toUpperCase() + b.slug.slice(1).replace(/-/g, ' '),
    colour: b.colour,
    childName: b.child_name,
    status: b.status,
    visitDay: b.visit_day,
    today: growth.today ? { id: growth.today.item_id, title: ITEM[growth.today.item_id]?.title ?? 'A little sparkle', isNew: growth.isNew } : null,
    learned: growth.learned,
    abilities: growth.abilities,
    messages: messages.map((m) => m.text),
    settings: { sessionMinutes: s.sessionMinutes, volume: s.volume, readAloud: s.readAloud, games: s.games, accessory: s.accessory },
    bedtimeNow: isBedtime(s, minutes),
    capReached: s.dailyCapMinutes > 0 && played >= s.dailyCapMinutes * 60,
    commandSince: since,
    tvPaired: devs.some((d) => d.kind === 'tv'),
  };
}

export { commandsSince };
