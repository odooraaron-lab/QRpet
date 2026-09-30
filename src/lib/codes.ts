import { randomInt } from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// BUDDY CODES AND PARENT PINS
//
// Buddy code: three easy words and a number, e.g. MOON-TIGER-APPLE-27. Typing it on any phone, tablet or
// TV (or scanning the card, whose QR holds the same code) opens the buddy on that device, for good.
// It's the family's key: no email needed. "New code" on the parent page replaces it (lost card).
// About 190 million combinations, and code entry is rate limited, so it can't be guessed.
//
// Parent PIN: 4 digits that open the parent page from the buddy's secret button (or on a new device).
// Wrong guesses lock it for 10 minutes after 5 tries.
// ─────────────────────────────────────────────────────────────

// Short, kid-safe, easy to spell. Never remove or reorder words: existing codes are stored as text, so
// that's only cosmetic, but keep the list stable anyway.
const WORDS = (
  'APPLE BANANA BEAR BEE BIRD BOAT BOOK BUBBLE BUNNY CAKE CAR CAT CLOUD COOKIE CORN COW CRAB CROWN CUP DAISY ' +
  'DOG DRUM DUCK EGG FERN FISH FLAG FOX FROG GRAPE HAT HONEY HORSE JELLY KITE KIWI KOALA LAMB LEAF LEMON ' +
  'LION MANGO MOON MOUSE NEST OWL PANDA PEACH PEAR PENGUIN PIANO PIE PIG PLUM POND PUPPY RAIN ROBIN ROCKET SEAL ' +
  'SHELL SHIP SNAIL SOCK SPOON STAR SUN SWAN TIGER TOAST TRAIN TREE TUI TURTLE WAVE WHALE ZEBRA BEACH BERRY BELL ' +
  'BUTTON CHERRY DRAGON FEATHER GARDEN HONK ISLAND JUNGLE KETTLE LADDER MAPLE MUFFIN NOODLE OCEAN PADDLE PEBBLE PICNIC ' +
  'PILLOW PIRATE POPPY PUDDLE RIVER ROSE SANDAL SCARF SEED SLIDE SNOW SPARK SPROUT SQUID STICK SUGAR TEAPOT TIMBER ' +
  'TOFFEE TULIP VIOLIN WAFFLE WAGON WIGGLE WILLOW WOMBAT YOYO ZIGZAG'
).split(' ');

export function newCode() {
  const w = () => WORDS[randomInt(WORDS.length)];
  let a = w(), b = w(), c = w();
  while (b === a) b = w();
  while (c === a || c === b) c = w();
  return `${a}-${b}-${c}-${randomInt(10, 100)}`;
}

/** "moon tiger apple 27", "MOON-TIGER-APPLE-27" and "moontigerapple27" all match. */
export const normalizeCode = (raw: unknown) => String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 64);

export const newPin = () => String(randomInt(0, 10000)).padStart(4, '0');
export const validPin = (p: unknown) => typeof p === 'string' && /^\d{4}$/.test(p);
