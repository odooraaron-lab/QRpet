'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Buddy, type Action, type Mood } from './Buddy';
import { Egg } from './Egg';
import { Games, type GameApi } from './Games';
import { ParentGate } from './ParentGate';
import { ITEM, type Abilities } from '@/lib/growth';
import { COLOUR_HEX, GAMES, SNACKS, gamesFor, type Band, type GameId } from '@/lib/learning';
import { sounds, playSong, say, talk, unlockAudio } from '@/lib/sound';

export type BuddyState = {
  slug: string; name: string; colour: string; childName: string; status: string; ageBand: string;
  visitDay: number; today: { id: string; title: string; isNew: boolean } | null;
  learned: string[]; abilities: Abilities; messages: string[];
  settings: { sessionMinutes: number; volume: 'low' | 'medium' | 'high'; readAloud: boolean; games: Record<string, boolean>; accessory: string | null };
  bedtimeNow: boolean; capReached: boolean; commandSince: number; tvPaired: boolean;
};

// sleep: first screen, tap to wake · egg: not hatched yet · intro: saying hello · play · feed: snack tray open
// picker: choosing a game · game · nap: bedtime or play time used up (wakes for a moment, then sleeps again)
// doze: fell asleep from no one playing (a tap wakes it properly)
type Phase = 'sleep' | 'egg' | 'intro' | 'play' | 'feed' | 'picker' | 'game' | 'nap' | 'doze';
type Fx = { id: number; kind: 'sparkles' | 'confetti' | 'note' | 'hearts' | 'bubble' | 'fly' | 'mail' | 'zzz'; x: number; y: number; e?: string; dx?: number; dy?: number; c?: string };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const SONG_OF: Record<string, string> = { 'song-hello': 'hello', 'song-star': 'star', 'song-rain': 'rain', 'song-goodnight': 'goodnight' };
const MOVE_ACTION: Record<string, Action> = { wave: 'wave', bounce: 'bounce', clap: 'clap', spin: 'spin', dance: 'dance', jump: 'jump', hug: 'hug' };
const HATCH_TAPS = 8;
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

/** One or two words for today's new thing. */
function newWord(id: string) {
  const [kind, value] = id.split(/-(.*)/);
  if (kind === 'colour' || kind === 'shape') return `${cap(value)}!`;
  if (kind === 'count' && Number(value)) return Array.from({ length: Math.min(Number(value), 5) }, (_, i) => i + 1).join(' ') + (Number(value) > 5 ? '…' : '');
  if (kind === 'feel') return `${cap(value)}!`;
  return 'Ta-da!';
}

export function Player({ initial, base, tv = false }: { initial: BuddyState; base: string; tv?: boolean }) {
  const [s, setS] = useState(initial);
  const a = s.abilities;
  const band = (['2-3', '4-5', '6+'].includes(s.ageBand) ? s.ageBand : '4-5') as Band;
  // Hatching day: the hatch plays once per device (remembered in the browser, so checked after the first render).
  const [hatchSeen, setHatchSeen] = useState(!(s.today?.id === 'hatch' && s.today.isNew));
  const firstHatch = s.today?.id === 'hatch' && !hatchSeen;
  const startsAsEgg = !a.hatched || firstHatch;

  const [phase, setPhase] = useState<Phase>(s.bedtimeNow || s.capReached ? 'nap' : 'sleep');
  const [mood, setMood] = useState<Mood>('asleep');
  const [action, setAction] = useState<Action>('idle');
  const [glow, setGlow] = useState(false);
  const [fx, setFx] = useState<Fx[]>([]);
  const [words, setWords] = useState<{ id: number; text: string; ms: number }[]>([]);
  const [game, setGame] = useState<GameId | null>(null);
  const [egg, setEgg] = useState({ taps: 0, wobble: 0, glow: false, crack: Math.max(0, (firstHatch ? 3 : a.eggDay) - 1) });
  const [eggMode, setEggMode] = useState(startsAsEgg);
  const [full, setFull] = useState(0);

  const phaseRef = useRef(phase); phaseRef.current = phase;
  useEffect(() => {
    if (s.today?.id !== 'hatch') return;
    const seen = seenHatch(s.slug);
    setHatchSeen(seen);
    if (!seen) { setEggMode(true); setEgg((e) => ({ ...e, crack: 2 })); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const busy = useRef(false);
  const lastInput = useRef(Date.now());
  const played = useRef(0);
  const since = useRef(initial.commandSince);
  const actSeq = useRef(0);
  const lastReaction = useRef(-1);
  const stageRef = useRef<HTMLDivElement>(null);
  const repeat = useRef<(() => void) | null>(null);
  const wakeLock = useRef<{ release: () => Promise<void> } | null>(null);

  const knows = (id: string) => s.learned.includes(id);
  const accessory = s.settings.accessory && a.dress.includes(s.settings.accessory) ? s.settings.accessory : a.dress.at(-1) ?? null;
  const games = gamesFor(band, s.visitDay, s.settings.games);

  // ── little helpers ──
  const play = useCallback((fn: () => void) => { try { fn(); } catch { /* no audio */ } }, []);
  const addFx = useCallback((f: Omit<Fx, 'id'>, ms = 2600) => {
    const id = Math.random();
    setFx((l) => [...l, { ...f, id }]);
    setTimeout(() => setFx((l) => l.filter((e) => e.id !== id)), ms);
  }, []);
  const burst = useCallback((kind: 'sparkles' | 'confetti' | 'hearts') => addFx({ kind, x: 50, y: 42 }, kind === 'confetti' ? 4200 : 2200), [addFx]);
  /** One or two words, big, no background, for a moment. */
  const word = useCallback((text: string, ms = 1500) => {
    const id = Math.random();
    setWords([{ id, text, ms }]);
    setTimeout(() => setWords((w) => w.filter((x) => x.id !== id)), ms);
  }, []);
  /** Plays a move, then back to idle (unless another move started meanwhile). */
  const act = useCallback(async (next: Action, ms = 1600, m?: Mood) => {
    const my = ++actSeq.current;
    if (m) setMood(m);
    setAction(next);
    await wait(ms);
    if (actSeq.current === my) setAction('idle');
  }, []);

  const mouth = () => {
    const r = stageRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.58 } : { x: window.innerWidth / 2, y: window.innerHeight * 0.6 };
  };
  /** A snack flies from `from` into QR's mouth; QR munches. */
  const feedOne = useCallback(async (e: string, from?: { x: number; y: number }) => {
    const start = from ?? { x: window.innerWidth / 2, y: window.innerHeight * 0.92 };
    const m = mouth();
    addFx({ kind: 'fly', e, x: start.x, y: start.y, dx: m.x - start.x, dy: m.y - start.y }, 700);
    setMood('surprised');
    await wait(560);
    play(sounds.chomp);
    await act('eat', 900, 'sing');
    if (e === '🥦' && Math.random() < 0.6) { setMood('think'); word('Hmm…', 900); await wait(800); }
    play(sounds.yum);
    if (e === '🍪') { burst('sparkles'); word('Cookie!', 1100); }
    else if (e === '🥛') word('Ahh!', 1000);
    else word(pick(['Yum!', 'Mmm!', 'Crunch!', 'Yummy!']), 1000);
    talk(pick(['Yum!', 'Mmm!', 'Yummy!']));
    setMood('grin');
    await wait(400);
    setMood('happy');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, addFx, burst, play, word]);

  const sing = useCallback(async (songId?: string) => {
    const learnedSongs = s.learned.map((id) => SONG_OF[id]).filter(Boolean);
    const id = songId ?? (learnedSongs.length ? pick(learnedSongs) : 'name');
    setMood('sing'); setAction('sway');
    const ms = playSong(id, (i) => { if (i % 2 === 0) addFx({ kind: 'note', x: 25 + Math.random() * 50, y: 45 }, 2400); });
    await wait(ms);
    setMood('happy'); setAction('idle');
  }, [s.learned, addFx]);

  // ── keep the screen on while playing (phones and tablets) ──
  useEffect(() => {
    const awake = ['egg', 'intro', 'play', 'feed', 'picker', 'game'].includes(phase);
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (awake && !wakeLock.current && nav.wakeLock) nav.wakeLock.request('screen').then((l) => { wakeLock.current = l; }).catch(() => {});
    if (!awake && wakeLock.current) { wakeLock.current.release().catch(() => {}); wakeLock.current = null; }
  }, [phase]);

  // ── waking up ──
  async function wakeFromSleep() {
    unlockAudio(s.settings.volume);
    lastInput.current = Date.now();
    if (eggMode) return startEgg();
    await intro();
  }

  async function startEgg() {
    setPhase('egg');
    play(sounds.knock);
    setEgg((e) => ({ ...e, wobble: e.wobble + 1 }));
    if (firstHatch) { word('Crack?', 1400); say('Tap tap tap! Something is happening!'); return; }
    if (s.today?.isNew && a.eggDay > 1) {
      await wait(900);
      play(sounds.sparkle);
      setEgg((e) => ({ ...e, crack: a.eggDay - 1, glow: true, wobble: e.wobble + 1 }));
      word('Crack!', 1300);
      await wait(1400);
      setEgg((e) => ({ ...e, glow: false }));
    }
    if (s.messages.length) await showMessages();
  }

  async function tapEgg() {
    lastInput.current = Date.now();
    if (phaseRef.current !== 'egg') return;
    if (firstHatch) {
      const taps = egg.taps + 1;
      setEgg((e) => ({ ...e, taps, wobble: e.wobble + 1, crack: Math.min(6, 2 + Math.ceil((taps / HATCH_TAPS) * 4)) }));
      play(() => sounds.count(taps));
      if (taps < HATCH_TAPS) return;
      return hatch();
    }
    // Not hatching yet: a wobble and a surprise each tap.
    setEgg((e) => ({ ...e, wobble: e.wobble + 1 }));
    const r = Math.floor(Math.random() * 5);
    if (r === 0) { play(sounds.knock); }
    else if (r === 1) { play(sounds.giggle); }
    else if (r === 2) { play(sounds.kiss); burst('hearts'); }
    else if (r === 3) { play(sounds.sparkle); setEgg((e) => ({ ...e, glow: true })); setTimeout(() => setEgg((e) => ({ ...e, glow: false })), 1200); }
    else { play(() => sounds.bubble()); addFx({ kind: 'note', x: 40 + Math.random() * 20, y: 50 }, 2400); }
    if (Math.random() < 0.2) word('Soon!', 1100);
  }

  /** Tapping the egg at bedtime: a sleepy wobble, nothing more. */
  function nudgeEgg() {
    unlockAudio(s.settings.volume);
    setEgg((e) => ({ ...e, wobble: e.wobble + 1 }));
    play(sounds.yawn);
    word('Shh…', 1200);
  }

  async function hatch() {
    busy.current = true;
    play(sounds.hatch);
    await wait(700);
    burst('sparkles'); burst('confetti');
    markHatched(s.slug);
    setEggMode(false);
    setPhase('intro'); setMood('surprised');
    await wait(300);
    await act('bounce', 1800, 'grin');
    word(`Hi${s.childName ? ` ${s.childName}` : ''}!`, 1800);
    talk(s.childName ? `Hi ${s.childName}!` : 'Hi!');
    await wait(1600);
    word(`I’m ${s.name}!`, 1600);
    say(`I’m ${s.name}!`);
    await wait(1800);
    if (s.messages.length) await showMessages();
    busy.current = false;
    setMood('happy'); setPhase('play');
  }

  async function intro() {
    busy.current = true;
    setPhase('intro'); setMood('sleepy');
    await wait(500);
    play(sounds.boop); setMood('surprised');
    await wait(400);
    if (s.bedtimeNow) { busy.current = false; return goNap('bedtime'); }
    await act(knows('move-wave') ? 'wave' : 'bounce', 1600, 'grin');
    word(s.childName ? `Hi ${s.childName}!` : 'Hi!', 1600);
    talk(s.childName ? `Hi ${s.childName}!` : 'Hi!');
    setMood('happy');
    await wait(1000);
    if (s.today?.isNew && s.today.id !== 'hatch' && ITEM[s.today.id]) await reveal(s.today.id);
    if (s.messages.length) await showMessages();
    busy.current = false;
    if (s.capReached) return goNap('time');
    setPhase('play');
  }

  /** Today's new thing: a sparkle, a ding, then QR shows it off. */
  async function reveal(id: string) {
    setGlow(true); setMood('think');
    play(sounds.sparkle); burst('sparkles');
    await wait(1300);
    play(sounds.ding); setMood('surprised'); setGlow(false);
    word(newWord(id), 1800);
    const [kind, value] = id.split(/-(.*)/);
    if (kind === 'move' && MOVE_ACTION[value]) await act(MOVE_ACTION[value], 2000, 'grin');
    else if (kind === 'sound') { const f = (sounds as unknown as Record<string, () => void>)[value]; if (f) play(f); await act('hop', 900, 'grin'); }
    else if (kind === 'count' && Number(value)) { for (let k = 1; k <= Number(value); k++) { play(() => sounds.count(k)); say(String(k)); await wait(520); } }
    else if (kind === 'colour') { say(value); addFx({ kind: 'bubble', x: 50, y: 30, c: COLOUR_HEX[value] }, 1800); await act('bounce', 1400, 'grin'); }
    else if (kind === 'shape') { say(value); await act('bounce', 1400, 'grin'); }
    else if (kind === 'song') await sing(SONG_OF[id]);
    else { play(sounds.trill); await act('bounce', 1600, 'grin'); }
    setMood('happy');
  }

  /** Parent messages: an envelope pops, QR reads it out loud. No text on screen. */
  async function showMessages() {
    for (const m of s.messages) {
      addFx({ kind: 'mail', x: 50, y: 28 }, 3000);
      play(sounds.trill); burst('hearts');
      await wait(700);
      say(m);
      await act('bounce', 1600, 'grin');
      await wait(Math.min(6000, 1200 + m.length * 60));
    }
  }

  // ── sleeping ──
  const goNap = useCallback(async (why: 'time' | 'bedtime') => {
    setGame(null); setPhase('nap');
    if (why === 'bedtime') { setMood('sleepy'); playSong('lullaby'); await wait(3200); }
    else { play(sounds.yawn); await act('wave', 2000, 'happy'); setMood('sleepy'); await wait(1200); }
    setMood('asleep'); setAction('idle');
  }, [act, play]);

  /** Tapping QR while it's asleep for the night: a sleepy hello, then straight back to sleep. */
  const drowsy = useRef(false);
  async function nudgeNap() {
    if (drowsy.current) { burst('hearts'); return; }
    drowsy.current = true;
    unlockAudio(s.settings.volume);
    setMood('sleepy'); play(sounds.yawn);
    await wait(900);
    await act('wave', 1400, 'sleepy');
    word('Shh…', 1400);
    talk(pick(['Night night', 'Sleepy…', 'Shh…']));
    await wait(2200);
    setMood('asleep');
    drowsy.current = false;
  }

  // ── touching QR: a different surprise every time ──
  const REACTIONS: (() => Promise<void>)[] = [
    async () => { play(sounds.giggle); word('Hee hee!', 1100); talk('Hee hee!'); await act('giggle', 1200, 'grin'); },
    async () => { play(sounds.boing); await act('jump', 1100, 'surprised'); },
    async () => { play(sounds.whoosh); burst('sparkles'); await act('spin', 1100, 'grin'); },
    async () => { const t = s.childName ? `Hi ${s.childName}!` : 'Hello!'; word(t, 1300); talk(t); await act('wave', 1600, 'grin'); },
    async () => { setMood('surprised'); await wait(500); play(sounds.achoo); word('Achoo!', 1100); await act('hop', 600, 'grin'); },
    async () => { play(sounds.kiss); burst('hearts'); await act('hug', 1300, 'shy'); },
    async () => { play(sounds.trill); await act(knows('move-dance') ? 'dance' : 'bounce', 1800, 'grin'); },
    async () => { const n = Math.min(3, Math.max(2, a.countTo)); for (let k = 1; k <= n; k++) { play(() => sounds.count(k)); say(String(k)); setAction('hop'); await wait(520); } word('Whee!', 1000); setAction('idle'); },
    async () => { const cs = a.colours.length ? a.colours : ['red', 'blue', 'yellow']; const c = pick(cs.filter((x) => COLOUR_HEX[x])) ?? 'blue'; addFx({ kind: 'bubble', x: 50, y: 30, c: COLOUR_HEX[c] }, 1800); word(`${cap(c)}!`, 1200); say(c); await act('bounce', 900, 'grin'); },
    async () => { setGlow(true); play(sounds.sparkle); await act('float', 1500, 'proud'); setGlow(false); },
    async () => { play(sounds.pop); word('Boop!', 900); talk('Boop!'); await act('hop', 700, 'surprised'); },
    async () => { playSong('name', (i) => addFx({ kind: 'note', x: 35 + i * 8, y: 45 }, 2200)); await act('sway', 1300, 'sing'); },
  ];
  async function touchBuddy() {
    lastInput.current = Date.now();
    const p = phaseRef.current;
    if (p === 'nap') return nudgeNap();
    if (p === 'sleep') return wakeFromSleep();
    if (p === 'doze') { play(sounds.boop); setPhase('play'); word('Hi!', 900); talk('Hi!'); await act('bounce', 900, 'grin'); return; }
    if (p === 'game') { repeat.current?.(); return; }
    if (p === 'feed') { play(sounds.giggle); return; }
    if (p !== 'play' || busy.current) return;
    busy.current = true;
    let i = Math.floor(Math.random() * REACTIONS.length);
    if (i === lastReaction.current) i = (i + 1) % REACTIONS.length;
    lastReaction.current = i;
    try { await REACTIONS[i](); } finally { setMood('happy'); busy.current = false; }
  }

  /** Tapping the room itself: a bubble pops with a note (cause and effect for the littlest ones). */
  function tapRoom(e: React.PointerEvent) {
    lastInput.current = Date.now();
    const p = phaseRef.current;
    if (p === 'sleep') { wakeFromSleep(); return; }
    if (p === 'nap') { nudgeNap(); return; }
    if (p === 'doze') { touchBuddy(); return; }
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList?.contains('floor')) return;
    if (!['play', 'egg'].includes(p)) return;
    play(() => sounds.bubble());
    const hues = Object.values(COLOUR_HEX);
    addFx({ kind: 'bubble', x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100, c: pick(hues) }, 900);
  }

  // ── feeding ──
  async function openFeed() {
    lastInput.current = Date.now();
    if (busy.current) return;
    if (full >= 6) { play(sounds.burp); word('Full!', 1100); talk('I’m full!'); await act('shake', 900, 'grin'); return; }
    setPhase('feed');
    word('Hungry!', 1100); talk('Hungry!');
  }
  async function feedTap(e: string, ev: React.MouseEvent) {
    lastInput.current = Date.now();
    if (busy.current) return;
    busy.current = true;
    const r = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    await feedOne(e, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const f = full + 1;
    setFull(f);
    busy.current = false;
    if (f >= 6) {
      await wait(300);
      play(sounds.burp); word('Full!', 1300); talk('I’m full!');
      await act('shake', 1000, 'grin');
      setPhase('play');
      setTimeout(() => setFull(0), 90_000);
    }
  }

  // ── games ──
  function startGame(id: GameId) {
    lastInput.current = Date.now();
    busy.current = false;
    setGame(id); setPhase('game'); setMood('happy'); setAction('idle');
  }
  const gameApi: GameApi = {
    say, talk, word, play, buddy: act, repeat,
    feed: (e) => feedOne(e),
    burst,
    done: async (win) => {
      setGame(null); setPhase('play');
      if (win) { play(sounds.cheer); burst('confetti'); word(pick(['Well done!', 'Hooray!', 'You did it!']), 1500); talk('Hooray!'); await act('dance', 2200, 'grin'); }
      setMood('happy');
    },
  };

  // ── commands from the parent page and the TV remote ──
  const runCommand = useCallback(async (c: string) => {
    const p = phaseRef.current;
    if (c === 'bedtime') return goNap('bedtime');
    if (['sleep', 'nap', 'egg', 'intro'].includes(p)) return;
    lastInput.current = Date.now();
    if (p === 'doze') setPhase('play');
    if (c === 'hello') { play(sounds.boop); word('Hello!', 1200); talk('Hello!'); return act('wave', 1800, 'grin'); }
    if (c === 'sing') return sing();
    if (c === 'dance') { play(sounds.trill); return act('dance', 3000, 'grin'); }
    if (c === 'hug') { burst('hearts'); return act('hug', 1500, 'grin'); }
    if (c === 'well-done') { play(sounds.cheer); burst('confetti'); word('Well done!', 1800); talk('Well done!'); await act('jump', 2000, 'proud'); return; }
    if (c === 'birthday') {
      burst('confetti'); word('Happy birthday!', 2200);
      talk(s.childName ? `Happy birthday ${s.childName}!` : 'Happy birthday!');
      await sing('birthday'); await act('dance', 2400, 'grin'); return;
    }
    const wanted = c === 'count' ? 'count' : c === 'peekaboo' ? 'peekaboo' : c === 'colours' ? 'colours' : c === 'shapes' ? 'shapes' : null;
    if (wanted) { setGame(null); await wait(50); startGame(games.includes(wanted as GameId) ? (wanted as GameId) : 'count'); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [act, goNap, sing, burst, word, s.childName, games.join()]);

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

  // ── idle life, dozing off, play time and the session limit ──
  useEffect(() => {
    const iv = setInterval(() => {
      const p = phaseRef.current;
      if (['play', 'game', 'feed', 'picker', 'egg'].includes(p)) played.current += 1;
      if (played.current > 0 && played.current % 30 === 0) fetch(`${base}/api/ping`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ seconds: 30 }) }).catch(() => {});
      if (['play', 'egg'].includes(p) && s.settings.sessionMinutes > 0 && played.current >= s.settings.sessionMinutes * 60) { goNap('time'); return; }
      const idle = Date.now() - lastInput.current;
      if (p === 'play' && !busy.current && idle > 120_000) { setPhase('doze'); setMood('asleep'); setAction('idle'); return; }
      if (p !== 'play' || busy.current) return;
      if (Math.random() < 0.12) {
        const el = document.querySelector('.world .qb') as HTMLElement | null;
        el?.style.setProperty('--look-x', `${Math.round(Math.random() * 10 - 5)}px`);
        el?.style.setProperty('--look-y', `${Math.round(Math.random() * 6 - 3)}px`);
      }
      if (Math.random() < 0.05) {
        const moves = a.moves.map((m) => MOVE_ACTION[m]).filter(Boolean);
        busy.current = true;
        act(moves.length ? pick(moves) : 'hop', 1600, 'grin').finally(() => { setMood('happy'); busy.current = false; });
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [base, s.settings.sessionMinutes, goNap, a.moves, act]);

  // Zzz while asleep.
  useEffect(() => {
    if (!['sleep', 'nap', 'doze'].includes(phase)) return;
    const iv = setInterval(() => { if (mood === 'asleep' || phase === 'sleep') addFx({ kind: 'zzz', x: 58 + Math.random() * 6, y: eggMode ? 48 : 40 }, 2600); }, 1800);
    return () => clearInterval(iv);
  }, [phase, mood, addFx, eggMode]);

  const room = new Set(a.room);
  const night = s.bedtimeNow || phase === 'nap';
  const showEgg = eggMode && phase !== 'intro';
  const sleeping = phase === 'sleep' || phase === 'nap' || phase === 'doze';

  return (
    <div className={`world${night ? ' night' : ''}${['play', 'feed', 'picker', 'egg'].includes(phase) ? ' has-tools' : ''}${phase === 'game' ? ' in-game' : ''}${phase === 'feed' ? ' feeding' : ''}`} onPointerDown={tapRoom}>
      {room.has('window') && <div className="window"><div className="sun" /><div className="cloud-bit" />{room.has('rainbow') && <div className="rainbow" />}</div>}
      {room.has('rug') && <div className="shelf"><div className="toys">{['🧸', '🎈', knows('room-plant') ? '🪀' : '', room.has('milestone-60') ? '🏅' : ''].filter(Boolean).map((t) => <span key={t}>{t}</span>)}</div></div>}
      {room.has('stars') && [8, 22, 38, 61, 77, 90].map((x, i) => <span key={x} className="ceiling-star" style={{ left: `${x}%`, top: `${4 + (i % 3) * 4}%`, animationDelay: `${i * 0.4}s` }}>★</span>)}
      {room.has('bunting') && <div className="bunting">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: `${i * 7.4}%`, ['--c' as string]: ['#EF5B5B', '#FFD23F', '#4C8DF6', '#3FB984'][i % 4] }} />)}</div>}
      <div className="floor" />
      {room.has('plant') && <div className="plant">🪴</div>}
      {room.has('moon') && <div className="moon" />}

      {showEgg ? (
        <button className={`egg${phase === 'sleep' ? ' resting' : ''}`} onClick={(e) => { e.stopPropagation(); if (phase === 'sleep') wakeFromSleep(); else if (phase === 'nap') nudgeEgg(); else tapEgg(); }} onPointerDown={(e) => e.stopPropagation()} aria-label="The egg">
          <Egg crack={egg.crack} peek={egg.crack >= 2} wobble={egg.wobble} glow={egg.glow} colour={Object.values(COLOUR_HEX)[s.slug.length % 7]} />
          <span className="egg-days" aria-hidden="true">{[1, 2, 3, 4].map((d) => <i key={d} className={d <= a.eggDay ? 'on' : ''} />)}</span>
        </button>
      ) : (
        <div className="stage" ref={stageRef} onPointerDown={(e) => e.stopPropagation()}>
          {room.has('rug') && <div className="rug" />}
          <Buddy colour={s.colour} mood={sleeping && phase !== 'doze' && mood !== 'sleepy' ? 'asleep' : mood} action={action} accessory={accessory} glow={glow} scale={a.stage.scale} sticker={room.has('milestone-30')} onTummy={touchBuddy} onHead={touchBuddy} />
        </div>
      )}

      {phase === 'game' && game && <Games key={game} game={game} ctx={{ band, ab: a }} api={gameApi} />}

      {(phase === 'play' || phase === 'egg') && (
        <div className="tools" onPointerDown={(e) => e.stopPropagation()}>
          {phase === 'play' && <button className="tool" onClick={openFeed} aria-label="Feed">🍎</button>}
          {phase === 'play' && games.length > 0 && <button className="tool" onClick={() => { lastInput.current = Date.now(); setPhase('picker'); }} aria-label="Games">🎲</button>}
          <button className="tool" onClick={() => { lastInput.current = Date.now(); if (busy.current) return; busy.current = true; if (phase === 'egg') setEgg((e) => ({ ...e, wobble: e.wobble + 1 })); sing().finally(() => { busy.current = false; }); }} aria-label="Sing">🎵</button>
        </div>
      )}
      {phase === 'feed' && (
        <div className="tray" onPointerDown={(e) => e.stopPropagation()}>
          {SNACKS.map((e) => <button key={e} className="snack" onClick={(ev) => feedTap(e, ev)} aria-label="Snack">{e}</button>)}
          <button className="snack home" onClick={() => setPhase('play')} aria-label="Done">✔️</button>
        </div>
      )}
      {phase === 'picker' && (
        <div className="picker" onPointerDown={(e) => e.stopPropagation()}>
          {games.map((g) => <button key={g} className="tool" onClick={() => startGame(g)} aria-label={GAMES[g].name}>{GAMES[g].icon}</button>)}
          <button className="tool home" onClick={() => setPhase('play')} aria-label="Back">🏠</button>
        </div>
      )}
      {phase === 'game' && <div className="tools corner-home" onPointerDown={(e) => e.stopPropagation()}><button className="tool small" onClick={() => { setGame(null); setPhase('play'); }} aria-label="Stop the game">🏠</button></div>}

      <div className="words" aria-live="polite">{words.map((w) => <span key={w.id} style={{ animationDuration: `${w.ms}ms` }}>{w.text}</span>)}</div>

      <div className="fx" aria-hidden="true">
        {fx.map((e) => {
          const pos = { left: `${e.x}%`, top: `${e.y}%` };
          switch (e.kind) {
            case 'sparkles': return <div key={e.id} className="sparkles" style={pos}>{Array.from({ length: 16 }, (_, i) => <i key={i} style={{ ['--dx' as string]: `${Math.cos(i) * 180}px`, ['--dy' as string]: `${Math.sin(i * 1.3) * 160}px`, animationDelay: `${(i % 4) * 0.08}s` }} />)}</div>;
            case 'hearts': return <div key={e.id} className="hearts" style={pos}>{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ ['--dx' as string]: `${(i - 3) * 38}px`, animationDelay: `${i * 0.09}s` }}>♥</i>)}</div>;
            case 'confetti': return <div key={e.id} className="confetti">{Array.from({ length: 36 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#EF5B5B', '#FFD23F', '#4C8DF6', '#3FB984', '#FF7EB6', '#9B6BDF'][i % 6], animationDelay: `${(i % 9) * 0.12}s`, animationDuration: `${3 + (i % 5) * 0.3}s` }} />)}</div>;
            case 'note': return <span key={e.id} className="note" style={pos}>♪</span>;
            case 'bubble': return <span key={e.id} className="bubble-pop" style={{ ...pos, background: e.c }} />;
            case 'fly': return <span key={e.id} className="fly" style={{ left: e.x, top: e.y, ['--dx' as string]: `${e.dx}px`, ['--dy' as string]: `${e.dy}px` }}>{e.e}</span>;
            case 'mail': return <span key={e.id} className="mail" style={pos}>💌</span>;
            case 'zzz': return <span key={e.id} className="zzz" style={pos}>z</span>;
          }
        })}
      </div>

      {!tv && <ParentGate base={base} />}
      {phase === 'sleep' && <div className="tap-hint" aria-hidden="true">👆</div>}
    </div>
  );
}

// The hatching animation plays once per device, the first time the buddy is opened after it hatches.
function seenHatch(slug: string) { try { return localStorage.getItem(`qb-hatched-${slug}`) === '1'; } catch { return false; } }
function markHatched(slug: string) { try { localStorage.setItem(`qb-hatched-${slug}`, '1'); } catch { /* private mode */ } }
