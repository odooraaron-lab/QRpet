// ─────────────────────────────────────────────────────────────
// WHAT QR TEACHES, BY AGE
// The parent picks an age band (2-3, 4-5, 6+). Each band gets its own set of games, number ranges and
// number of choices, loosely following early-years milestones (see docs/RESEARCH.md):
//   2-3  cause and effect, 2 big choices: colours, shapes, animal sounds, big/small, counting to 3-5,
//        peekaboo (object permanence), feeding by colour.
//   4-5  3 choices: counting to 10, "how many" (seeing small groups at a glance), more/fewer, patterns,
//        letters, memory pairs, feeding a number of things, odd one out.
//   6+   4 choices: counting to 20, adding and taking away within 10, patterns of three, first sounds
//        of words, memory, odd one out.
// Games appear one by one over the first couple of weeks after hatching, so there's always something new.
// Everything is spoken; the screen shows one or two words at most. Nothing ever fails: after two wrong
// taps QR shows the answer and cheers anyway. Safe to import in the browser.
// ─────────────────────────────────────────────────────────────
import type { Abilities } from './growth';

export type Band = '2-3' | '4-5' | '6+';
export const BANDS: Band[] = ['2-3', '4-5', '6+'];
export const bandOf = (s: string | null | undefined): Band => (BANDS.includes(s as Band) ? (s as Band) : '4-5');

export type GameId =
  | 'count' | 'peekaboo' | 'colours' | 'shapes' | 'animals' | 'bigsmall' | 'feedcolour'
  | 'howmany' | 'moreless' | 'pattern' | 'letters' | 'memory' | 'feedcount' | 'oddone'
  | 'add' | 'takeaway' | 'firstsound';

export const GAMES: Record<GameId, { icon: string; name: string; skill: string }> = {
  count: { icon: '⭐', name: 'Counting stars', skill: 'Counting, one tap for each number' },
  peekaboo: { icon: '🙈', name: 'Peekaboo', skill: 'Anticipation and object permanence' },
  colours: { icon: '🎨', name: 'Colour pop', skill: 'Naming colours' },
  shapes: { icon: '🔺', name: 'Shape find', skill: 'Naming shapes' },
  animals: { icon: '🐮', name: 'Who says moo?', skill: 'Animal names and sounds, listening' },
  bigsmall: { icon: '🐘', name: 'Big and small', skill: 'Comparing size' },
  feedcolour: { icon: '🍓', name: 'Colour snack', skill: 'Matching colours to food' },
  howmany: { icon: '🔢', name: 'How many?', skill: 'Seeing small groups at a glance (subitising), matching numbers' },
  moreless: { icon: '⚖️', name: 'More or fewer', skill: 'Comparing amounts' },
  pattern: { icon: '🔁', name: 'What’s next?', skill: 'Patterns (early algebra)' },
  letters: { icon: '🔤', name: 'Letter find', skill: 'Letter names and sounds' },
  memory: { icon: '🃏', name: 'Memory pairs', skill: 'Memory and matching' },
  feedcount: { icon: '🍎', name: 'Snack count', skill: 'Counting out a number of things' },
  oddone: { icon: '🔍', name: 'Odd one out', skill: 'Sorting and spotting differences' },
  add: { icon: '➕', name: 'Adding up', skill: 'Adding within 10' },
  takeaway: { icon: '➖', name: 'Take away', skill: 'Taking away within 10' },
  firstsound: { icon: '🗣️', name: 'First sounds', skill: 'Hearing the first sound of a word (phonics)' },
};

/** Which games each band gets, and on which visit day each one appears (the egg hatches on day 4). */
export const BAND_GAMES: Record<Band, Partial<Record<GameId, number>>> = {
  '2-3': { count: 4, peekaboo: 5, colours: 6, animals: 7, bigsmall: 9, shapes: 10, feedcolour: 12 },
  '4-5': { count: 4, colours: 4, howmany: 5, peekaboo: 5, shapes: 6, moreless: 7, letters: 8, feedcount: 9, pattern: 10, memory: 12, oddone: 14 },
  '6+': { count: 4, howmany: 4, add: 5, peekaboo: 5, memory: 6, feedcount: 6, pattern: 7, firstsound: 8, takeaway: 10, oddone: 11 },
};

export const BAND_INFO: Record<Band, { label: string; choices: number; rounds: number; about: string }> = {
  '2-3': { label: 'Ages 2 to 3', choices: 2, rounds: 3, about: 'Two big choices at a time. Colours, shapes, animal sounds, big and small, counting to 5, peekaboo and feeding.' },
  '4-5': { label: 'Ages 4 to 5', choices: 3, rounds: 4, about: 'Three choices. Counting to 10, how many, more or fewer, patterns, letters, memory pairs and odd one out.' },
  '6+': { label: 'Ages 6 and up', choices: 4, rounds: 5, about: 'Four choices. Counting to 20, adding and taking away within 10, patterns, first sounds of words and memory.' },
};

export function gamesFor(band: Band, visitDay: number, enabled: Record<string, boolean>): GameId[] {
  return (Object.entries(BAND_GAMES[band]) as [GameId, number][])
    .filter(([id, day]) => visitDay >= day && enabled[id] !== false)
    .map(([id]) => id);
}

// ── Content ──
export const COLOUR_HEX: Record<string, string> = {
  red: '#EF5B5B', blue: '#4C8DF6', yellow: '#FFD23F', green: '#3FB984', orange: '#FF9A3C', purple: '#9B6BDF', pink: '#FF7EB6',
};
export const SHAPE_LIST = ['circle', 'square', 'triangle', 'star', 'heart', 'diamond'];
export const ANIMALS = [
  { e: '🐄', sound: 'Moo', name: 'cow' }, { e: '🐑', sound: 'Baa', name: 'sheep' }, { e: '🐶', sound: 'Woof', name: 'dog' },
  { e: '🐱', sound: 'Meow', name: 'cat' }, { e: '🦆', sound: 'Quack', name: 'duck' }, { e: '🐷', sound: 'Oink', name: 'pig' },
  { e: '🐸', sound: 'Ribbit', name: 'frog' }, { e: '🦁', sound: 'Roar', name: 'lion' }, { e: '🐝', sound: 'Buzz', name: 'bee' },
];
export const FOODS: { e: string; colour: string; name: string }[] = [
  { e: '🍎', colour: 'red', name: 'apple' }, { e: '🍓', colour: 'red', name: 'strawberry' }, { e: '🍒', colour: 'red', name: 'cherries' },
  { e: '🍌', colour: 'yellow', name: 'banana' }, { e: '🧀', colour: 'yellow', name: 'cheese' }, { e: '🌽', colour: 'yellow', name: 'corn' },
  { e: '🥦', colour: 'green', name: 'broccoli' }, { e: '🥒', colour: 'green', name: 'cucumber' }, { e: '🍐', colour: 'green', name: 'pear' },
  { e: '🥕', colour: 'orange', name: 'carrot' }, { e: '🍊', colour: 'orange', name: 'orange' },
  { e: '🍇', colour: 'purple', name: 'grapes' }, { e: '🍆', colour: 'purple', name: 'eggplant' },
  { e: '🫐', colour: 'blue', name: 'blueberries' },
];
/** The snack tray for free feeding. */
export const SNACKS = ['🍎', '🍌', '🥕', '🍓', '🧀', '🥦', '🍪', '🥛'];
export const LETTERS: { l: string; word: string; e: string }[] = [
  { l: 'A', word: 'apple', e: '🍎' }, { l: 'B', word: 'bear', e: '🐻' }, { l: 'C', word: 'cat', e: '🐱' }, { l: 'D', word: 'dog', e: '🐶' },
  { l: 'E', word: 'egg', e: '🥚' }, { l: 'F', word: 'fish', e: '🐟' }, { l: 'G', word: 'goat', e: '🐐' }, { l: 'H', word: 'hat', e: '🎩' },
  { l: 'K', word: 'kite', e: '🪁' }, { l: 'L', word: 'lion', e: '🦁' }, { l: 'M', word: 'moon', e: '🌙' }, { l: 'N', word: 'nest', e: '🪺' },
  { l: 'O', word: 'octopus', e: '🐙' }, { l: 'P', word: 'pig', e: '🐷' }, { l: 'R', word: 'rainbow', e: '🌈' }, { l: 'S', word: 'sun', e: '☀️' },
  { l: 'T', word: 'tiger', e: '🐯' }, { l: 'U', word: 'umbrella', e: '☂️' }, { l: 'V', word: 'van', e: '🚐' }, { l: 'W', word: 'whale', e: '🐳' },
  { l: 'Z', word: 'zebra', e: '🦓' },
];
/** Words for first sounds: simple, with clear single-letter starts. */
const FIRST_SOUNDS = LETTERS.filter((x) => !['E', 'O', 'U'].includes(x.l));
const THINGS = ['🍎', '⭐', '🐟', '🎈', '🌸', '🍪', '🐤', '🚗', '🦋', '🍓'];

// ── Rounds for the "pick one" games ──
export type Tile =
  | { kind: 'colour'; value: string }
  | { kind: 'shape'; value: string; colour: string }
  | { kind: 'emoji'; value: string; size?: number; faded?: boolean }
  | { kind: 'text'; value: string }
  | { kind: 'group'; value: string; n: number }
  | { kind: 'op'; value: string };

export type Round = {
  word: string;          // what the screen shows (two words at most)
  speak: string;         // what QR says
  show: Tile[];          // the question, if it needs one
  options: { key: string; tile: Tile }[];
  answer: string;
  feeds?: boolean;       // a right answer is fed to QR
};

const rnd = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(xs: T[]) => xs[rnd(xs.length)];
const shuffle = <T,>(xs: T[]) => { const a = [...xs]; for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

/** A few wrong answers from a pool, plus the right one, shuffled. */
function choices<T>(answer: T, pool: T[], n: number, eq = (a: T, b: T) => a === b) {
  const wrong = shuffle(pool.filter((x) => !eq(x, answer))).slice(0, n - 1);
  return shuffle([answer, ...wrong]);
}
function numberOptions(answer: number, n: number, max: number) {
  const pool = Array.from({ length: Math.max(max, n + 1) }, (_, i) => i + 1).filter((x) => Math.abs(x - answer) <= 3);
  return choices(answer, pool, n).map((v) => ({ key: String(v), tile: { kind: 'text', value: String(v) } as Tile }));
}

export type Ctx = { band: Band; ab: Abilities; level: number }; // level 0 to 2: gets a little harder as the child gets them right

export function knownColours({ band, ab }: Ctx) {
  const base = band === '2-3' ? ['red', 'blue', 'yellow'] : Object.keys(COLOUR_HEX);
  return [...new Set([...base, ...ab.colours.filter((c) => COLOUR_HEX[c])])];
}
export function knownShapes({ band, ab }: Ctx) {
  const base = band === '2-3' ? ['circle', 'square'] : band === '4-5' ? ['circle', 'square', 'triangle', 'star', 'heart'] : SHAPE_LIST;
  return [...new Set([...base, ...ab.shapes.filter((s) => SHAPE_LIST.includes(s))])];
}
/** How far the counting game goes. */
export function countTarget({ band, ab, level }: Ctx) {
  if (band === '2-3') return Math.min(5, Math.max(3, ab.countTo) + (level > 1 ? 1 : 0));
  if (band === '4-5') return Math.min(10, Math.max(5, ab.countTo) + level);
  return Math.min(20, 10 + level * 4 + rnd(3));
}

export function makeRound(game: GameId, c: Ctx): Round | null {
  const n = BAND_INFO[c.band].choices;
  switch (game) {
    case 'colours': {
      const pool = knownColours(c);
      const t = pick(pool);
      return { word: `${cap(t)}?`, speak: `Can you find ${t}?`, show: [], answer: t,
        options: choices(t, pool.length >= n ? pool : Object.keys(COLOUR_HEX), n).map((k) => ({ key: k, tile: { kind: 'colour', value: k } })) };
    }
    case 'shapes': {
      const pool = knownShapes(c);
      const t = pick(pool);
      const cols = shuffle(Object.values(COLOUR_HEX));
      return { word: `${cap(t)}?`, speak: `Where is the ${t}?`, show: [], answer: t,
        options: choices(t, pool.length >= n ? pool : SHAPE_LIST, n).map((k, i) => ({ key: k, tile: { kind: 'shape', value: k, colour: cols[i] } })) };
    }
    case 'animals': {
      const t = pick(ANIMALS);
      return { word: `${t.sound}!`, speak: `Who says ${t.sound.toLowerCase()}?`, show: [], answer: t.name,
        options: choices(t, ANIMALS, n, (a, b) => a.name === b.name).map((a) => ({ key: a.name, tile: { kind: 'emoji', value: a.e } })) };
    }
    case 'bigsmall': {
      const e = pick(['🐘', '🐻', '🍎', '🚗', '🐟', '🎈', '🐶']);
      const big = Math.random() < 0.5;
      return { word: big ? 'Big?' : 'Small?', speak: big ? 'Which one is big?' : 'Which one is small?', show: [], answer: big ? 'big' : 'small',
        options: shuffle([{ key: 'big', tile: { kind: 'emoji', value: e, size: 1.5 } as Tile }, { key: 'small', tile: { kind: 'emoji', value: e, size: 0.6 } as Tile }]) };
    }
    case 'feedcolour': {
      const colours = [...new Set(FOODS.map((f) => f.colour))].filter((x) => knownColours(c).includes(x) || c.band !== '2-3');
      const col = pick(colours.length ? colours : ['red', 'yellow']);
      const right = pick(FOODS.filter((f) => f.colour === col));
      const wrong = shuffle(FOODS.filter((f) => f.colour !== col));
      const opts: typeof FOODS = [right];
      for (const f of wrong) if (opts.length < n && !opts.some((o) => o.colour === f.colour)) opts.push(f);
      return { word: `${cap(col)}?`, speak: `Feed me something ${col}!`, show: [], answer: right.e, feeds: true,
        options: shuffle(opts).map((f) => ({ key: f.e, tile: { kind: 'emoji', value: f.e } })) };
    }
    case 'howmany': {
      const max = c.band === '4-5' ? 4 + c.level : 6 + c.level * 2;
      const k = 1 + rnd(max);
      const e = pick(THINGS);
      return { word: 'How many?', speak: 'How many?', show: [{ kind: 'group', value: e, n: k }], answer: String(k), options: numberOptions(k, n, max) };
    }
    case 'moreless': {
      const max = c.band === '4-5' ? 5 + c.level : 10;
      let a = 1 + rnd(max), b = 1 + rnd(max);
      while (a === b) b = 1 + rnd(max);
      const fewer = c.band === '6+' && Math.random() < 0.4;
      const e = pick(THINGS);
      const ans = fewer ? (a < b ? 'a' : 'b') : a > b ? 'a' : 'b';
      return { word: fewer ? 'Fewer?' : 'More?', speak: fewer ? 'Which has fewer?' : 'Which has more?', show: [], answer: ans,
        options: [{ key: 'a', tile: { kind: 'group', value: e, n: a } }, { key: 'b', tile: { kind: 'group', value: e, n: b } }] };
    }
    case 'pattern': {
      const useShapes = c.band === '6+' && Math.random() < 0.5;
      const items = useShapes ? shuffle(['🍎', '⭐', '🐟', '🎈', '🌸']).slice(0, 3) : shuffle(Object.keys(COLOUR_HEX)).slice(0, 3);
      const kinds = c.band === '4-5' ? ['AB', c.level > 1 ? 'AAB' : 'AB'] : ['ABC', 'AAB', 'ABB', 'AB'];
      const unit = [...pick(kinds)].map((ch) => items[ch.charCodeAt(0) - 65]);
      const len = Math.max(5, unit.length * 2 + 1);
      const seq = Array.from({ length: len + 1 }, (_, i) => unit[i % unit.length]);
      const answer = seq.pop()!;
      const tile = (v: string): Tile => (useShapes ? { kind: 'emoji', value: v } : { kind: 'colour', value: v });
      const pool = [...new Set(unit)].concat(useShapes ? ['🚗'] : ['pink']);
      return { word: 'Next?', speak: 'What comes next?', show: [...seq.map(tile), { kind: 'op', value: '?' }], answer,
        options: choices(answer, pool, Math.min(n, pool.length)).map((k) => ({ key: k, tile: tile(k) })) };
    }
    case 'letters': {
      const t = pick(LETTERS);
      return { word: `${t.l}?`, speak: `Find the letter ${t.l}. ${t.l} is for ${t.word}!`, show: [{ kind: 'emoji', value: t.e }], answer: t.l,
        options: choices(t.l, LETTERS.map((x) => x.l), n).map((l) => ({ key: l, tile: { kind: 'text', value: l } })) };
    }
    case 'firstsound': {
      const t = pick(FIRST_SOUNDS);
      const l = t.l.toLowerCase();
      return { word: 'Starts with?', speak: `${cap(t.word)}. What does ${t.word} start with?`, show: [{ kind: 'emoji', value: t.e }], answer: l,
        options: choices(l, FIRST_SOUNDS.map((x) => x.l.toLowerCase()), n).map((k) => ({ key: k, tile: { kind: 'text', value: k } })) };
    }
    case 'oddone': {
      const byColour = Math.random() < 0.5;
      const count = Math.max(3, n);
      if (byColour) {
        const [a, b] = shuffle(Object.keys(COLOUR_HEX));
        const odd = rnd(count);
        return { word: 'Different?', speak: 'Which one is different?', show: [], answer: String(odd),
          options: Array.from({ length: count }, (_, i) => ({ key: String(i), tile: { kind: 'colour', value: i === odd ? b : a } as Tile })) };
      }
      const [a, b] = shuffle(THINGS);
      const odd = rnd(count);
      return { word: 'Different?', speak: 'Which one is different?', show: [], answer: String(odd),
        options: Array.from({ length: count }, (_, i) => ({ key: String(i), tile: { kind: 'emoji', value: i === odd ? b : a } as Tile })) };
    }
    case 'add': {
      const max = 5 + c.level * 2 + (c.level > 1 ? 1 : 0); // up to 5, 7, then 10
      const a = 1 + rnd(Math.max(1, max - 1)), b = 1 + rnd(Math.max(1, max - a));
      const e = pick(THINGS);
      return { word: `${a} + ${b}?`, speak: `${cap(NUM_WORDS[a] ?? String(a))} and ${NUM_WORDS[b] ?? b} make?`, answer: String(a + b),
        show: [{ kind: 'group', value: e, n: a }, { kind: 'op', value: '+' }, { kind: 'group', value: e, n: b }], options: numberOptions(a + b, n, 10) };
    }
    case 'takeaway': {
      const max = 5 + c.level * 2 + (c.level > 1 ? 1 : 0);
      const a = 2 + rnd(Math.max(1, max - 1)), b = 1 + rnd(a - 1);
      const e = pick(THINGS);
      return { word: `${a} − ${b}?`, speak: `${cap(NUM_WORDS[a] ?? String(a))} take away ${NUM_WORDS[b] ?? b}?`, answer: String(a - b),
        show: Array.from({ length: a }, (_, i) => ({ kind: 'emoji', value: e, faded: i >= a - b } as Tile)), options: numberOptions(a - b, n, 10) };
    }
    default:
      return null;
  }
}

/** Memory pairs: how many pairs, by band. */
export const memoryPairs = (c: Ctx) => (c.band === '2-3' ? 2 : c.band === '4-5' ? 3 + (c.level > 1 ? 1 : 0) : 4 + (c.level > 1 ? 2 : 0));
export const memoryCards = (pairs: number) => shuffle(shuffle(THINGS).slice(0, pairs).flatMap((e) => [e, e]));

/** "Feed me 3!" : the number and the food. */
export function feedCountRound(c: Ctx) {
  const max = c.band === '4-5' ? 3 + c.level : 5 + c.level * 2;
  const food = pick(FOODS);
  const k = 2 + rnd(max - 1);
  return { n: k, food: food.e, speak: `Can you feed me ${NUM_WORDS[k] ?? k} ${food.name === 'cherries' || food.name === 'grapes' || food.name === 'blueberries' ? food.name : food.name + 's'}?` };
}
