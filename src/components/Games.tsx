'use client';
import { useEffect, useRef, useState } from 'react';
import type { Action, Mood } from './Buddy';
import {
  BAND_INFO, COLOUR_HEX, countTarget, feedCountRound, makeRound, memoryCards, memoryPairs,
  type Ctx, type GameId, type Round, type Tile,
} from '@/lib/learning';
import { sounds } from '@/lib/sound';

export type GameApi = {
  say: (text: string) => void;                     // instructions and numbers (the device voice)
  talk: (text: string) => void;                    // QR's little voice
  word: (text: string, ms?: number) => void;       // one or two words on screen, briefly
  play: (fn: () => void) => void;                  // a sound, unless muted
  buddy: (a: Action, ms: number, m?: Mood) => Promise<void>;
  feed: (emoji: string) => Promise<void>;          // food flies to QR, QR eats it
  burst: (kind: 'sparkles' | 'confetti' | 'hearts') => void;
  done: (win: boolean) => void;
  repeat: React.MutableRefObject<(() => void) | null>; // tapping QR mid-game repeats the question
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const readLevel = (g: string) => { try { return Math.max(0, Math.min(2, Number(localStorage.getItem(`qb-lv-${g}`)) || 0)); } catch { return 0; } };
const saveLevel = (g: string, v: number) => { try { localStorage.setItem(`qb-lv-${g}`, String(Math.max(0, Math.min(2, v)))); } catch { /* private mode */ } };

const SHAPE_PATHS: Record<string, string> = {
  circle: 'M50 8a42 42 0 1 1 0 84a42 42 0 1 1 0-84z',
  square: 'M12 12h76v76H12z',
  triangle: 'M50 8l44 80H6z',
  star: 'M50 6l12 30 32 2-25 20 9 32-28-18-28 18 9-32L6 38l32-2z',
  heart: 'M50 88C20 66 6 50 6 32A22 22 0 0 1 50 22a22 22 0 0 1 44 10c0 18-14 34-44 56z',
  diamond: 'M50 6l38 44-38 44-38-44z',
};

export function TileView({ t }: { t: Tile }) {
  switch (t.kind) {
    case 'colour': return <span className="t-colour" style={{ background: COLOUR_HEX[t.value] }} />;
    case 'shape': return <svg viewBox="0 0 100 100" className="t-shape"><path d={SHAPE_PATHS[t.value]} fill={t.colour} stroke="rgba(46,33,64,.25)" strokeWidth="4" strokeLinejoin="round" /></svg>;
    case 'emoji': return <span className={`t-emoji${t.faded ? ' faded' : ''}`} style={t.size ? { fontSize: `${t.size}em` } : undefined}>{t.value}</span>;
    case 'text': return <span className="t-text">{t.value}</span>;
    case 'op': return <span className="t-op">{t.value}</span>;
    case 'group': return <span className={`t-group n${Math.min(t.n, 10)}`}>{Array.from({ length: t.n }, (_, i) => <i key={i}>{t.value}</i>)}</span>;
  }
}

export function Games({ game, ctx, api }: { game: GameId; ctx: Omit<Ctx, 'level'>; api: GameApi }) {
  const level = useRef(readLevel(game));
  const c: Ctx = { ...ctx, level: level.current };
  const firstTry = useRef(0);
  const rounds = BAND_INFO[ctx.band].rounds;

  // Adapt a little: all first-try right = a bit harder next time; lots of misses = a bit easier.
  const finish = async (win = true) => {
    if (firstTry.current >= rounds) saveLevel(game, level.current + 1);
    else if (firstTry.current <= rounds / 3) saveLevel(game, level.current - 1);
    api.done(win);
  };

  if (game === 'count') return <CountGame c={c} api={api} finish={finish} />;
  if (game === 'peekaboo') return <PeekGame rounds={rounds} api={api} finish={finish} />;
  if (game === 'memory') return <MemoryGame c={c} api={api} finish={finish} firstTry={firstTry} />;
  if (game === 'feedcount') return <FeedCountGame c={c} api={api} finish={finish} />;
  return <PickGame game={game} c={c} api={api} rounds={rounds} finish={finish} firstTry={firstTry} />;
}

type Fin = (win?: boolean) => Promise<void>;

/** The "pick the right one" games: colours, shapes, animals, letters, adding… */
function PickGame({ game, c, api, rounds, finish, firstTry }: { game: GameId; c: Ctx; api: GameApi; rounds: number; finish: Fin; firstTry: React.MutableRefObject<number> }) {
  const [round, setRound] = useState<Round | null>(null);
  const [no, setNo] = useState(1);
  const [wrong, setWrong] = useState<string[]>([]);
  const [reveal, setReveal] = useState(false);
  const lock = useRef(false);

  const ask = (r: Round) => { api.word(r.word, 2600); api.say(r.speak); };
  const next = () => {
    const r = makeRound(game, c);
    if (!r) return finish(false);
    setRound(r); setWrong([]); setReveal(false); lock.current = false;
    ask(r);
    api.repeat.current = () => ask(r);
  };
  useEffect(() => { next(); return () => { api.repeat.current = null; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function tap(key: string) {
    if (!round || lock.current || wrong.includes(key)) return;
    if (key !== round.answer) {
      api.play(sounds.oops);
      const w = [...wrong, key];
      setWrong(w);
      api.buddy('shake', 600, 'think');
      if (w.length >= 2 || w.length >= round.options.length - 1) { setReveal(true); api.say('Here it is!'); } // no failing: show the answer
      else api.talk('Try again!');
      return;
    }
    lock.current = true;
    if (!wrong.length) firstTry.current += 1;
    if (round.feeds) await api.feed(key);
    else { api.play(sounds.trill); api.word(['Yes!', 'Yay!', 'Great!', 'Woohoo!'][Math.floor(Math.random() * 4)], 1200); api.buddy('bounce', 1000, 'grin'); }
    await wait(1100);
    if (no >= rounds) return finish(true);
    setNo(no + 1);
    next();
  }

  if (!round) return null;
  return (
    <div className="game-area">
      {round.show.length > 0 && <div className="game-show">{round.show.map((t, i) => <TileView key={i} t={t} />)}</div>}
      <div className={`game-options n${round.options.length}`}>
        {round.options.map((o, i) => (
          <button key={o.key + i} className={`opt${wrong.includes(o.key) ? ' no' : ''}${reveal && o.key === round.answer ? ' hint' : ''}`} onClick={() => tap(o.key)} aria-label={o.key} style={{ animationDelay: `${i * 0.08}s` }}>
            <TileView t={o.tile} />
          </button>
        ))}
      </div>
      <Dots n={rounds} at={no} />
    </div>
  );
}

function Dots({ n, at }: { n: number; at: number }) {
  return <div className="game-dots" aria-hidden="true">{Array.from({ length: n }, (_, i) => <i key={i} className={i < at - 1 ? 'on' : i === at - 1 ? 'now' : ''} />)}</div>;
}

/** Tap each star and count along. Counts back down at the end once QR knows how. */
function CountGame({ c, api, finish }: { c: Ctx; api: GameApi; finish: Fin }) {
  const [n] = useState(() => countTarget(c));
  const [got, setGot] = useState<number[]>([]);
  const [k, setK] = useState(0);
  const [items] = useState(() => { const e = ['⭐', '🍎', '🎈', '🐟', '🌸'][Math.floor(Math.random() * 5)]; return Array.from({ length: n }, () => e); });
  useEffect(() => { api.word('Count!', 1600); api.say('Let’s count! Tap each one.'); api.repeat.current = () => api.say('Tap each one!'); return () => { api.repeat.current = null; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function tap(i: number) {
    if (got.includes(i)) return;
    const next = k + 1;
    setGot([...got, i]); setK(next);
    api.play(() => sounds.count(next));
    api.say(String(next));
    api.buddy('hop', 500);
    if (next === n) {
      await wait(800);
      if (c.ab.countBack && c.band !== '6+') {
        for (const x of [3, 2, 1]) { setK(x); api.play(() => sounds.count(x)); api.say(String(x)); await wait(750); }
        api.play(sounds.whoosh); api.word('Whee!', 1200); await api.buddy('jump', 1100, 'grin');
      } else api.word(`${n}!`, 1400);
      finish(true);
    }
  }
  return (
    <div className="game-area">
      <div className={`game-options count n${n > 10 ? 'many' : n}`}>
        {items.map((e, i) => <button key={i} className={`opt star${got.includes(i) ? ' got' : ''}`} onClick={() => tap(i)} aria-label={`Thing ${i + 1}`}>{e}</button>)}
      </div>
      {k > 0 && <div className="count-big" key={k}>{k}</div>}
    </div>
  );
}

/** QR hides its eyes; tap anywhere to find it. */
function PeekGame({ rounds, api, finish }: { rounds: number; api: GameApi; finish: Fin }) {
  const [round, setRound] = useState(1);
  const [hidden, setHidden] = useState(false);
  const hide = () => { setHidden(true); api.buddy('hide', 60000, 'happy'); api.play(sounds.hmm); };
  useEffect(() => { api.word('Peekaboo!', 1600); api.say('Where did I go?'); setTimeout(hide, 900); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function find() {
    if (!hidden) return;
    setHidden(false);
    api.buddy('giggle', 1200, 'grin');
    api.play(sounds.giggle); api.talk('Boo!'); api.word('Boo!', 1100);
    await wait(1500);
    if (round >= rounds) return finish(true);
    setRound(round + 1);
    await wait(500 + Math.random() * 1500);
    hide();
  }
  return <button className="peek-catch" onClick={find} aria-label="Find QR" />;
}

/** Turn over two cards; find the pairs. */
function MemoryGame({ c, api, finish, firstTry }: { c: Ctx; api: GameApi; finish: Fin; firstTry: React.MutableRefObject<number> }) {
  const [cards] = useState(() => memoryCards(memoryPairs(c)));
  const [open, setOpen] = useState<number[]>([]);
  const [done, setDone] = useState<number[]>([]);
  const misses = useRef(0);
  useEffect(() => { api.word('Pairs!', 1600); api.say('Find two the same!'); api.repeat.current = () => api.say('Find two the same!'); return () => { api.repeat.current = null; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function flip(i: number) {
    if (open.length === 2 || open.includes(i) || done.includes(i)) return;
    api.play(sounds.pop);
    const o = [...open, i];
    setOpen(o);
    if (o.length < 2) return;
    await wait(700);
    if (cards[o[0]] === cards[o[1]]) {
      api.play(sounds.trill); api.word('Match!', 1000); api.buddy('bounce', 900, 'grin');
      const d = [...done, ...o];
      setDone(d); setOpen([]);
      if (d.length === cards.length) {
        firstTry.current = misses.current <= cards.length / 2 ? 99 : 0;
        await wait(900); finish(true);
      }
    } else { misses.current += 1; setOpen([]); }
  }
  return (
    <div className="game-area">
      <div className={`game-options memory n${cards.length}`}>
        {cards.map((e, i) => (
          <button key={i} className={`opt card${open.includes(i) || done.includes(i) ? ' up' : ''}${done.includes(i) ? ' got' : ''}`} onClick={() => flip(i)} aria-label="Card">
            <span>{open.includes(i) || done.includes(i) ? e : '❔'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** "Feed me 3 apples!": tap the food that many times. */
function FeedCountGame({ c, api, finish }: { c: Ctx; api: GameApi; finish: Fin }) {
  const [r] = useState(() => feedCountRound(c));
  const [k, setK] = useState(0);
  const busy = useRef(false);
  useEffect(() => { api.word(`${r.n} ${r.food}?`, 2600); api.say(r.speak); api.repeat.current = () => { api.word(`${r.n} ${r.food}?`, 2000); api.say(r.speak); }; return () => { api.repeat.current = null; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function feed() {
    if (busy.current || k >= r.n) return;
    busy.current = true;
    const next = k + 1;
    setK(next);
    api.say(String(next));
    await api.feed(r.food);
    busy.current = false;
    if (next === r.n) { api.word(`${r.n}!`, 1200); api.play(sounds.cheer); await wait(900); finish(true); }
  }
  return (
    <div className="game-area">
      <div className="game-show"><span className="t-text">{r.n}</span><span className="t-emoji">{r.food}</span></div>
      <div className="game-options n1"><button className="opt food-big" onClick={feed} aria-label="Feed">{r.food}</button></div>
      <Dots n={r.n} at={k + 1} />
    </div>
  );
}
