// ─────────────────────────────────────────────────────────────
// WHAT QR LEARNS
// One item a visit day, in this order unless the parent's learning sliders
// pull a track forward. Nothing is ever lost. Safe to import in the browser:
// the player turns the unlocked ids into QR's abilities.
// Add items anywhere; ids must never change (families' timelines store them).
// ─────────────────────────────────────────────────────────────

export type Track = 'egg' | 'sounds' | 'moves' | 'counting' | 'colours' | 'shapes' | 'feelings' | 'songs' | 'dress' | 'room' | 'games';

export type Item = { id: string; track: Track; title: string; minDay?: number };

// Learning sliders on the parent page map onto these tracks.
export const FOCUS: Record<string, Track[]> = {
  counting: ['counting'],
  colours: ['colours'],
  shapes: ['shapes'],
  songs: ['songs', 'sounds'],
  feelings: ['feelings', 'moves'],
};

export const CATALOGUE: Item[] = [
  // The egg: three visits of build-up, then it hatches on the fourth. Always first, whatever the sliders say.
  { id: 'egg-1', track: 'egg', title: 'An egg arrived! It wiggles when you tap it' },
  { id: 'egg-2', track: 'egg', title: 'A little crack appeared in the egg' },
  { id: 'egg-3', track: 'egg', title: 'Two eyes peeked out of the crack' },
  { id: 'hatch', track: 'room', title: 'Hatched from a plush egg and said its first “boo-OP”' },
  { id: 'sound-giggle', track: 'sounds', title: 'Giggles when you tickle its tummy' },
  { id: 'move-wave', track: 'moves', title: 'Waves hello' },
  { id: 'count-2', track: 'counting', title: 'Counts to 2' },
  { id: 'feel-surprised', track: 'feelings', title: 'Makes a surprised face' },
  { id: 'dress-bow', track: 'dress', title: 'Got a little bow' },
  { id: 'song-hello', track: 'songs', title: 'Hums a hello song' },
  { id: 'move-bounce', track: 'moves', title: 'Bounces up and down' },
  { id: 'count-3', track: 'counting', title: 'Counts to 3' },
  { id: 'colour-red', track: 'colours', title: 'Knows the colour red' },
  { id: 'sound-hmm', track: 'sounds', title: 'Asks “hmm?” when curious' },
  { id: 'room-window', track: 'room', title: 'A window with sky and stars' },
  { id: 'move-clap', track: 'moves', title: 'Claps its hands' },
  { id: 'count-4', track: 'counting', title: 'Counts to 4' },
  { id: 'game-peekaboo', track: 'games', title: 'Learned to play peekaboo' },
  { id: 'colour-blue', track: 'colours', title: 'Knows the colour blue' },
  { id: 'dress-beanie', track: 'dress', title: 'Got a cosy beanie' },
  { id: 'feel-proud', track: 'feelings', title: 'Puffs up proudly' },
  { id: 'count-5', track: 'counting', title: 'Counts to 5' },
  { id: 'song-star', track: 'songs', title: 'Sings a twinkly star song' },
  { id: 'room-rug', track: 'room', title: 'A soft rug and a toy shelf' },
  { id: 'colour-yellow', track: 'colours', title: 'Knows yellow, and plays colour pop' },
  { id: 'move-spin', track: 'moves', title: 'Does a happy spin' },
  { id: 'sound-yawn', track: 'sounds', title: 'Yawns and hums a lullaby' },
  { id: 'shape-circle', track: 'shapes', title: 'Knows circles' },
  { id: 'dress-headphones', track: 'dress', title: 'Got headphones and dances to music' },
  { id: 'count-back', track: 'counting', title: 'Counts backwards: 3, 2, 1, whee!' },
  { id: 'shape-square', track: 'shapes', title: 'Knows squares (its own shape!)' },
  { id: 'room-stars', track: 'room', title: 'Twinkly stars on the ceiling' },
  { id: 'milestone-30', track: 'room', title: 'Day 30 party, with a star sticker', minDay: 30 },
  { id: 'colour-green', track: 'colours', title: 'Knows green' },
  { id: 'count-6', track: 'counting', title: 'Counts to 6' },
  { id: 'feel-shy', track: 'feelings', title: 'Hides its eyes when shy' },
  { id: 'game-count', track: 'games', title: 'Learned the counting game' },
  { id: 'sound-pop', track: 'sounds', title: 'Makes a popping “oh!”' },
  { id: 'shape-triangle', track: 'shapes', title: 'Knows triangles, and plays shape sort' },
  { id: 'dress-party', track: 'dress', title: 'Got a party hat' },
  { id: 'count-7', track: 'counting', title: 'Counts to 7' },
  { id: 'move-dance', track: 'moves', title: 'Dances a wiggly dance' },
  { id: 'colour-orange', track: 'colours', title: 'Knows orange' },
  { id: 'room-plant', track: 'room', title: 'A little plant that grows' },
  { id: 'song-rain', track: 'songs', title: 'Sings a pitter-patter rain song' },
  { id: 'count-8', track: 'counting', title: 'Counts to 8' },
  { id: 'feel-excited', track: 'feelings', title: 'Gets super excited' },
  { id: 'shape-star', track: 'shapes', title: 'Knows stars' },
  { id: 'dress-glasses', track: 'dress', title: 'Got round glasses' },
  { id: 'colour-purple', track: 'colours', title: 'Knows purple' },
  { id: 'count-9', track: 'counting', title: 'Counts to 9' },
  { id: 'move-jump', track: 'moves', title: 'Jumps really high' },
  { id: 'sound-trill', track: 'sounds', title: 'Sings a happy trill' },
  { id: 'room-bunting', track: 'room', title: 'Bunting across the room' },
  { id: 'count-10', track: 'counting', title: 'Counts all the way to 10' },
  { id: 'shape-heart', track: 'shapes', title: 'Knows hearts' },
  { id: 'dress-flower', track: 'dress', title: 'Got a flower to wear' },
  { id: 'colour-pink', track: 'colours', title: 'Knows pink' },
  { id: 'song-goodnight', track: 'songs', title: 'Sings a goodnight song' },
  { id: 'feel-thinking', track: 'feelings', title: 'Thinks with a sparkly tuft' },
  { id: 'move-hug', track: 'moves', title: 'Gives big hugs' },
  { id: 'room-rainbow', track: 'room', title: 'A rainbow out the window' },
  { id: 'dress-scarf', track: 'dress', title: 'Got a stripy scarf' },
  { id: 'milestone-60', track: 'room', title: 'Day 60 party, with a medal', minDay: 60 },
  { id: 'count-evens', track: 'counting', title: 'Counts by twos: 2, 4, 6, 8, 10' },
  { id: 'room-moon', track: 'room', title: 'A moon night-light' },
  { id: 'dress-crown', track: 'dress', title: 'Got a shiny crown', minDay: 80 },
  { id: 'milestone-100', track: 'room', title: 'Day 100 party!', minDay: 100 },
];

export const ITEM = Object.fromEntries(CATALOGUE.map((i) => [i.id, i])) as Record<string, Item>;

/**
 * The next item for a buddy: the earliest item not yet learned, where each track's place in the queue is
 * divided by the parent's weight for it (weight 2 = comes twice as soon), and the same track never
 * three days running. Past the end of the list, QR keeps visiting with a daily "sparkle" and no new item.
 */
export const EGG_STEPS = ['egg-1', 'egg-2', 'egg-3', 'hatch'];

export function nextItem(learned: string[], visitDay: number, weights: Partial<Record<string, number>> = {}, recentTracks: Track[] = []): Item | null {
  const have = new Set(learned);
  // Hatching comes first, one step a visit. Buddies that hatched before the egg stage existed skip it.
  if (!have.has('hatch')) return ITEM[EGG_STEPS.find((id) => !have.has(id))!];
  const trackWeight = (t: Track) => {
    let w = 1;
    for (const [focus, tracks] of Object.entries(FOCUS)) if (tracks.includes(t)) w = Math.max(0.25, Number(weights[focus] ?? 1));
    return w;
  };
  const blocked = recentTracks.length >= 2 && recentTracks[0] === recentTracks[1] ? recentTracks[0] : null;
  let best: { item: Item; score: number } | null = null;
  CATALOGUE.forEach((item, i) => {
    if (have.has(item.id) || item.track === 'egg' || (item.minDay && visitDay < item.minDay)) return;
    if (item.track === blocked && item.id !== 'hatch') return;
    const score = i / trackWeight(item.track);
    if (!best || score < best.score) best = { item, score };
  });
  return best ? (best as { item: Item }).item : null;
}

// ── What QR can do, from what it has learned (used by the player and the parent page) ──
export type Abilities = {
  stage: { name: string; scale: number };
  hatched: boolean;
  eggDay: number; // 1 to 3 while still an egg (how cracked it is), 4 on hatching day

  countTo: number;
  countBack: boolean;
  countEvens: boolean;
  colours: string[];
  shapes: string[];
  moves: string[];
  sounds: string[];
  feelings: string[];
  songs: string[];
  dress: string[];
  room: string[];
  games: string[];
};

export const STAGES = [
  { from: 1, name: 'Egg', scale: 0.78 },
  { from: 4, name: 'Hatchling', scale: 0.78 },
  { from: 11, name: 'Sprout', scale: 0.88 },
  { from: 31, name: 'Buddy', scale: 1 },
  { from: 91, name: 'Star', scale: 1.04 },
  { from: 365, name: 'Legend', scale: 1.06 },
];

export function abilities(learned: string[], visitDay: number): Abilities {
  const ids = new Set(learned);
  const after = (prefix: string) => learned.filter((id) => id.startsWith(prefix)).map((id) => id.slice(prefix.length));
  const counts = after('count-').map(Number).filter((n) => n > 0);
  const stage = [...STAGES].reverse().find((s) => visitDay >= s.from) ?? STAGES[0];
  const games = after('game-');
  if (ids.has('colour-yellow')) games.push('colours');
  if (ids.has('shape-triangle')) games.push('shapes');
  return {
    stage: { name: ids.has('hatch') ? (stage.name === 'Egg' ? 'Hatchling' : stage.name) : 'Egg', scale: stage.scale },
    hatched: ids.has('hatch'),
    eggDay: ids.has('hatch') ? 4 : EGG_STEPS.filter((id) => ids.has(id)).length,
    countTo: counts.length ? Math.max(...counts) : 1,
    countBack: ids.has('count-back'),
    countEvens: ids.has('count-evens'),
    colours: after('colour-'),
    shapes: after('shape-'),
    moves: after('move-'),
    sounds: after('sound-'),
    feelings: after('feel-'),
    songs: after('song-'),
    dress: after('dress-'),
    room: [...after('room-'), ...after('milestone-').map((d) => `milestone-${d}`)],
    games,
  };
}

export const COLOURS: Record<string, string> = {
  red: '#EF5B5B', blue: '#4C8DF6', yellow: '#FFD23F', green: '#3FB984', orange: '#FF9A3C', purple: '#9B6BDF', pink: '#FF7EB6',
};
