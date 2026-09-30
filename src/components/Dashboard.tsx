'use client';
import { useEffect, useRef, useState } from 'react';
import { Buddy, PALETTES } from './Buddy';
import { Egg } from './Egg';
import type { Settings } from '@/lib/buddies';
import { BAND_GAMES, BAND_INFO, BANDS, GAMES, type Band, type GameId } from '@/lib/learning';

type Data = {
  slug: string; name: string; status: string; colour: string; childName: string; tz: string; email: string; plan: string;
  visitDay: number; stage: string; hatched: boolean; eggDay: number; ageBand: Band;
  nextStage: { name: string; in: number } | null; today: string | null;
  timeline: { day: number; date: string; title: string; track: string }[];
  messages: { id: number; text: string; date: string }[];
  devices: { id: string; kind: string; name: string; lastSeen: string | null }[];
  settings: Settings; dress: string[]; playedToday: number; playedWeek: number; todayDate: string;
  urls: { buddy: string; tv: string; login: string }; code: string; pin: string; billing: boolean;
};

type Tab = 'today' | 'learn' | 'settings' | 'access';
const TABS: { id: Tab; icon: string; label: string }[] = [
  { id: 'today', icon: '🏠', label: 'Today' }, { id: 'learn', icon: '🎓', label: 'Learning' },
  { id: 'settings', icon: '⚙️', label: 'Settings' }, { id: 'access', icon: '🔑', label: 'Access' },
];
const TRACK_EMOJI: Record<string, string> = { egg: '🥚', sounds: '🔊', moves: '🕺', counting: '🔢', colours: '🎨', shapes: '🔺', feelings: '💛', songs: '🎵', dress: '🎩', room: '🏠', games: '🎲' };
const MOMENTS: [string, string, string][] = [
  ['well-done', '⭐', 'Well done'], ['birthday', '🎂', 'Birthday'], ['sing', '🎵', 'Sing'],
  ['dance', '🕺', 'Dance'], ['hello', '👋', 'Hello'], ['bedtime', '🌙', 'Bedtime'],
];
const WEIGHTS: [string, string][] = [['counting', 'Counting'], ['colours', 'Colours'], ['shapes', 'Shapes'], ['songs', 'Songs'], ['feelings', 'Feelings']];
const DRESS_NAMES: Record<string, string> = { bow: 'Bow', beanie: 'Beanie', headphones: 'Headphones', party: 'Party hat', glasses: 'Glasses', flower: 'Flower', scarf: 'Scarf', crown: 'Crown' };
const SESSION = [5, 10, 15, 20, 30, 0];
const DAILY = [15, 30, 45, 60, 90, 0];
const ago = (iso: string | null) => {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 2 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const niceDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short' });
const addDays = (d: string, n: number) => { const x = new Date(`${d}T12:00:00`); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };

export function Dashboard({ base, data }: { base: string; data: Data }) {
  const [tab, setTab] = useState<Tab>('today');
  const [d, setD] = useState(data);
  const [s, setS] = useState<Settings>(data.settings);
  const [colour, setColour] = useState(data.colour);
  const [band, setBand] = useState<Band>(data.ageBand);
  const [childName, setChildName] = useState(data.childName);
  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ text: '', date: data.todayDate });
  const [pair, setPair] = useState({ code: '', name: 'Lounge TV' });
  const [showPin, setShowPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [allTimeline, setAllTimeline] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fromHash = () => { const h = window.location.hash.slice(1) as Tab; if (TABS.some((t) => t.id === h)) setTab(h); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, []);
  const go = (t: Tab) => { setTab(t); history.replaceState(null, '', `#${t}`); window.scrollTo({ top: 0 }); };

  const say = (text: string, bad = false) => { setToast({ text, bad }); setTimeout(() => setToast(null), 2600); };
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
  /** Settings save as you change them. Sliders wait until you stop moving. */
  const pending = useRef<Partial<Settings>>({});
  const save = (patch: Partial<Settings>, wait = 0) => {
    setS((cur) => ({ ...cur, ...patch }));
    pending.current = { ...pending.current, ...patch };
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => { const p = pending.current; pending.current = {}; call('settings', { settings: p }, 'Saved ✓'); }, wait);
  };

  const accessory = s.accessory && d.dress.includes(s.accessory) ? s.accessory : d.dress.at(-1) ?? null;
  const bandGames = (Object.entries(BAND_GAMES[band]) as [GameId, number][]).sort((a, b) => a[1] - b[1]);
  const visitsToHatch = Math.max(0, 4 - d.eggDay);

  return (
    <div className="parent">
      <header className="parent-head">
        <a href={base || '/'} className="parent-id" aria-label={`Open ${d.name}`}>
          <span className="parent-avatar">{d.hatched ? <Buddy colour={colour} mood="happy" accessory={accessory} /> : <Egg crack={Math.max(0, d.eggDay - 1)} peek={d.eggDay >= 3} wobble={0} glow={false} colour="#FFD98E" />}</span>
          <span><b>{d.name}</b><small>Parent page</small></span>
        </a>
        <a href={base || '/'} className="btn small">Open {d.name}</a>
      </header>

      <nav className="parent-tabs" aria-label="Sections">
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => go(t.id)} aria-current={tab === t.id ? 'page' : undefined}><span>{t.icon}</span>{t.label}</button>)}
      </nav>

      {toast && <div role="status" className={`parent-toast${toast.bad ? ' bad' : ''}`}>{toast.text}</div>}

      <main className="parent-main">
        {d.status !== 'active' && <div className="error">{d.name} is {d.status === 'lapsed' ? 'asleep because the plan has ended' : 'switched off'}. {d.billing && 'Restart the plan under Access → Plan.'}</div>}

        {tab === 'today' && (
          <>
            <section className="pcard hero-card">
              <div className="hero-pic">{d.hatched ? <Buddy colour={colour} mood="grin" action="bounce" accessory={accessory} /> : <Egg crack={Math.max(0, d.eggDay - 1)} peek={d.eggDay >= 3} wobble={0} glow={false} colour="#FFD98E" />}</div>
              <div>
                {d.hatched ? (
                  <p className="chip-line">Day {d.visitDay} · {d.stage}{d.nextStage ? ` · ${d.nextStage.name} in ${d.nextStage.in}` : ''}</p>
                ) : (
                  <p className="chip-line">🥚 {d.eggDay === 0 ? 'The egg arrives on the first visit' : visitsToHatch === 0 ? 'Hatching today!' : `Hatches in ${visitsToHatch} more ${visitsToHatch === 1 ? 'visit' : 'visits'}`}</p>
                )}
                <h2>{d.today ? d.today : `Something new appears on today’s first visit`}</h2>
                <p className="muted small">Played {d.playedToday} min today · {d.playedWeek} min this week</p>
              </div>
            </section>

            <section className="pcard">
              <h3>Special moments</h3>
              <p className="help">Plays straight away on every screen where {d.name} is open.</p>
              <div className="moments3">
                {MOMENTS.map(([id, icon, label]) => <button key={id} className="moment3" disabled={busy === 'moment'} onClick={() => call('moment', { command: id }, 'Sent!')}><span>{icon}</span>{label}</button>)}
              </div>
            </section>

            <section className="pcard">
              <h3>A message from you</h3>
              <p className="help">{d.name} reads it out loud on that day’s visit (it isn’t shown as text). Short and kind works best.</p>
              <form onSubmit={async (e) => { e.preventDefault(); const j = await call('message.add', msg, 'Message saved'); if (j) { setD({ ...d, messages: [...d.messages, { id: Date.now(), text: msg.text, date: msg.date }].sort((a, b) => a.date.localeCompare(b.date)) }); setMsg({ ...msg, text: '' }); } }}>
                <textarea rows={2} maxLength={140} value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} placeholder="Well done at swimming today!" aria-label="Message" />
                <div className="chips" style={{ margin: '10px 0' }}>
                  <button type="button" className="chip" aria-pressed={msg.date === d.todayDate} onClick={() => setMsg({ ...msg, date: d.todayDate })}>Today</button>
                  <button type="button" className="chip" aria-pressed={msg.date === addDays(d.todayDate, 1)} onClick={() => setMsg({ ...msg, date: addDays(d.todayDate, 1) })}>Tomorrow</button>
                  <input type="date" value={msg.date} min={d.todayDate} onChange={(e) => setMsg({ ...msg, date: e.target.value })} aria-label="Pick a day" className="date-chip" />
                </div>
                <button className="btn block" disabled={!msg.text.trim() || busy === 'message.add'}>Save message</button>
              </form>
              {d.messages.length > 0 && (
                <ul className="plist">
                  {d.messages.map((m) => <li key={m.id}><span><b>{niceDate(m.date)}</b><br />{m.text}</span><button className="linkbtn" onClick={async () => { if (await call('message.delete', { id: m.id })) setD({ ...d, messages: d.messages.filter((x) => x.id !== m.id) }); }}>Delete</button></li>)}
                </ul>
              )}
            </section>
          </>
        )}

        {tab === 'learn' && (
          <>
            <section className="pcard">
              <h3>Age</h3>
              <p className="help">Sets which games {d.name} plays and how hard they are.</p>
              <div className="seg">
                {BANDS.map((b) => <button key={b} aria-pressed={band === b} onClick={() => { setBand(b); call('settings', { settings: {}, ageBand: b }, 'Saved ✓'); }}>{b}</button>)}
              </div>
              <p className="small" style={{ marginTop: 10 }}><b>{BAND_INFO[band].label}:</b> {BAND_INFO[band].about}</p>
            </section>

            <section className="pcard">
              <h3>Games</h3>
              <p className="help">New games appear over the first two weeks. Switch off any you don’t want. Each one gets a little harder when your child gets them all right.</p>
              <ul className="games-list">
                {bandGames.map(([g, day]) => {
                  const on = s.games[g] !== false;
                  const ready = d.visitDay >= day;
                  return (
                    <li key={g}>
                      <span className="g-icon">{GAMES[g].icon}</span>
                      <span className="g-text"><b>{GAMES[g].name}</b><small>{GAMES[g].skill}{ready ? '' : ` · from day ${day}`}</small></span>
                      <button className={`switch${on ? ' on' : ''}`} role="switch" aria-checked={on} aria-label={GAMES[g].name} onClick={() => save({ games: { ...s.games, [g]: !on } })} />
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="pcard">
              <h3>Learning mix</h3>
              <p className="help">Slide up to see more of that sooner in the daily new things.</p>
              {WEIGHTS.map(([k, label]) => (
                <label className="pslider" key={k}>
                  <span>{label}</span>
                  <input type="range" min={0.25} max={3} step={0.25} value={s.weights[k] ?? 1} onChange={(e) => save({ weights: { ...s.weights, [k]: Number(e.target.value) } }, 700)} />
                </label>
              ))}
              <label className="prow">
                <span><b>Holiday mode</b><small>No new things until you switch it off</small></span>
                <button className={`switch${s.paused ? ' on' : ''}`} role="switch" aria-checked={s.paused} aria-label="Holiday mode" onClick={() => save({ paused: !s.paused })} />
              </label>
            </section>

            <section className="pcard">
              <h3>{d.name}’s timeline</h3>
              {d.timeline.length ? (
                <>
                  <ul className="tl">
                    {(allTimeline ? d.timeline : d.timeline.slice(0, 10)).map((t) => <li key={t.date}><b>Day {t.day}</b><span>{TRACK_EMOJI[t.track] ?? '✨'} {t.title}<small>{niceDate(t.date)}</small></span></li>)}
                  </ul>
                  {d.timeline.length > 10 && !allTimeline && <button className="linkbtn" onClick={() => setAllTimeline(true)}>Show all {d.timeline.length}</button>}
                </>
              ) : <p className="muted">Nothing yet. The egg arrives on the first visit!</p>}
            </section>
          </>
        )}

        {tab === 'settings' && (
          <>
            <section className="pcard">
              <h3>Play time</h3>
              <p className="label">One play</p>
              <div className="chips">{SESSION.map((m) => <button key={m} className="chip" aria-pressed={s.sessionMinutes === m} onClick={() => save({ sessionMinutes: m })}>{m ? `${m} min` : 'No limit'}</button>)}</div>
              <p className="help" style={{ margin: '6px 0 14px' }}>Then {d.name} yawns, waves and has a nap.</p>
              <p className="label">Per day</p>
              <div className="chips">{DAILY.map((m) => <button key={m} className="chip" aria-pressed={s.dailyCapMinutes === m} onClick={() => save({ dailyCapMinutes: m })}>{m ? `${m} min` : 'No limit'}</button>)}</div>
            </section>

            <section className="pcard">
              <h3>Bedtime</h3>
              <p className="help">At bedtime {d.name} sings a lullaby and sleeps. A tap gets a sleepy wave, then it’s back to sleep.</p>
              <div className="two">
                <label className="field"><span className="label">Sleeps at</span><input type="time" value={s.bedtime} onChange={(e) => save({ bedtime: e.target.value }, 800)} /></label>
                <label className="field"><span className="label">Wakes at</span><input type="time" value={s.wakeTime} onChange={(e) => save({ wakeTime: e.target.value }, 800)} /></label>
              </div>
              <p className="label">Volume</p>
              <div className="seg">{(['low', 'medium', 'high'] as const).map((v) => <button key={v} aria-pressed={s.volume === v} onClick={() => save({ volume: v })}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
            </section>

            <section className="pcard">
              <h3>Look and name</h3>
              <p className="label">Colour</p>
              <div className="swatches">{Object.entries(PALETTES).map(([id, p]) => <button key={id} type="button" className="swatch" aria-pressed={colour === id} aria-label={p.name} onClick={() => { setColour(id); call('settings', { settings: {}, colour: id }, 'Saved ✓'); }} style={{ background: `linear-gradient(145deg, ${p.body}, ${p.shade})` }} />)}</div>
              <p className="label" style={{ marginTop: 14 }}>Wearing</p>
              {d.dress.length ? (
                <div className="chips">
                  <button type="button" className="chip" aria-pressed={s.accessory === null} onClick={() => save({ accessory: null })}>Newest</button>
                  {d.dress.map((x) => <button key={x} type="button" className="chip" aria-pressed={s.accessory === x} onClick={() => save({ accessory: x })}>{DRESS_NAMES[x] ?? x}</button>)}
                </div>
              ) : <p className="help">{d.name} earns its first outfit a few days after hatching.</p>}
              <label className="field" style={{ marginTop: 14 }}><span className="label">Child’s first name</span><input type="text" maxLength={24} value={childName} onChange={(e) => setChildName(e.target.value)} onBlur={() => { if (childName !== data.childName) call('settings', { settings: {}, childName }, 'Saved ✓'); }} /></label>
              <p className="help">{d.name} says it when saying hi.</p>
            </section>
          </>
        )}

        {tab === 'access' && (
          <>
            <section className="pcard">
              <h3>Buddy code</h3>
              <p className="help">Opens {d.name} on any phone, tablet or TV: type it at <b>{d.urls.login.replace(/^https?:\/\//, '')}</b>. It’s also inside the QR card. The device remembers {d.name} after that.</p>
              <div className="bigcode">{d.code}</div>
              <div className="row">
                <button className="btn small ghost" onClick={() => { navigator.clipboard?.writeText(d.code).then(() => say('Copied')).catch(() => {}); }}>Copy</button>
                <a className="btn small" href={`${base}/card`} target="_blank" rel="noopener">🖨️ Print the QR card</a>
                <button className="btn small ghost" onClick={async () => { if (!window.confirm('Make a new code? The old code and printed card stop working, and phones need the new code.')) return; const j = await call('card.new', {}, 'New code ready. Print a new card.'); if (j?.code) setD({ ...d, code: j.code, devices: d.devices.filter((x) => x.kind !== 'phone') }); }}>New code</button>
              </div>
            </section>

            <section className="pcard">
              <h3>Parent PIN</h3>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <div className="bigcode pin">{showPin ? d.pin : '••••'}</div>
                <button className="linkbtn" onClick={() => setShowPin(!showPin)}>{showPin ? 'Hide' : 'Show'}</button>
              </div>
              <div className="secret-tip">
                <b>Getting here from inside {d.name}</b>
                <p>There’s no button your child can see. <b>Press and hold the top-right corner of the screen for 3 seconds</b>, then type this PIN.</p>
              </div>
              <form className="row" style={{ marginTop: 12 }} onSubmit={async (e) => { e.preventDefault(); if (await call('pin.set', { pin: newPin }, 'PIN changed')) { setD({ ...d, pin: newPin }); setNewPin(''); } }}>
                <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} placeholder="New PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} aria-label="New PIN" style={{ flex: '1 1 120px', letterSpacing: '.3em' }} />
                <button className="btn small" disabled={newPin.length !== 4}>Change PIN</button>
              </form>
            </section>

            <section className="pcard">
              <h3>Screens</h3>
              <ul className="plist">
                {d.devices.length === 0 && <li className="help">No screens yet. Scan the card or type the code on a device.</li>}
                {d.devices.map((x) => <li key={x.id}><span>{x.kind === 'tv' ? '📺' : '📱'} <b>{x.name}</b> <small className="muted">· {ago(x.lastSeen)}</small></span><button className="linkbtn" onClick={async () => { if (await call('device.remove', { id: x.id }, 'Removed')) setD({ ...d, devices: d.devices.filter((y) => y.id !== x.id) }); }}>Remove</button></li>)}
              </ul>
              <p className="help" style={{ margin: '0 0 8px' }}>Connect a TV: on the TV’s web browser open <b>{d.urls.tv.replace(/^https?:\/\//, '')}</b>, then type the buddy code there, or the 6-digit number it shows here:</p>
              <form className="row" onSubmit={async (e) => { e.preventDefault(); if (await call('pair', pair, 'TV connected!')) setTimeout(() => window.location.reload(), 1200); }}>
                <input type="text" inputMode="numeric" maxLength={7} placeholder="6-digit number" value={pair.code} onChange={(e) => setPair({ ...pair, code: e.target.value })} aria-label="TV number" style={{ flex: '1 1 130px' }} />
                <button className="btn small" disabled={pair.code.replace(/\D/g, '').length !== 6 || busy === 'pair'}>Connect</button>
              </form>
              {d.devices.some((x) => x.kind === 'tv') && <p style={{ marginTop: 12 }}><a href={`${base}/remote`} className="btn small ghost">📱 Use this phone as the TV remote</a></p>}
            </section>

            <section className="pcard">
              <h3>Phones and tablets</h3>
              <ul className="tips">
                <li><b>Make it an app:</b> open {d.name} in Safari or Chrome, then Share → <i>Add to Home Screen</i>. It opens full screen with no address bar.</li>
                <li><b>Keep little fingers in:</b> on iPhone/iPad turn on <i>Guided Access</i> (Settings → Accessibility), then triple-click the side button while {d.name} is open. On Android use <i>App pinning</i> (Settings → Security).</li>
                <li><b>No ads, chat or shop</b> anywhere your child can reach, and nothing is recorded: {d.name} never uses the microphone or camera.</li>
              </ul>
            </section>

            <section className="pcard">
              <h3>Plan and account</h3>
              <p className="muted small">{d.plan === 'yearly' ? 'Yearly' : 'Monthly'} plan · {d.email}</p>
              <div className="row" style={{ marginBottom: 14 }}>
                {d.billing && <button className="btn small ghost" disabled={busy === 'billing'} onClick={async () => { const j = await call('billing'); if (j?.url) window.location.href = j.url; }}>Receipts, card or cancel</button>}
                <button className="btn small ghost" onClick={async () => { if (await call('logout')) window.location.href = base || '/'; }}>Sign out of this page</button>
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
          </>
        )}
      </main>
    </div>
  );
}
