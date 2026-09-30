'use client';

/**
 * QR Buddy — drop-in replacement for the old Buddy.tsx.
 *
 * <Buddy mood="happy" action="wave" colour="mint" accessory="bow" stage={2} glow />
 *
 * - Shows the SVG buddy instantly, then cross-fades to qr-buddy.riv once it has
 *   loaded and passed a contract check. If Rive can't run (no WebGL2 or WebAssembly,
 *   missing file, wrong View Model), the SVG buddy simply stays.
 * - Accepts names ("wave") or the game's old numbers (3) for mood, action,
 *   colour and accessory.
 * - Optional `audio` (a BuddyAudio) plays cue sounds and drives lip-sync.
 */
import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { SvgBuddy } from './SvgBuddy';
import type { BuddyAudio } from './buddyAudio';
import { useRivePhase, type BuddyRenderer } from './useRivePhase';
import {
  toAccessory,
  toAction,
  toColour,
  toMood,
  toStage,
  type Accessory,
  type Action,
  type BuddyState,
  type Colour,
  type Cue,
  type LookTarget,
  type Mood,
  type RendererHandle,
  type TapPart,
} from './buddyTypes';

const RiveBuddy = lazy(() => import('./RiveBuddy'));

export type { BuddyRenderer };

export interface BuddyProps {
  mood?: Mood | number;
  action?: Action | number;
  /** Change to replay the same play-once action (e.g. jump twice). */
  actionKey?: number | string;
  colour?: Colour | number;
  accessory?: Accessory | number;
  /** 0 (Hatchling) to 4 (Legend). */
  stage?: number;
  glow?: boolean;
  /** Canned talk loop when there is no live audio level. */
  talking?: boolean;
  /** 0 to 1, if you measure speech yourself. `audio` does this for you. */
  mouthOpen?: number;
  /** Where to look (−1 to 1 each way). Leave out to let the eyes wander. */
  look?: LookTarget | null;
  /** Half-strength motion. Defaults to the device's reduced-motion setting. */
  calm?: boolean;
  /** Plays cue sounds and moves the mouth with the buddy's voice. */
  audio?: BuddyAudio | null;

  /** Path to the Rive file. Pass null to use only the SVG buddy. */
  src?: string | null;
  /** Self-hosted Rive WASM, recommended for TVs and offline use. */
  wasmUrl?: string;
  /** 'auto' uses Rive when it can. */
  renderer?: 'auto' | BuddyRenderer;
  /** Cap canvas resolution on 4K TVs with weak GPUs, e.g. 1.5. */
  maxPixelRatio?: number;

  /** Tap areas on the head and tummy. Default true. */
  interactive?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;

  onActionDone?: (action: Action) => void;
  onCue?: (cue: Cue) => void;
  onTap?: (part: TapPart) => void;
  onRendererChange?: (renderer: BuddyRenderer) => void;
}

export interface BuddyHandle {
  /** Play a move now, even if it is the same as the last one. */
  play(action: Action | number): void;
  tapTummy(): void;
  tapHead(): void;
  learn(): void;
  readonly renderer: BuddyRenderer;
}

const DEFAULT_SRC = '/rive/qr-buddy.riv';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export const Buddy = forwardRef<BuddyHandle, BuddyProps>(function Buddy(props, ref) {
  const {
    audio = null,
    src = DEFAULT_SRC,
    wasmUrl,
    renderer = 'auto',
    maxPixelRatio,
    interactive = true,
    label,
    className,
    style,
  } = props;

  const reducedMotion = usePrefersReducedMotion();

  /* ------------------------------------------------------- one-off plays */
  const [played, setPlayed] = useState<{ action: Action; key: number } | null>(null);
  const propAction = toAction(props.action);
  // A new action from props replaces anything started with play().
  useEffect(() => setPlayed(null), [propAction, props.actionKey]);

  const state: BuddyState = useMemo(() => ({
    mood: toMood(props.mood),
    action: played ? played.action : propAction,
    actionKey: played ? `play-${played.key}` : props.actionKey ?? 0,
    colour: toColour(props.colour),
    accessory: toAccessory(props.accessory),
    stage: toStage(props.stage),
    glow: !!props.glow,
    talking: !!props.talking,
    calm: props.calm ?? reducedMotion,
    look: props.look ?? null,
  }), [
    props.mood, propAction, props.actionKey, played, props.colour, props.accessory,
    props.stage, props.glow, props.talking, props.calm, reducedMotion,
    props.look?.x, props.look?.y, props.look == null,
  ]);

  /* ----------------------------------------------------------- renderer */
  const { phase, active, svgGone, onReady: onRiveReady, onFail: onRiveFail, mountRive } =
    useRivePhase(src, renderer);

  const onRendererChange = useRef(props.onRendererChange);
  onRendererChange.current = props.onRendererChange;
  useEffect(() => { onRendererChange.current?.(active); }, [active]);

  /* ------------------------------------------------------ callbacks */
  const latest = useRef(props);
  latest.current = props;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  const handleCue = useCallback((cue: Cue) => {
    audioRef.current?.cue(cue);
    latest.current.onCue?.(cue);
  }, []);
  const handleDone = useCallback((a: Action) => {
    setPlayed(null);
    latest.current.onActionDone?.(a);
  }, []);
  const handleTap = useCallback((part: TapPart) => {
    audioRef.current?.unlock();
    latest.current.onTap?.(part);
  }, []);

  /* ------------------------------------------------------ handles */
  const svgRef = useRef<RendererHandle>(null);
  const riveRef = useRef<RendererHandle>(null);
  const activeHandle = () => (phase === 'rive' ? riveRef.current : svgRef.current);
  const keyRef = useRef(0);

  useImperativeHandle(ref, () => ({
    play: (a) => setPlayed({ action: toAction(a), key: ++keyRef.current }),
    tapTummy: () => activeHandle()?.tapTummy(),
    tapHead: () => activeHandle()?.tapHead(),
    learn: () => activeHandle()?.learn(),
    get renderer() { return active; },
  }), [phase, active]);

  /* ------------------------------------------------------ mouth */
  const mouthProp = useRef(props.mouthOpen ?? 0);
  mouthProp.current = props.mouthOpen ?? 0;
  useEffect(() => {
    const push = (v: number) => {
      svgRef.current?.setMouth(v);
      riveRef.current?.setMouth(v);
    };
    if (!audio) {
      push(mouthProp.current);
      return;
    }
    let raf = 0;
    const loop = () => {
      push(Math.max(audio.getLevel(), mouthProp.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [audio, props.mouthOpen, phase]);

  /* ------------------------------------------------------ render */
  const svgCallbacks = phase === 'rive'
    ? {}
    : { onActionDone: handleDone, onCue: handleCue, onTap: handleTap };

  return (
    <div
      className={`qr-buddy${className ? ` ${className}` : ''}`}
      style={style}
      data-renderer={active}
      onPointerDown={audio ? () => audio.unlock() : undefined}
    >
      {!svgGone && (
        <SvgBuddy
          ref={svgRef}
          {...state}
          {...svgCallbacks}
          interactive={interactive && phase !== 'rive'}
          label={label}
        />
      )}

      {mountRive && src && (
        <div className="qr-buddy__rive">
          <Suspense fallback={null}>
            <RiveBuddy
              ref={riveRef}
              {...state}
              src={src}
              wasmUrl={wasmUrl}
              maxPixelRatio={maxPixelRatio}
              onReady={onRiveReady}
              onFail={onRiveFail}
              onActionDone={handleDone}
              onCue={handleCue}
              onTap={handleTap}
            />
          </Suspense>
        </div>
      )}

      {/* Keyboard and screen-reader access while the Rive canvas is showing. */}
      {phase === 'rive' && interactive && (
        <div className="qr-buddy__keys">
          <button type="button" onClick={() => riveRef.current?.tapHead()}>Pat the head</button>
          <button type="button" onClick={() => riveRef.current?.tapTummy()}>Tickle the tummy</button>
        </div>
      )}
      {phase === 'rive' && (
        <span className="qr-buddy__label" role="img" aria-label={label ?? `QR buddy, feeling ${state.mood}`} />
      )}
    </div>
  );
});

export default Buddy;
