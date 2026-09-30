'use client';
// QR, the buddy. The drawing and animation live in ./buddy (the designer's Rive-ready package): an SVG buddy
// that works everywhere, which switches to the Rive file automatically once NEXT_PUBLIC_BUDDY_RIVE points at one.
// This file keeps the props the rest of the app already uses (colour, mood, action, accessory, scale/stage,
// onTummy/onHead…) and translates them.
import { useRef } from 'react';
import { Buddy as QrBuddy } from './buddy/QrBuddy';
import type { Action as QrAction, Mood as QrMood } from './buddy/buddyTypes';

export type Mood = QrMood;
export type Action = QrAction;

export { PALETTES } from '@/lib/palettes';

/** Where the Rive file lives (e.g. https://create.myqr.co.nz/rive/qr-buddy.riv). Unset = SVG only, no download attempts. */
const RIVE_SRC = process.env.NEXT_PUBLIC_BUDDY_RIVE || null;
const RIVE_WASM = process.env.NEXT_PUBLIC_BUDDY_RIVE_WASM || undefined;

const ACCESSORY: Record<string, string> = { party: 'partyHat' };
/** Old growth scale (0.78 to 1.06) to the package's stages 0 to 4. */
const stageFromScale = (s: number) => (s <= 0.8 ? 0 : s <= 0.9 ? 1 : s <= 1 ? 2 : s <= 1.05 ? 3 : 4);

export function Buddy({
  colour = 'honey', mood = 'happy', action = 'idle', actionKey, accessory = null, glow = false, scale, stage, talking = false,
  sticker = false, className = '', onTummy, onHead, live = false,
}: {
  colour?: string; mood?: Mood; action?: Action; actionKey?: number | string; accessory?: string | null; glow?: boolean;
  scale?: number; stage?: number; talking?: boolean; sticker?: boolean; className?: string;
  onTummy?: () => void; onHead?: () => void;
  /** Only the buddy on the kid screen loads the Rive file; small pictures elsewhere stay SVG. */
  live?: boolean;
}) {
  const handlers = useRef({ onTummy, onHead });
  handlers.current = { onTummy, onHead };
  const interactive = !!(onTummy || onHead);
  return (
    <div className={`qb-wrap ${className}`}>
      <QrBuddy
        mood={mood}
        action={action}
        actionKey={actionKey}
        colour={colour as never}
        accessory={(accessory ? ACCESSORY[accessory] ?? accessory : 'none') as never}
        stage={stage ?? (scale ? stageFromScale(scale) : 2)}
        glow={glow}
        talking={talking}
        interactive={interactive}
        src={live ? RIVE_SRC : null}
        wasmUrl={RIVE_WASM}
        maxPixelRatio={1.5}
        onTap={(part) => (part === 'head' ? handlers.current.onHead : handlers.current.onTummy)?.()}
      />
      {sticker && <span className="qb-sticker" aria-hidden="true">⭐</span>}
    </div>
  );
}
