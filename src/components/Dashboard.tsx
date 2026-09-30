'use client';
import { useState } from 'react';
import { Buddy, PALETTES } from './Buddy';
import type { Settings } from '@/lib/buddies';

type Data = {
  slug: string; name: string; status: string; colour: string; childName: string; tz: string; email: string; plan: string;
  visitDay: number; stage: string; nextStage: { name: string; in: number } | null; today: string | null;
  timeline: { day: number; date: string; title: string; track: string }[];
  messages: { id: number; text: string; date: string }[];
  devices: { id: string; kind: string; name: string; lastSeen: string | null }[];
  settings: Settings; dress: string[]; playedToday: number; playedWeek: number; todayDate: string;
  urls: { buddy: string; tv: string }; billing: boolean;
};

const TRACK_EMOJI: Record<string, string> = { sounds: '🔊', moves: '🕺', counting: '🔢', colours: '🎨', shapes: '🔺', feelings: '💛', songs: '🎵', dress: '🎩', room: '🏠', games: '🎲' };
const MOMENTS: [string, string, string][] = [
  ['well-done', '⭐ Well done!', '#FFF4D6'], ['birthday', '🎂 Birthday', '#FCE8EE'], ['sing', '🎵 Sing a song', '#E3F4F1'],
  ['dance', '🕺 Dance', '#F1EAFF'], ['hello', '👋 Say hello', '#E1F0FF'], ['bedtime', '🌙 Bedtime now', '#E6E1F5'],
];
const WEIGHTS: [string, string][] = [['counting', 'Counting'], ['colours', 'Colours'], ['shapes', 'Shapes'], ['songs', 'Songs'], ['feelings', 'Feelings']];
const DRESS_NAMES: Record<string, string> = { bow: 'Bow', beanie: 'Beanie', headphones: 'Headphones', party: 'Party hat', glasses: 'Glasses', flower: 'Flower', scarf: 'Scarf', crown: 'Crown' };
const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const niceDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });

export function Dashboard({ base, data }: { base: string; data: Data }) {
  const [d, setD] = useState(data);
  const [s, setS] = useState<Settings>(data.settings);
  const [colour, setColour] = useState(data.colour);
  const [childName, setChildName] = useState(data.childName);
  const [flash, setFlash] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ text: '', date: data.todayDate });
  const [pair, setPair] = useState({ code: '', name: 'Lounge TV' });
  const [confirm, setConfirm] = useState('');

  const say = (text: string, bad = false) => { setFlash({ text, bad }); setTimeout(() => setFlash(null), 3500); };
  async function call(action: string, body: Record<string, unknown> = {}, ok?: string) {
    setBusy(action);
    try {
      const r = await fetch(`${base}/api/parent`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) { window.location.reload(); return null; }
      if (!r.ok) { say(j.error || 'That didn’t work. Please try again.', true); return null; }
      if (ok) say(ok);
      return j;
    } catch { say('Couldn’t reach us. Check your connection.', true); return null; } finally { setBusy(''); }
  }
  const reload = () => window.location.reload();
  const saveSettings = (patch: Partial<Settings>, extra: Record<string, unknown> = {}, ok = 'Saved. QR will catch up in a few seconds.') =>
    call('settings', { settings: patch, ...extra }, ok);
  const accessory = s.accessory && d.dress.includes(s.accessory) ? s.accessory : d.dress.at(-1) ?? null;

  return (
    <div style={{ background: 'var(--wash)', minHeight: '100vh' }}>
      <header className="wrap site-head">
        <a href={base || '/'} className="logo" aria-label={`Back to ${d.name}`}>
          <span style={{ width: 44 }}><Buddy colour={colour} mood="happy" accessory={accessory} /></span>
          <span className="wordmark"><span>{d.name}</span><small>PARENT PAGE</small></span>
        </a>
        <nav className="head-links">
          <a href={base || '/'} className="btn small ghost">Open {d.name}</a>
          <button className="linkbtn" onClick={async () => { if (await call('logout')) window.location.href = base || '/'; }}>Sign out</button>
        </nav>
      </header>
      {flash && <div role="status" className={flash.bad ? 'error' : 'notice'} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 16, zIndex: 50, width: 'min(520px, calc(100% - 32px))', boxShadow: 'var(--shadow)' }}>{flash.text}</div>}
      <main className="wrap dash">
        {d.status !== 'active' && <div className="error wide">{d.name} is {d.status === 'lapsed' ? 'asleep because the plan has ended' : 'switched off'}. {d.billing && 'Restart the plan under “Plan and account”.'}</div>}

        <section className="panel wide">
          <div className="today">
            <Buddy colour={colour} mood="grin" action="bounce" accessory={accessory} />
            <div>
              <p className="eyebrow" style={{ marginBottom: 8 }}>Day {d.visitDay} · {d.stage}{d.nextStage ? ` · ${d.nextStage.name} in ${d.nextStage.in} visits` : ''}</p>
              <h2 style={{ marginBottom: 6 }}>{d.today ? `Today ${d.name} learned: ${d.today.charAt(0).toLowerCase()}${d.today.slice(1)}` : `${d.name} has something new to show today`}</h2>
              <p className="muted" style={{ margin: 0 }}>{d.today ? '' : 'It appears the first time your child visits. '}Played {d.playedToday} min today, {d.playedWeek} min this week.</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <h2>Special moments</h2>
          <p className="help">Plays straight away on any screen where {d.name} is open.</p>
          <div className="moments">
            {MOMENTS.map(([id, label, bg]) => <button key={id} className="moment" style={{ background: bg }} disabled={busy === 'moment'} onClick={() => call('moment', { command: id }, 'Sent!')}>{label}</button>)}
          </div>
        </section>

        <section className="panel">
          <h2>A message from you</h2>
          <p className="help">{d.name} says it out loud on that day’s visit. Short and kind works best.</p>
          <form onSubmit={async (e) => { e.preventDefault(); if (await call('message.add', msg, 'Message saved.')) reload(); }}>
            <div className="field"><input type="text" maxLength={140} value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} placeholder="Well done at swimming today!" aria-label="Message" /></div>
            <div className="row" style={{ marginBottom: 12 }}>
              <input type="date" value={msg.date} min={d.todayDate} onChange={(e) => setMsg({ ...msg, date: e.target.value })} aria-label="Day to say it" style={{ flex: '1 1 160px' }} />
              <button className="btn small" disabled={!msg.text.trim() || busy === 'message.add'}>Save message</button>
            </div>
          </form>
          {d.messages.length > 0 && (
            <ul className="list">
              {d.messages.map((m) => <li key={m.id}><span><b>{niceDate(m.date)}</b> · {m.text}</span><button className="linkbtn" onClick={async () => { if (await call('message.delete', { id: m.id })) setD({ ...d, messages: d.messages.filter((x) => x.id !== m.id) }); }}>Delete</button></li>)}
            </ul>
          )}
        </section>

        <section className="panel">
          <h2>Learning mix</h2>
          <p className="help">Slide up to see more of that sooner. One new thing a visit either way.</p>
          {WEIGHTS.map(([k, label]) => (
            <label className="slider" key={k}>
              <span>{label}</span>
              <input type="range" min={0.25} max={3} step={0.25} value={s.weights[k] ?? 1} onChange={(e) => setS({ ...s, weights: { ...s.weights, [k]: Number(e.target.value) } })} />
              <span>{(s.weights[k] ?? 1) >= 2 ? '▲▲' : (s.weights[k] ?? 1) > 1 ? '▲' : (s.weights[k] ?? 1) < 1 ? '▼' : '·'}</span>
            </label>
          ))}
          <label className="toggle"><input type="checkbox" checked={s.paused} onChange={(e) => setS({ ...s, paused: e.target.checked })} /> Holiday mode (no new things until you switch it off)</label>
          <button className="btn small" disabled={busy === 'settings'} onClick={() => saveSettings({ weights: s.weights, paused: s.paused })}>Save learning mix</button>
        </section>

        <section className="panel">
          <h2>Play time and bedtime</h2>
          <div className="two">
            <div className="field"><label htmlFor="sess">One play (minutes)</label><input id="sess" type="number" min={0} max={60} value={s.sessionMinutes} onChange={(e) => setS({ ...s, sessionMinutes: Number(e.target.value) })} /><span className="help">0 = no limit</span></div>
            <div className="field"><label htmlFor="cap">Per day (minutes)</label><input id="cap" type="number" min={0} max={240} value={s.dailyCapMinutes} onChange={(e) => setS({ ...s, dailyCapMinutes: Number(e.target.value) })} /><span className="help">0 = no limit</span></div>
            <div className="field"><label htmlFor="bed">Bedtime</label><input id="bed" type="time" value={s.bedtime} onChange={(e) => setS({ ...s, bedtime: e.target.value })} /></div>
            <div className="field"><label htmlFor="wake">Wakes up</label><input id="wake" type="time" value={s.wakeTime} onChange={(e) => setS({ ...s, wakeTime: e.target.value })} /></div>
          </div>
          <div className="field">
            <span className="label">Volume</span>
            <div className="chips">{(['low', 'medium', 'high'] as const).map((v) => <button key={v} type="button" className="chip" aria-pressed={s.volume === v} onClick={() => setS({ ...s, volume: v })}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
          </div>
          <label className="toggle"><input type="checkbox" checked={s.readAloud} onChange={(e) => setS({ ...s, readAloud: e.target.checked })} /> Read my messages out loud</label>
          <div className="field">
            <span className="label">Games</span>
            <div className="chips">{Object.keys(s.games).map((g) => <button key={g} type="button" className="chip" aria-pressed={s.games[g]} onClick={() => setS({ ...s, games: { ...s.games, [g]: !s.games[g] } })}>{g[0].toUpperCase() + g.slice(1)}</button>)}</div>
          </div>
          <button className="btn small" disabled={busy === 'settings'} onClick={() => saveSettings({ sessionMinutes: s.sessionMinutes, dailyCapMinutes: s.dailyCapMinutes, bedtime: s.bedtime, wakeTime: s.wakeTime, volume: s.volume, readAloud: s.readAloud, games: s.games })}>Save play time</button>
        </section>

        <section className="panel">
          <h2>Look and name</h2>
          <div className="field">
            <span className="label">Colour</span>
            <div className="swatches">{Object.entries(PALETTES).map(([id, p]) => <button key={id} type="button" className="swatch" aria-pressed={colour === id} aria-label={p.name} title={p.name} onClick={() => setColour(id)} style={{ background: `linear-gradient(145deg, ${p.body}, ${p.shade})` }} />)}</div>
          </div>
          <div className="field">
            <span className="label">Wearing</span>
            {d.dress.length ? (
              <div className="chips">
                <button type="button" className="chip" aria-pressed={s.accessory === null} onClick={() => setS({ ...s, accessory: null })}>Newest</button>
                {d.dress.map((x) => <button key={x} type="button" className="chip" aria-pressed={s.accessory === x} onClick={() => setS({ ...s, accessory: x })}>{DRESS_NAMES[x] ?? x}</button>)}
              </div>
            ) : <span className="help">{d.name} earns its first outfit in a few days.</span>}
          </div>
          <div className="field"><label htmlFor="cn">Child’s first name</label><input id="cn" type="text" maxLength={24} value={childName} onChange={(e) => setChildName(e.target.value)} /></div>
          <button className="btn small" disabled={busy === 'settings'} onClick={() => saveSettings({ accessory: s.accessory }, { colour, childName })}>Save look</button>
        </section>

        <section className="panel">
          <h2>Screens and QR card</h2>
          <ul className="list">
            {d.devices.length === 0 && <li className="help">No screens yet. Print the card and scan it, or connect a TV below.</li>}
            {d.devices.map((x) => <li key={x.id}><span>{x.kind === 'tv' ? '📺' : '📱'} <b>{x.name}</b> <small className="muted">· {ago(x.lastSeen)}</small></span><button className="linkbtn" onClick={async () => { if (await call('device.remove', { id: x.id }, 'Removed.')) setD({ ...d, devices: d.devices.filter((y) => y.id !== x.id) }); }}>Remove</button></li>)}
          </ul>
          <form onSubmit={async (e) => { e.preventDefault(); if (await call('pair', pair, 'TV connected! It will show QR in a few seconds.')) setTimeout(reload, 1500); }}>
            <p className="help" style={{ margin: '0 0 8px' }}>Connect a TV: open <b>{d.urls.tv.replace(/^https?:\/\//, '')}</b> in the TV’s web browser and type the code it shows.</p>
            <div className="row" style={{ marginBottom: 14 }}>
              <input type="text" inputMode="numeric" maxLength={7} placeholder="6-digit code" value={pair.code} onChange={(e) => setPair({ ...pair, code: e.target.value })} aria-label="TV code" style={{ flex: '1 1 120px' }} />
              <input type="text" maxLength={30} value={pair.name} onChange={(e) => setPair({ ...pair, name: e.target.value })} aria-label="TV name" style={{ flex: '1 1 140px' }} />
              <button className="btn small" disabled={pair.code.replace(/\D/g, '').length !== 6 || busy === 'pair'}>Connect</button>
            </div>
          </form>
          <div className="row">
            <a className="btn small" href={`${base}/card`} target="_blank" rel="noopener">🖨️ Print the QR card</a>
            <button className="btn small ghost" onClick={async () => { if (!window.confirm('Make a new card? The old card stops working and phones need to scan the new one.')) return; if (await call('card.new', {}, 'New card ready. Print it now.')) setTimeout(reload, 1200); }}>Lost the card?</button>
          </div>
        </section>

        <section className="panel wide">
          <h2>{d.name}’s timeline</h2>
          {d.timeline.length ? (
            <ul className="tl">
              {d.timeline.map((t) => <li key={t.date}><b>Day {t.day}</b><span>{TRACK_EMOJI[t.track] ?? '✨'} {t.title}<small>{niceDate(t.date)}</small></span></li>)}
            </ul>
          ) : <p className="muted">Nothing yet. {d.name} hatches on the first visit!</p>}
        </section>

        <section className="panel wide">
          <h2>Plan and account</h2>
          <p className="muted">{d.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan · signed up with {d.email}</p>
          <div className="row" style={{ marginBottom: 18 }}>
            {d.billing && <button className="btn small ghost" disabled={busy === 'billing'} onClick={async () => { const j = await call('billing'); if (j?.url) window.location.href = j.url; }}>Receipts, card or cancel</button>}
          </div>
          <details>
            <summary className="linkbtn" style={{ display: 'inline' }}>Delete {d.name}</summary>
            <p className="help" style={{ marginTop: 10 }}>This cancels the plan and removes everything about {d.name} straight away. It can’t be undone. Type <b>{d.slug}</b> to confirm.</p>
            <div className="row">
              <input type="text" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-label="Type the name to confirm" style={{ flex: '1 1 160px' }} />
              <button className="btn small" disabled={confirm.trim().toLowerCase() !== d.slug || busy === 'delete'} onClick={async () => { if (await call('delete', { confirm })) window.location.href = '/'; }}>Delete forever</button>
            </div>
          </details>
        </section>
      </main>
    </div>
  );
}
