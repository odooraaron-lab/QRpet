'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Buddy, type Action, type Mood } from './Buddy';
import { COLOURS, ITEM, type Abilities } from '@/lib/growth';
import { sounds, playSong, say, unlockAudio } from '@/lib/sound';

export type BuddyState = {
  slug: string; name: string; colour: string; childName: string; status: string;
  visitDay: number; today: { id: string; title: string; isNew: boolean } | null;
  learned: string[]; abilities: Abilities; messages: string[];
  settings: { sessionMinutes: number; volume: 'low' | 'medium' | 'high'; readAloud: boolean; games: Record<string, boolean>; accessory: string | null };
  bedtimeNow: boolean; capReached: boolean; commandSince: number; tvPaired: boolean;
};

type Phase = 'asleep' | 'hatch' | 'intro' | 'play' | 'game' | 'bye';
type Game = null | { kind: 'count'; n: number; got: number[]; k: number } | { kind: 'pick'; what: 'colours' | 'shapes'; round: number; target: string; options: string[]; wrong: string | null } | { kind: 'peekaboo'; round: number; hidden: boolean };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(xs: T[]) => [...xs].sort(() => Math.random() - 0.5);
const SHAPES: Record<string, string> = { circle: '●', square: '■', triangle: '▲', star: '★', heart: '♥' };
const SHAPE_COLOURS = ['#4C8DF6', '#EF5B5B', '#3FB984', '#FFB020', '#FF7EB6'];
const SONG_OF: Record<string, string> = { 'song-hello': 'hello', 'song-star': 'star', 'song-rain': 'rain', 'song-goodnight': 'goodnight' };
const MOVE_ACTION: Record<string, Action> = { wave: 'wave', bounce: 'bounce', clap: 'clap', spin: 'spin', dance: 'dance', jump: 'jump', hug: 'hug' };

export function Player({ initial, base, tv = false }: { initial: BuddyState; base: string; tv?: boolean }) {
  const [s, setS] = useState(initial);
  const [phase, setPhase] = useState<Phase>('asleep');
  const [mood, setMood] = useState<Mood>('asleep');
  const [action, setAction] = useState<Action>('idle');
  const [glow, setGlow] = useState(false);
  const [card, setCard] = useState<{ title: string; text?: string } | null>(null);
  const [game, setGame] = useState<Game>(null);
  const [fx, setFx] = useState<{ id: number; kind: 'sparkles' | 'confetti' | 'note'; x?: number }[]>([]);
  const [muted, setMuted] = useState(false);
  const [eggTaps, setEggTaps] = useState(0);
  const busy = useRef(false);
  const lastInput = useRef(Date.now());
  const played = useRef(0);
  const since = useRef(initial.commandSince);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const a = s.abilities;
  const knows = (id: string) => s.learned.includes(id);
  const accessory = s.settings.accessory && a.dress.includes(s.settings.accessory) ? s.settings.accessory : a.dress.at(-1) ?? null;
  const games = s.settings.games;

  // ── effects ──
  const burst = useCallback((kind: 'sparkles' | 'confetti' | 'note', x?: number) => {
    const id = Math.random();
    setFx((f) => [...f, { id, kind, x }]);
    setTimeout(() => setFx((f) => f.filter((e) => e.id !== id)), kind === 'confetti' ? 4200 : 2600);
  }, []);
  const act = useCallback(async (next: Action, ms = 1600, m?: Mood) => {
    if (m) setMood(m);
    setAction(next);
    await wait(ms);
    setAction('idle');
  }, []);
  const play = (fn: () => void) => { if (!muted) fn(); };

  const sing = useCallback(async (songId?: string) => {
    const learnedSongs = s.learned.map((id) => SONG_OF[id]).filter(Boolean);
    const id = songId ?? (learnedSongs.length ? pick(learnedSongs) : 'name');
    setMood('sing'); setAction('sway');
    const ms = muted ? 3000 : playSong(id, (i) => { if (i % 2 === 0) burst('note', 20 + Math.random() * 60); });
    await wait(ms);
    setMood('happy'); setAction('idle');
  }, [s.learned, muted, burst]);

  const randomMove = useCallback(async () => {
    const moves = a.moves.map((m) => MOVE_ACTION[m]).filter(Boolean);
    const m = moves.length ? pick(moves) : 'hop';
    play(sounds.boop);
    await act(m, m === 'jump' ? 2000 : 1800, 'grin');
    setMood('happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.moves, act, muted]);

  // ── the reveal of today's new thing ──
  const reveal = useCallback(async (id: string) => {
    const item = ITEM[id];
    setGlow(true); setMood('think');
    play(sounds.sparkle); burst('sparkles');
    await wait(1400);
    play(sounds.ding); setMood('surprised');
    await wait(500);
    setCard({ title: 'New today!', text: item?.title ?? 'A little sparkle' });
    setGlow(false); setMood('grin');
    const [kind, value] = id.split(/-(.*)/);
    if (kind === 'move' && MOVE_ACTION[value]) await act(MOVE_ACTION[value], 2000, 'grin');
    else if (kind === 'sound') { const f = (sounds as unknown as Record<string, () => void>)[value]; if (f) play(f); await act('hop', 900); }
    else if (kind === 'count' && Number(value)) { for (let k = 1; k <= Number(value); k++) { play(() => sounds.count(k)); await wait(420); } }
    else if (kind === 'song') await sing(SONG_OF[id]);
    else { play(sounds.trill); await act('bounce', 1800, 'grin'); }
    await wait(1800);
    setCard(null); setMood('happy');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, burst, sing, muted]);

  const showMessages = useCallback(async () => {
    for (const m of s.messages) {
      setCard({ title: '💌', text: m });
      play(sounds.trill); burst('confetti');
      if (s.settings.readAloud && !muted) say(m);
      await act('bounce', 1800, 'grin');
      await wait(2600);
      setCard(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.messages, s.settings.readAloud, act, burst, muted]);

  const bye = useCallback(async (why: 'time' | 'bedtime') => {
    setGame(null); setPhase('bye');
    if (why === 'bedtime') { setMood('sleepy'); if (!muted) playSong('lullaby'); await wait(3000); }
    else { play(sounds.yawn); await act('wave', 2200, 'happy'); setMood('sleepy'); await wait(1200); }
    setMood('asleep'); setAction('idle');
    setCard({ title: 'Night night!', text: why === 'bedtime' ? `${s.name} is sleeping. See you in the morning.` : `${s.name} needs a nap. Come back tomorrow!` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, muted, s.name]);

  // ── waking up ──
  async function wake() {
    unlockAudio(s.settings.volume);
    lastInput.current = Date.now();
    if (s.today?.id === 'hatch' && s.today.isNew) { setPhase('hatch'); return; }
    await intro();
  }

  async function intro() {
    busy.current = true;
    setPhase('intro'); setMood('sleepy');
    await wait(500);
    play(sounds.boop); setMood('surprised');
    await wait(400);
    if (s.bedtimeNow) { busy.current = false; return bye('bedtime'); }
    await act(knows('move-wave') ? 'wave' : 'bounce', 1800, 'grin');
    if (s.childName && s.settings.readAloud && !muted) say(`Hello ${s.childName}!`);
    if (!muted) playSong('name');
    setMood('happy');
    await wait(900);
    if (s.today?.isNew && s.today.id !== 'hatch') await reveal(s.today.id);
    if (s.messages.length) await showMessages();
    busy.current = false;
    if (s.capReached) return bye('time');
    setPhase('play');
  }

  async function tapEgg() {
    unlockAudio(s.settings.volume);
    const n = eggTaps + 1;
    setEggTaps(n);
    play(() => sounds.count(n));
    if (n < 3) return;
    play(sounds.hatch);
    await wait(700);
    burst('sparkles'); burst('confetti');
    setPhase('intro'); setMood('surprised');
    await act('bounce', 1800, 'grin');
    setCard({ title: `Hello! I’m ${s.name}!`, text: s.childName ? `Nice to meet you, ${s.childName}!` : 'Nice to meet you!' });
    if (s.childName && s.settings.readAloud && !muted) say(`Hello ${s.childName}!`);
    await wait(3200);
    setCard(null);
    if (s.messages.length) await showMessages();
    setPhase('play'); setMood('happy');
  }

  // ── taps on QR ──
  async function tapTummy() {
    lastInput.current = Date.now();
    if (phase === 'game' && game?.kind === 'peekaboo') return peekTap();
    if (phase !== 'play' || busy.current) return;
    busy.current = true;
    play(knows('sound-giggle') ? sounds.giggle : sounds.boop);
    await act('giggle', 1300, 'grin');
    setMood('happy'); busy.current = false;
  }
  async function tapHead() {
    lastInput.current = Date.now();
    if (phase === 'game' && game?.kind === 'peekaboo') return peekTap();
    if (phase !== 'play' || busy.current) return;
    busy.current = true;
    play(knows('sound-pop') ? sounds.pop : sounds.boop);
    await act('hop', 700, 'surprised');
    setMood('happy'); busy.current = false;
  }

  // ── games ──
  function startGame(kind: 'count' | 'colours' | 'shapes' | 'peekaboo') {
    lastInput.current = Date.now();
    if (busy.current) return;
    setPhase('game'); setMood('happy'); setAction('idle');
    if (kind === 'count') setGame({ kind: 'count', n: Math.min(10, Math.max(2, a.countTo)), got: [], k: 0 });
    else if (kind === 'peekaboo') { setGame({ kind: 'peekaboo', round: 1, hidden: true }); setAction('hide'); play(sounds.hmm); }
    else newRound(kind, 1);
  }
  function newRound(what: 'colours' | 'shapes', round: number) {
    const known = what === 'colours' ? a.colours : a.shapes;
    const pool = what === 'colours' ? Object.keys(COLOURS) : Object.keys(SHAPES);
    const target = pick(known.length ? known : pool.slice(0, 1));
    const others = shuffle(pool.filter((x) => x !== target)).slice(0, 2);
    setGame({ kind: 'pick', what, round, target, options: shuffle([target, ...others]), wrong: null });
    if (s.settings.readAloud && !muted) say(what === 'colours' ? `Find ${target}!` : `Find the ${target}!`);
  }
  async function endGame(win = true) {
    if (win) { play(sounds.cheer); burst('confetti'); await act('dance', 2400, 'grin'); }
    setGame(null); setPhase('play'); setMood('happy');
  }
  async function countTap(i: number) {
    if (!game || game.kind !== 'count' || game.got.includes(i)) return;
    lastInput.current = Date.now();
    const k = game.k + 1;
    setGame({ ...game, got: [...game.got, i], k });
    play(() => sounds.count(k));
    if (s.settings.readAloud && !muted) say(String(k));
    setAction('hop'); setTimeout(() => setAction('idle'), 550);
    if (k === game.n) {
      await wait(700);
      if (a.countBack) { for (const x of [3, 2, 1]) { setGame((g) => (g && g.kind === 'count' ? { ...g, k: x } : g)); play(() => sounds.count(x)); if (s.settings.readAloud && !muted) say(String(x)); await wait(700); } play(sounds.whoosh); await act('jump', 1100, 'grin'); }
      await endGame();
    }
  }
  async function pickTap(option: string) {
    if (!game || game.kind !== 'pick') return;
    lastInput.current = Date.now();
    if (option !== game.target) { play(sounds.oops); setGame({ ...game, wrong: option }); setMood('pout'); await wait(700); setMood('happy'); return; }
    play(sounds.trill); await act('bounce', 1000, 'grin');
    if (game.round >= 3) return endGame();
    newRound(game.what, game.round + 1);
  }
  async function peekTap() {
    if (!game || game.kind !== 'peekaboo' || !game.hidden) return;
    setAction('idle'); setMood('grin'); play(sounds.giggle);
    if (s.settings.readAloud && !muted) say('Boo!');
    setGame({ ...game, hidden: false });
    await wait(1400);
    if (game.round >= 3) return endGame();
    setMood('happy'); await wait(600 + Math.random() * 1500);
    setGame({ kind: 'peekaboo', round: game.round + 1, hidden: true }); setAction('hide'); play(sounds.hmm);
  }

  // ── commands from the parent page and the TV remote ──
  const runCommand = useCallback(async (c: string) => {
    if (phaseRef.current === 'asleep' || phaseRef.current === 'hatch') return;
    lastInput.current = Date.now();
    if (c === 'bedtime') return bye('bedtime');
    if (phaseRef.current === 'bye') return;
    if (c === 'hello') { play(sounds.boop); return act('wave', 1800, 'grin'); }
    if (c === 'sing') return sing();
    if (c === 'dance') { play(sounds.trill); return act('dance', 3000, 'grin'); }
    if (c === 'hug') return act('hug', 1500, 'grin');
    if (c === 'well-done') { play(sounds.cheer); burst('confetti'); setCard({ title: 'Well done!', text: '⭐ ⭐ ⭐' }); await act('jump', 2000, 'proud'); await wait(1500); setCard(null); return; }
    if (c === 'birthday') {
      burst('confetti'); setCard({ title: 'Happy birthday! 🎂', text: s.childName ? `Hooray for ${s.childName}!` : 'Hooray!' });
      await sing('birthday'); await act('dance', 2400, 'grin'); setCard(null); return;
    }
    if (['count', 'colours', 'shapes', 'peekaboo'].includes(c)) { setGame(null); return startGame(c as 'count'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, bye, sing, burst, s.childName, muted]);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`${base}/api/poll?since=${since.current}${tv ? '&tv=1' : ''}`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          for (const c of j.commands as { id: number; command: string }[]) { since.current = c.id; await runCommand(c.command); }
          if (j.refresh) { const st = await fetch(`${base}/api/state`, { cache: 'no-store' }); if (st.ok) setS(await st.json()); }
        }
      } catch { /* offline: keep playing */ }
      if (!stop) setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 3000);
    return () => { stop = true; clearTimeout(t); };
  }, [base, tv, runCommand]);

  // ── idle life, screensaver, play time and the session limit ──
  useEffect(() => {
    const iv = setInterval(() => {
      const p = phaseRef.current;
      if (p === 'play' || p === 'game') played.current += 1;
      if (played.current > 0 && played.current % 30 === 0) fetch(`${base}/api/ping`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seconds: 30 }) }).catch(() => {});
      if (p === 'play' && s.settings.sessionMinutes > 0 && played.current >= s.settings.sessionMinutes * 60) { bye('time'); return; }
      if (p !== 'play' || busy.current) return;
      const idle = Date.now() - lastInput.current;
      if (idle > 120000) { setAction('float'); setMood('sleepy'); return; }
      if (Math.random() < 0.12) {
        const el = document.querySelector('.world .qb') as HTMLElement | null;
        el?.style.setProperty('--look-x', `${Math.round(Math.random() * 10 - 5)}px`);
        el?.style.setProperty('--look-y', `${Math.round(Math.random() * 6 - 3)}px`);
      }
      if (Math.random() < 0.06) { busy.current = true; randomMove().finally(() => { busy.current = false; }); }
    }, 1000);
    return () => clearInterval(iv);
  }, [base, s.settings.sessionMinutes, bye, randomMove]);

  // ── parent gate: hold the lock for 2 seconds ──
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gateDown = () => { hold.current = setTimeout(() => { window.location.href = `${base}/parent`; }, 2000); };
  const gateUp = () => { if (hold.current) clearTimeout(hold.current); };

  const room = new Set(a.room);
  const night = s.bedtimeNow || phase === 'bye';
  const tools: { key: string; icon: string; label: string; on: () => void }[] = [];
  if (phase === 'play') {
    tools.push({ key: 'sing', icon: '🎵', label: 'Sing', on: () => { lastInput.current = Date.now(); if (!busy.current) { busy.current = true; sing().finally(() => { busy.current = false; }); } } });
    if (games.count !== false && a.countTo >= 2) tools.push({ key: 'count', icon: '🔢', label: 'Count', on: () => startGame('count') });
    if (games.peekaboo !== false && a.games.includes('peekaboo')) tools.push({ key: 'peek', icon: '🙈', label: 'Peekaboo', on: () => startGame('peekaboo') });
    if (games.colours !== false && a.games.includes('colours')) tools.push({ key: 'colours', icon: '🎨', label: 'Colours', on: () => startGame('colours') });
    if (games.shapes !== false && a.games.includes('shapes')) tools.push({ key: 'shapes', icon: '🔷', label: 'Shapes', on: () => startGame('shapes') });
    if (a.moves.length) tools.push({ key: 'move', icon: '💃', label: 'Move', on: () => { lastInput.current = Date.now(); if (!busy.current) { busy.current = true; randomMove().finally(() => { busy.current = false; }); } } });
  }

  return (
    <div className={`world${night ? ' night' : ''}${phase === 'play' || phase === 'game' ? ' has-tools' : ''}${phase === 'game' ? ' in-game' : ''}`} onPointerDown={() => { lastInput.current = Date.now(); if (action === 'float') { setAction('idle'); setMood('happy'); } }}>
      {room.has('window') && <div className="window"><div className="sun" /><div className="cloud-bit" />{room.has('rainbow') && <div className="rainbow" />}</div>}
      {room.has('rug') && <div className="shelf"><div className="toys">{['🧸', '🎈', knows('room-plant') ? '🪀' : '', room.has('milestone-60') ? '🏅' : ''].filter(Boolean).map((t) => <span key={t}>{t}</span>)}</div></div>}
      {room.has('stars') && [8, 22, 38, 61, 77, 90].map((x, i) => <span key={x} className="ceiling-star" style={{ left: `${x}%`, top: `${4 + (i % 3) * 4}%`, animationDelay: `${i * 0.4}s` }}>★</span>)}
      {room.has('bunting') && <div className="bunting">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${i * 7.4}%`, ['--c' as string]: ['#EF5B5B', '#FFD23F', '#4C8DF6', '#3FB984'][i % 4] }} />)}</div>}
      <div className="floor" />
      {room.has('plant') && <div className="plant">🪴</div>}
      {room.has('moon') && <div className="moon" />}
      <div className="name-tag">{s.name}{a.stage ? ` · ${a.stage.name}` : ''}</div>

      {phase === 'hatch' ? (
        <button className="egg" onClick={tapEgg} aria-label="Tap the egg" style={{ border: 0, background: 'none' }} key={eggTaps}>
          <svg viewBox="0 0 200 240" className={`egg-svg${eggTaps ? ' wobble' : ''}`}>
            <ellipse cx="100" cy="130" rx="84" ry="104" fill="#FFF8EC" stroke="#E7C98F" strokeWidth="6" />
            <circle cx="70" cy="100" r="14" fill="#FFD98E" /><circle cx="128" cy="150" r="18" fill="#B4DAFF" /><circle cx="90" cy="180" r="10" fill="#FFCBB2" />
            {eggTaps >= 1 && <path d="M40 120l20 10 14 -12 18 14 16 -12 20 10 14 -10 18 12" stroke="#C99A55" strokeWidth="5" fill="none" strokeLinejoin="round" />}
            {eggTaps >= 2 && <path d="M60 80l14 12 12 -8" stroke="#C99A55" strokeWidth="4" fill="none" />}
          </svg>
        </button>
      ) : (
        <div className="stage">
          {room.has('rug') && <div className="rug" />}
          <Buddy colour={s.colour} mood={mood} action={action} accessory={accessory} glow={glow} scale={a.stage.scale} sticker={room.has('milestone-30')} onTummy={tapTummy} onHead={tapHead} />
        </div>
      )}

      {/* games */}
      {phase === 'game' && game?.kind === 'count' && (
        <>
          <div className="hint">Count with {s.name}!</div>
          <div className="game-items">{Array.from({ length: game.n }, (_, i) => <button key={i} className={`game-item${game.got.includes(i) ? ' done' : ''}`} onClick={() => countTap(i)} style={{ color: '#FFB020' }} aria-label={`Star ${i + 1}`}>★</button>)}</div>
          {game.k > 0 && <div className="count-big" key={game.k}>{game.k}</div>}
        </>
      )}
      {phase === 'game' && game?.kind === 'pick' && (
        <>
          <div className="hint">{game.what === 'colours' ? 'Find this colour!' : `Find the ${game.target}!`} <span style={{ color: game.what === 'colours' ? COLOURS[game.target] : undefined, fontSize: '1.5em', verticalAlign: 'middle' }}>{game.what === 'colours' ? '●' : SHAPES[game.target]}</span></div>
          <div className="game-items">{game.options.map((o, i) => (
            <button key={o} className={`game-item bubble${game.wrong === o ? ' done' : ''}`} onClick={() => pickTap(o)} aria-label={o}
              style={game.what === 'colours' ? { background: COLOURS[o], animationDelay: `${i * 0.3}s` } : { color: SHAPE_COLOURS[i % 5], animationDelay: `${i * 0.3}s` }}>
              {game.what === 'shapes' ? SHAPES[o] : ''}
            </button>
          ))}</div>
        </>
      )}
      {phase === 'game' && game?.kind === 'peekaboo' && <div className="hint">{game.hidden ? `Where’s ${s.name}? Tap!` : 'Boo!'}</div>}

      {phase === 'play' && <div className="tools">{tools.map((t) => <button key={t.key} className="tool" onClick={t.on} aria-label={t.label} title={t.label}>{t.icon}</button>)}</div>}
      {phase === 'game' && <div className="tools"><button className="tool" onClick={() => endGame(false)} aria-label="Stop the game">🏠</button></div>}

      <div className="corner left">
        <button onClick={() => setMuted(!muted)} aria-label={muted ? 'Sound on' : 'Sound off'}>{muted ? '🔇' : '🔊'}</button>
        {!tv && s.tvPaired && <a href={`${base}/remote`} aria-label="Play on the TV">📺</a>}
      </div>
      <div className="corner right">
        <button onPointerDown={gateDown} onPointerUp={gateUp} onPointerLeave={gateUp} aria-label="Grown-ups: hold for 2 seconds" title="Grown-ups: hold for 2 seconds">🔒</button>
      </div>

      {fx.map((e) => e.kind === 'sparkles' ? (
        <div key={e.id} className="sparkles" style={{ position: 'absolute', left: '50%', top: '40%' }}>
          {Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ['--dx' as string]: `${Math.cos(i) * 180}px`, ['--dy' as string]: `${Math.sin(i * 1.3) * 160}px`, animationDelay: `${(i % 4) * 0.08}s` }} />)}
        </div>
      ) : e.kind === 'confetti' ? (
        <div key={e.id} className="confetti">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#EF5B5B', '#FFD23F', '#4C8DF6', '#3FB984', '#FF7EB6', '#9B6BDF'][i % 6], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${3 + (i % 5) * 0.3}s` }} />)}</div>
      ) : (
        <span key={e.id} className="note" style={{ left: `${e.x}%`, top: '45%' }}>♪</span>
      ))}

      {card && <div className="overlay"><div className="big-card"><h2>{card.title}</h2>{card.text && <p>{card.text}</p>}</div></div>}

      {phase === 'asleep' && (
        <div className="overlay dim">
          <button className="wake" onClick={wake} autoFocus>{s.today?.id === 'hatch' && s.today.isNew ? '🥚 Tap to meet your buddy' : `☀️ Wake up ${s.name}`}</button>
        </div>
      )}
    </div>
  );
}
