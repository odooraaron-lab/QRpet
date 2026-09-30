/**
 * QR Buddy — shared contract.
 *
 * Every name here matches the "Control contract" in the v2 spec exactly, so the
 * same values drive both the Rive file (View Model "Buddy") and the SVG fallback.
 * Option order matches the game's original numbers, so legacy indices still work.
 */

export const MOODS = [
  'happy', 'grin', 'surprised', 'sing', 'sleepy',
  'asleep', 'shy', 'proud', 'think', 'pout',
] as const;
export type Mood = (typeof MOODS)[number];

export const ACTIONS = [
  'idle', 'bounce', 'spin', 'wave', 'clap', 'dance', 'jump',
  'giggle', 'hop', 'hug', 'hide', 'sway', 'float',
  // Added for the web app (not in the v2 Rive contract yet: RiveBuddy plays hop / giggle instead).
  'eat', 'shake',
] as const;
export type Action = (typeof ACTIONS)[number];

export const COLOURS = ['honey', 'mint', 'sky', 'peach', 'lilac', 'cloud'] as const;
export type Colour = (typeof COLOURS)[number];

export const ACCESSORIES = [
  'none', 'bow', 'beanie', 'headphones', 'partyHat',
  'glasses', 'flower', 'scarf', 'crown',
] as const;
export type Accessory = (typeof ACCESSORIES)[number];

export const STAGES = [0, 1, 2, 3, 4] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_NAMES = ['Hatchling', 'Stage 1', 'Stage 2', 'Stage 3', 'Legend'] as const;

/** Signals the buddy sends back (trigger properties in the .riv). */
export const CUES = [
  'cueStep', 'cueLand', 'cueClap', 'cueWhoosh', 'cueGiggle', 'cuePop', 'cueYawn',
] as const;
export type Cue = (typeof CUES)[number];

export type TapPart = 'tummy' | 'head';

/** How each action plays (spec: Action sheet). */
export type ActionKind = 'loop' | 'once' | 'hold';
export const ACTION_KIND: Record<Action, ActionKind> = {
  idle: 'loop',
  bounce: 'loop',
  spin: 'once',
  wave: 'once',
  clap: 'once',
  dance: 'loop',
  jump: 'once',
  giggle: 'once',
  hop: 'once',
  hug: 'once',
  hide: 'hold',
  sway: 'loop',
  float: 'loop',
  eat: 'once',
  shake: 'once',
};

/** Length of a play-once move, or one cycle of a loop, in ms. */
export const ACTION_MS: Record<Action, number> = {
  idle: 8000,
  bounce: 800,
  spin: 1200,
  wave: 1400,
  clap: 1200,
  dance: 1500,
  jump: 1300,
  giggle: 1000,
  hop: 800,
  hug: 1500,
  hide: 500,
  sway: 2400,
  float: 3000,
  eat: 900,
  shake: 900,
};

/** Peekaboo "boo" reveal when leaving hide. */
export const BOO_MS = 600;
/** Blend time between actions (spec: 0.3 s). */
export const BLEND_MS = 300;
/** Stage change "grow" moment. */
export const GROW_MS = 1200;

/**
 * Cue timings for the SVG fallback (ms from the start of the move, or of each
 * loop cycle). The .riv fires these itself on the exact frame.
 */
export const ACTION_CUES: Partial<Record<Action, ReadonlyArray<readonly [number, Cue]>>> = {
  spin: [[600, 'cueWhoosh']],
  clap: [[260, 'cueClap'], [610, 'cueClap'], [960, 'cueClap']],
  jump: [[1030, 'cueLand']],
  hop: [[560, 'cueLand']],
  eat: [[150, 'cuePop'], [450, 'cuePop']],
  giggle: [[0, 'cueGiggle']],
  dance: [[375, 'cueStep'], [1125, 'cueStep']],
  sway: [[600, 'cueStep'], [1800, 'cueStep']],
};

/** While asleep only these actions play (spec: Priority rules). */
export const ASLEEP_ACTIONS: ReadonlyArray<Action> = ['idle', 'sway', 'float'];

/** Growth scale from the floor pivot for each stage (spec: Growth stages). */
export const STAGE_SCALE: Record<Stage, number> = { 0: 0.8, 1: 0.86, 2: 0.92, 3: 0.96, 4: 1 };

/* ---------------------------------------------------------------- helpers */

function pick<T extends string>(list: ReadonlyArray<T>, value: unknown, fallback: T): T {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < list.length) {
    return list[value];
  }
  if (typeof value === 'string' && (list as ReadonlyArray<string>).includes(value)) {
    return value as T;
  }
  return fallback;
}

/** Accepts a name ("wave") or the game's old number (3). */
export const toMood = (v: Mood | number | undefined | null): Mood => pick(MOODS, v, 'happy');
export const toAction = (v: Action | number | undefined | null): Action => pick(ACTIONS, v, 'idle');
export const toColour = (v: Colour | number | undefined | null): Colour => pick(COLOURS, v, 'honey');
export const toAccessory = (v: Accessory | number | undefined | null): Accessory =>
  pick(ACCESSORIES, v, 'none');
export const toStage = (v: number | undefined | null): Stage => {
  const n = Math.round(Number(v ?? 0));
  return (n < 0 ? 0 : n > 4 ? 4 : n) as Stage;
};

export const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
export const clampUnit = (n: number) => (n < -1 ? -1 : n > 1 ? 1 : n);

/** Actions the buddy will actually play in a given mood. */
export function effectiveAction(mood: Mood, action: Action): Action {
  return mood === 'asleep' && !ASLEEP_ACTIONS.includes(action) ? 'idle' : action;
}

/** Where the eyes should look: null lets them wander on their own. */
export interface LookTarget {
  /** −1 (left) to 1 (right) */
  x: number;
  /** −1 (up) to 1 (down) */
  y: number;
}

/** The fully normalised state both renderers receive. */
export interface BuddyState {
  mood: Mood;
  action: Action;
  /** Change this to replay the same play-once action. */
  actionKey: number | string;
  colour: Colour;
  accessory: Accessory;
  stage: Stage;
  glow: boolean;
  talking: boolean;
  calm: boolean;
  look: LookTarget | null;
}

/** What both renderers expose to Buddy.tsx. */
export interface RendererHandle {
  tapTummy(): void;
  tapHead(): void;
  learn(): void;
  /** 0 to 1, called every frame while audio drives the mouth. */
  setMouth(value: number): void;
}

export interface RendererCallbacks {
  onActionDone?: (action: Action) => void;
  onCue?: (cue: Cue) => void;
  onTap?: (part: TapPart) => void;
}
