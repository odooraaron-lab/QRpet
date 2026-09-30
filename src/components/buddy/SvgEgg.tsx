'use client';

/**
 * QR Egg — SVG renderer. Three taps to hatch (spec: Egg and hatch).
 * Tap 1: wobble + first crack. Tap 2: bigger wobble + an eye peeks through.
 * Tap 3: the top pops off, the Hatchling springs out and lands.
 * Taps are ignored while a crack is still playing.
 */
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { SvgBuddy } from './SvgBuddy';
import type { Colour } from './buddyTypes';

export type EggCue = 'cueCrack' | 'cueLand';

export interface EggHandle {
  tap(): void;
}

export interface EggCallbacks {
  /** 1, 2 or 3 as each crack lands. */
  onCrack?: (n: number) => void;
  onHatched?: () => void;
  onEggCue?: (cue: EggCue, n?: number) => void;
}

export interface SvgEggProps extends EggCallbacks {
  colour: Colour;
  calm?: boolean;
  interactive?: boolean;
  label?: string;
}

const EGG = 'M200 180C250 180 284 262 284 310C284 350 248 376 200 376C152 376 116 350 116 310C116 262 150 180 200 180Z';
const ZIG: Array<[number, number]> = [
  [100, 284], [124, 272], [142, 290], [160, 270], [178, 292], [196, 270],
  [214, 290], [232, 270], [250, 288], [268, 272], [286, 284], [300, 280],
];
const zigPath = ZIG.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');
const TOP_CLIP = `M100 150L300 150${[...ZIG].reverse().map(([x, y]) => `L${x} ${y}`).join('')}Z`;
const BOTTOM_CLIP = `${zigPath}L300 400L100 400Z`;

const TAP_MS = [700, 900, 2000];

export const SvgEgg = forwardRef<EggHandle, SvgEggProps>(function SvgEgg(props, ref) {
  const { colour, calm = false, interactive = true, label } = props;
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const cb = useRef<EggCallbacks>(props);
  cb.current = props;

  const [cracks, setCracks] = useState(0);
  const [anim, setAnim] = useState<'wait' | 'tap1' | 'tap2' | 'hatch'>('wait');
  const [buddyMood, setBuddyMood] = useState<'surprised' | 'happy'>('surprised');
  const busy = useRef(false);
  const count = useRef(0);
  const timers = useRef<number[]>([]);
  const later = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const tap = useCallback(() => {
    if (busy.current || count.current >= 3) return;
    busy.current = true;
    const n = ++count.current;
    setCracks(n);
    setAnim(n === 3 ? 'hatch' : n === 1 ? 'tap1' : 'tap2');
    cb.current.onEggCue?.('cueCrack', n);
    cb.current.onCrack?.(n);
    if (n === 3) {
      later(1200, () => cb.current.onEggCue?.('cueLand'));
      later(1400, () => setBuddyMood('happy'));
    }
    later(TAP_MS[n - 1], () => {
      busy.current = false;
      if (n < 3) setAnim('wait');
      else cb.current.onHatched?.();
    });
  }, []);

  useImperativeHandle(ref, () => ({ tap }), [tap]);

  const hatching = anim === 'hatch';
  const onKey = (e: { key: string; preventDefault(): void }) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tap();
    }
  };

  const shell = (
    <>
      <path d={EGG} className="qr-egg-shell" />
      <ellipse cx="170" cy="236" rx="16" ry="11" className="qr-egg-spot" transform="rotate(-24 170 236)" />
      <ellipse cx="236" cy="222" rx="10" ry="8" className="qr-egg-spot" />
      <ellipse cx="248" cy="318" rx="18" ry="13" className="qr-egg-spot" transform="rotate(18 248 318)" />
      <ellipse cx="160" cy="334" rx="12" ry="9" className="qr-egg-spot" />
      <ellipse cx="206" cy="352" rx="8" ry="6" className="qr-egg-spot" />
      <ellipse cx="176" cy="212" rx="12" ry="22" fill="#fff" opacity="0.55" transform="rotate(24 176 212)" />
    </>
  );

  return (
    <div className="qr-egg-wrap">
      <svg
        className="qr qr-egg"
        viewBox="0 0 400 400"
        data-colour={colour}
        data-cracks={cracks}
        data-anim={anim}
        data-calm={calm ? 'true' : 'false'}
        role={interactive ? 'button' : 'img'}
        tabIndex={interactive && !hatching ? 0 : undefined}
        aria-label={label ?? (hatching ? 'The egg is hatching' : `Egg, tap to hatch. ${3 - cracks} taps to go`)}
        onPointerDown={interactive ? tap : undefined}
        onKeyDown={interactive ? onKey : undefined}
      >
        <defs>
          <clipPath id={`${uid}-top`}><path d={TOP_CLIP} /></clipPath>
          <clipPath id={`${uid}-bottom`}><path d={BOTTOM_CLIP} /></clipPath>
          <radialGradient id={`${uid}-glow`}>
            <stop offset="0" stopColor="#fff4c4" stopOpacity="0.9" />
            <stop offset="1" stopColor="#fff4c4" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle className="qr-egg-glow" cx="200" cy="286" r="140" fill={`url(#${uid}-glow)`} />
        <ellipse className="qr-egg-shadow" cx="200" cy="378" rx="72" ry="8" />

        <g className="qr-egg-body">
          {/* Whole until it hatches; the split halves only appear for the pop. */}
          <g className="qr-egg-whole">{shell}</g>
          <g className="qr-egg-bottom" clipPath={`url(#${uid}-bottom)`}>{shell}</g>
          <g className="qr-egg-top">
            <g clipPath={`url(#${uid}-top)`}>{shell}</g>
          </g>
          <path className="qr-egg-outline" d={EGG} fill="none" />

          <path className="qr-egg-crack qr-egg-crack--1" pathLength={1} d="M196 270L204 254L195 242L203 228" />
          <path className="qr-egg-crack qr-egg-crack--2" pathLength={1} d="M160 270L178 292L196 270L214 290L232 270" />
          <path className="qr-egg-crack qr-egg-crack--3" pathLength={1} d={zigPath} />

          <g className="qr-egg-peek">
            <ellipse cx="214" cy="281" rx="5" ry="6" fill="#2a2440" />
            <circle cx="216" cy="279" r="1.6" fill="#fff" />
          </g>
        </g>
      </svg>

      {hatching && (
        <div className="qr-egg-buddy" aria-hidden="true">
          <SvgBuddy
            mood={buddyMood}
            action="idle"
            actionKey={0}
            colour={colour}
            accessory="none"
            stage={0}
            glow={false}
            talking={false}
            calm={calm}
            look={null}
            interactive={false}
          />
        </div>
      )}
    </div>
  );
});

export default SvgEgg;
