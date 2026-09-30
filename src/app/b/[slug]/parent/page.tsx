import type { Metadata } from 'next';
import { access, buddyBase } from '@/lib/session';
import { devices, localNow, playedSeconds, settingsOf, unlocks, upcomingMessages, weekSeconds } from '@/lib/buddies';
import { abilities, ITEM, STAGES } from '@/lib/growth';
import { Dashboard } from '@/components/Dashboard';
import { Notice } from '@/components/Notice';
import { APP_URL, LOGIN_URL, buddyUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Parent page', robots: { index: false, follow: false } };

export default async function ParentPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { slug } = await params;
  const q = await searchParams;
  const base = await buddyBase(slug);
  const { buddy, parent } = await access(slug);
  if (!buddy || buddy.status === 'pending') return <Notice mood="think" title="No buddy lives here yet" link={{ href: APP_URL, label: 'Make a buddy' }} />;
  if (!parent) {
    return <Notice colour={buddy.colour} mood="shy" title={q.expired ? 'That sign-in link has expired' : 'Grown-ups only'}
      text="We’ll email you a fresh sign-in link. No passwords." link={{ href: LOGIN_URL, label: 'Email me a sign-in link' }} />;
  }
  const { date } = localNow(buddy.tz);
  const [list, msgs, devs, today, week] = await Promise.all([unlocks(slug), upcomingMessages(slug, date), devices(slug), playedSeconds(slug, date), weekSeconds(slug, date)]);
  const learned = list.map((u) => u.item_id);
  const ab = abilities(learned, buddy.visit_day);
  const next = STAGES.find((s) => s.from > buddy.visit_day);
  return (
    <Dashboard
      base={base}
      data={{
        slug, name: slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '), status: buddy.status, colour: buddy.colour,
        childName: buddy.child_name, tz: buddy.tz, email: buddy.email || '', plan: buddy.plan, visitDay: buddy.visit_day, stage: ab.stage.name,
        nextStage: next ? { name: next.name, in: next.from - buddy.visit_day } : null,
        today: list.find((u) => u.unlocked_on === date) ? ITEM[list.find((u) => u.unlocked_on === date)!.item_id]?.title ?? 'A little sparkle' : null,
        timeline: [...list].reverse().map((u) => ({ day: u.visit_day, date: u.unlocked_on, title: ITEM[u.item_id]?.title ?? 'A little sparkle', track: ITEM[u.item_id]?.track ?? 'room' })),
        messages: msgs.map((m) => ({ id: Number(m.id), text: m.text, date: m.show_on })),
        devices: devs.map((d) => ({ id: d.id, kind: d.kind, name: d.name, lastSeen: d.last_seen_at ? new Date(d.last_seen_at).toISOString() : null })),
        settings: settingsOf(buddy), dress: ab.dress, playedToday: Math.round(today / 60), playedWeek: Math.round(week / 60), todayDate: date,
        urls: { buddy: buddyUrl(slug), tv: buddyUrl(slug, '/tv') },
        billing: !!buddy.stripe_subscription_id,
      }}
    />
  );
}
