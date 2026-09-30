'use client';

/**
 * QR Egg — three taps to hatch. Uses the "Egg" artboard in qr-buddy.riv when it
 * can, otherwise the SVG egg. When `onHatched` fires, swap in <Buddy stage={0} />.
 */
import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { SvgEgg, type EggCue, type EggHandle } from './SvgEgg';
import type { BuddyAudio } from './buddyAudio';
import { toColour, type Colour } from './buddyTypes';
import { useRivePhase, type BuddyRenderer } from './useRivePhase';

const RiveEgg = lazy(() => import('./RiveEgg'));

export interface BuddyEggProps {
  colour?: Colour | number;
  /** Path to the Rive file (the Egg artboard lives in the same file). null = SVG only. */
  src?: string | null;
  wasmUrl?: string;
  renderer?: 'auto' | BuddyRenderer;
  calm?: boolean;
  audio?: BuddyAudio | null;
  interactive?: boolean;
  label?: string;
  className?: string;
  style?: CSSProperties;
  onCrack?: (n: number) => void;
  onHatched?: () => void;
  onRendererChange?: (renderer: BuddyRenderer) => void;
}

export interface BuddyEggHandle {
  tap(): void;
}

export const BuddyEgg = forwardRef<BuddyEggHandle, BuddyEggProps>(function BuddyEgg(props, ref) {
  const {
    src = '/rive/qr-buddy.riv',
    renderer = 'auto',
    audio = null,
    interactive = true,
    label,
    className,
    style,
  } = props;
  const colour = toColour(props.colour);
  const { phase, active, svgGone, onReady, onFail, mountRive } = useRivePhase(src, renderer);

  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
  }, []);
  const calm = props.calm ?? reduced;

  const latest = useRef(props);
  latest.current = props;
  const audioRef = useRef(audio);
  audioRef.current = audio;

  useEffect(() => { latest.current.onRendererChange?.(active); }, [active]);

  const onEggCue = useCallback((cue: EggCue, n?: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.unlock();
    if (cue === 'cueCrack') a.crack(n ?? 1);
    else a.play('land');
  }, []);
  const onCrack = useCallback((n: number) => latest.current.onCrack?.(n), []);
  const onHatched = useCallback(() => {
    audioRef.current?.play('hatch');
    latest.current.onHatched?.();
  }, []);

  const svgRef = useRef<EggHandle>(null);
  const riveRef = useRef<EggHandle>(null);
  useImperativeHandle(ref, () => ({
    tap: () => (phase === 'rive' ? riveRef.current : svgRef.current)?.tap(),
  }), [phase]);

  const svgCallbacks = phase === 'rive' ? {} : { onEggCue, onCrack, onHatched };

  return (
    <div className={`qr-buddy${className ? ` ${className}` : ''}`} style={style} data-renderer={active}>
      {!svgGone && (
        <SvgEgg
          ref={svgRef}
          colour={colour}
          calm={calm}
          interactive={interactive && phase !== 'rive'}
          label={label}
          {...svgCallbacks}
        />
      )}
      {mountRive && src && (
        <div className="qr-buddy__rive" onPointerDown={() => audioRef.current?.unlock()}>
          <Suspense fallback={null}>
            <RiveEgg
              ref={riveRef}
              src={src}
              wasmUrl={props.wasmUrl}
              colour={colour}
              onReady={onReady}
              onFail={onFail}
              onEggCue={onEggCue}
              onCrack={onCrack}
              onHatched={onHatched}
            />
          </Suspense>
        </div>
      )}
      {phase === 'rive' && interactive && (
        <div className="qr-buddy__keys">
          <button type="button" onClick={() => riveRef.current?.tap()}>Tap the egg</button>
        </div>
      )}
    </div>
  );
});

export default BuddyEgg;
