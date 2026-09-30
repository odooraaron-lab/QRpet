'use client';

/**
 * QR Buddy — Rive renderer.
 *
 * Loads qr-buddy.riv (artboard "QR", state machine "Main", View Model "Buddy")
 * and drives it through data binding, exactly as the spec's control contract says.
 * Loaded lazily by Buddy.tsx, so devices that can't run Rive never download it.
 *
 * Needs: npm i @rive-app/react-webgl2
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceBoolean,
  useViewModelInstanceEnum,
  useViewModelInstanceNumber,
  useViewModelInstanceTrigger,
} from '@rive-app/react-webgl2';
import {
  ACTION_KIND,
  clamp01,
  clampUnit,
  type Action,
  type BuddyState,
  type Cue,
  type RendererCallbacks,
  type RendererHandle,
  type TapPart,
} from './buddyTypes';
import { useWasmUrl } from './riveWasm';

export interface RiveBuddyProps extends BuddyState, RendererCallbacks {
  src: string;
  artboard?: string;
  stateMachine?: string;
  viewModel?: string;
  /** Self-hosted Rive WASM (recommended for TVs and offline use). */
  wasmUrl?: string;
  /** Cap the canvas resolution on big, weak screens (e.g. 1.5 on 4K TVs). */
  maxPixelRatio?: number;
  className?: string;
  onReady?: () => void;
  onFail?: (reason: string) => void;
}

/** Every property the file must provide, from the spec. */
const CONTRACT: ReadonlyArray<readonly ['enum' | 'number' | 'boolean' | 'trigger', string, boolean]> = [
  // [type, name, required to run]
  ['enum', 'mood', true],
  ['enum', 'action', true],
  ['enum', 'colour', false],
  ['enum', 'accessory', false],
  ['number', 'stage', false],
  ['boolean', 'glow', false],
  ['number', 'mouthOpen', false],
  ['boolean', 'talking', false],
  ['number', 'lookX', false],
  ['number', 'lookY', false],
  ['boolean', 'lookAuto', false],
  ['boolean', 'calm', false],
  ['trigger', 'tapTummy', false],
  ['trigger', 'tapHead', false],
  ['trigger', 'learn', false],
  ['trigger', 'actionDone', false],
  ['trigger', 'cueStep', false],
  ['trigger', 'cueLand', false],
  ['trigger', 'cueClap', false],
  ['trigger', 'cueWhoosh', false],
  ['trigger', 'cueGiggle', false],
  ['trigger', 'cuePop', false],
  ['trigger', 'cueYawn', false],
];

const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter });

type Vmi = ReturnType<typeof useViewModelInstance>;
type CallbackRef = { current: RendererCallbacks };

/** Forward one cue trigger from the file to the app. */
function useCue(cue: Cue, vmi: Vmi, cb: CallbackRef) {
  const onTrigger = useCallback(() => cb.current.onCue?.(cue), [cue, cb]);
  useViewModelInstanceTrigger(cue, vmi, { onTrigger });
}

/** A tap trigger we can fire, which also reports taps made inside the file. */
function useTap(name: 'tapTummy' | 'tapHead', part: TapPart, vmi: Vmi, cb: CallbackRef) {
  const onTrigger = useCallback(() => cb.current.onTap?.(part), [part, cb]);
  return useViewModelInstanceTrigger(name, vmi, { onTrigger }).trigger;
}

export const RiveBuddy = forwardRef<RendererHandle, RiveBuddyProps>(function RiveBuddy(props, ref) {
  const {
    src, artboard = 'QR', stateMachine = 'Main', viewModel = 'Buddy', wasmUrl, maxPixelRatio,
    mood, actionKey, colour, accessory, stage, glow, talking, calm, look, className,
  } = props;

  useWasmUrl(wasmUrl);

  // Keep callbacks fresh without re-subscribing listeners.
  const cb = useRef<RiveBuddyProps>(props);
  cb.current = props;

  const options = useMemo(() => {
    const o: Record<string, unknown> = { shouldResizeCanvasToContainer: true };
    if (maxPixelRatio && typeof window !== 'undefined') {
      o.customDevicePixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
    }
    return o as Parameters<typeof useRive>[1];
  }, [maxPixelRatio]);

  const { rive, RiveComponent } = useRive(
    {
      src,
      artboard,
      stateMachines: stateMachine,
      autoplay: true,
      autoBind: false,
      layout: LAYOUT,
      onLoadError: () => cb.current.onFail?.('load-error'),
    },
    options,
  );

  const vm = useViewModel(rive, { name: viewModel });
  const vmi = useViewModelInstance(vm, { rive });

  /* ------------------------------------------------ app → buddy (hooks) */
  const { setValue: setMood } = useViewModelInstanceEnum('mood', vmi);
  const { setValue: setAction } = useViewModelInstanceEnum('action', vmi);
  const { setValue: setColour } = useViewModelInstanceEnum('colour', vmi);
  const { setValue: setAccessory } = useViewModelInstanceEnum('accessory', vmi);
  const { setValue: setStage } = useViewModelInstanceNumber('stage', vmi);
  const { setValue: setGlow } = useViewModelInstanceBoolean('glow', vmi);
  const { setValue: setTalking } = useViewModelInstanceBoolean('talking', vmi);
  const { setValue: setCalm } = useViewModelInstanceBoolean('calm', vmi);
  const { setValue: setLookAuto } = useViewModelInstanceBoolean('lookAuto', vmi);
  const { setValue: setLookX } = useViewModelInstanceNumber('lookX', vmi);
  const { setValue: setLookY } = useViewModelInstanceNumber('lookY', vmi);

  useEffect(() => { if (vmi) setMood(mood); }, [vmi, mood, setMood]);
  useEffect(() => { if (vmi) setColour(colour); }, [vmi, colour, setColour]);
  useEffect(() => { if (vmi) setAccessory(accessory); }, [vmi, accessory, setAccessory]);
  useEffect(() => { if (vmi) setStage(stage); }, [vmi, stage, setStage]);
  useEffect(() => { if (vmi) setGlow(glow); }, [vmi, glow, setGlow]);
  useEffect(() => { if (vmi) setTalking(talking); }, [vmi, talking, setTalking]);
  useEffect(() => { if (vmi) setCalm(calm); }, [vmi, calm, setCalm]);
  useEffect(() => {
    if (!vmi) return;
    if (look) {
      setLookAuto(false);
      setLookX(clampUnit(look.x));
      setLookY(clampUnit(look.y));
    } else {
      setLookAuto(true);
    }
  }, [vmi, look?.x, look?.y, look === null, setLookAuto, setLookX, setLookY]);

  /*
   * Actions. The state machine only reacts when the enum changes, so to replay
   * the same play-once move we pass through idle for two frames first.
   */
  // Moves the web app added after the v2 contract: play the nearest contract move until the .riv has them.
  const RIVE_FALLBACK: Partial<Record<Action, Action>> = { eat: 'hop', shake: 'giggle' };
  const action = RIVE_FALLBACK[props.action] ?? props.action;
  const sent = useRef<Action>('idle');
  useEffect(() => {
    if (!vmi) return;
    if (sent.current === action && ACTION_KIND[action] === 'once') {
      setAction('idle');
      let r2 = 0;
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => setAction(action));
      });
      return () => {
        cancelAnimationFrame(r1);
        cancelAnimationFrame(r2);
      };
    }
    sent.current = action;
    setAction(action);
  }, [vmi, action, actionKey, setAction]);

  /* ------------------------------------------------ buddy → app (triggers) */
  const onActionDone = useCallback(() => {
    const done = sent.current;
    sent.current = 'idle';
    setAction('idle'); // spec: the app resets action after actionDone
    cb.current.onActionDone?.(done);
  }, [setAction]);
  useViewModelInstanceTrigger('actionDone', vmi, { onTrigger: onActionDone });

  useCue('cueStep', vmi, cb);
  useCue('cueLand', vmi, cb);
  useCue('cueClap', vmi, cb);
  useCue('cueWhoosh', vmi, cb);
  useCue('cueGiggle', vmi, cb);
  useCue('cuePop', vmi, cb);
  useCue('cueYawn', vmi, cb);

  // Taps fired by the file's own hit areas (or by us) are reported to the app.
  const fireTummy = useTap('tapTummy', 'tummy', vmi, cb);
  const fireHead = useTap('tapHead', 'head', vmi, cb);
  const { trigger: fireLearn } = useViewModelInstanceTrigger('learn', vmi);

  /* ------------------------------------------------------------ lip-sync */
  // Set every frame, so write straight to the property instead of React state.
  const mouth = useMemo(() => (vmi ? vmi.number('mouthOpen') : null), [vmi]);
  const setMouth = useCallback((v: number) => {
    if (mouth) mouth.value = clamp01(v);
  }, [mouth]);

  useImperativeHandle(ref, () => ({
    tapTummy: () => fireTummy(),
    tapHead: () => fireHead(),
    learn: () => fireLearn(),
    setMouth,
  }), [fireTummy, fireHead, fireLearn, setMouth]);

  /* ------------------------------------------------ ready + contract check */
  useEffect(() => {
    if (!rive) return;
    if (vmi) {
      const missing = CONTRACT.filter(([type, name]) => !vmi[type](name));
      if (missing.length) {
        console.warn(
          `[QR Buddy] ${src} is missing: ${missing.map(([t, n]) => `${n} (${t})`).join(', ')}`,
        );
      }
      if (missing.some(([, , required]) => required)) {
        cb.current.onFail?.('contract');
        return;
      }
      cb.current.onReady?.();
      return;
    }
    // Loaded, but no "Buddy" View Model: probably an old inputs-only file.
    const t = window.setTimeout(() => cb.current.onFail?.('no-view-model'), 800);
    return () => window.clearTimeout(t);
  }, [rive, vmi, src]);

  return <RiveComponent className={className} aria-hidden="true" />;
});

export default RiveBuddy;
