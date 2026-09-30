'use client';

/**
 * QR Egg — Rive renderer: artboard "Egg", View Model "Egg" (spec: Egg and hatch).
 * tap (trigger in), colour (enum in), cracks (number out), cueCrack + hatched (triggers out).
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Alignment,
  Fit,
  Layout,
  useRive,
  useViewModel,
  useViewModelInstance,
  useViewModelInstanceEnum,
  useViewModelInstanceTrigger,
} from '@rive-app/react-webgl2';
import type { Colour } from './buddyTypes';
import type { EggCallbacks, EggHandle } from './SvgEgg';
import { useWasmUrl } from './riveWasm';

export interface RiveEggProps extends EggCallbacks {
  src: string;
  colour: Colour;
  artboard?: string;
  stateMachine?: string;
  viewModel?: string;
  wasmUrl?: string;
  className?: string;
  onReady?: () => void;
  onFail?: (reason: string) => void;
}

const LAYOUT = new Layout({ fit: Fit.Contain, alignment: Alignment.BottomCenter });

export const RiveEgg = forwardRef<EggHandle, RiveEggProps>(function RiveEgg(props, ref) {
  const { src, colour, artboard = 'Egg', stateMachine = 'Main', viewModel = 'Egg', wasmUrl, className } = props;
  useWasmUrl(wasmUrl);
  const cb = useRef<RiveEggProps>(props);
  cb.current = props;

  const { rive, RiveComponent } = useRive({
    src,
    artboard,
    stateMachines: stateMachine,
    autoplay: true,
    autoBind: false,
    layout: LAYOUT,
    onLoadError: () => cb.current.onFail?.('load-error'),
  });
  const vm = useViewModel(rive, { name: viewModel });
  const vmi = useViewModelInstance(vm, { rive });

  const { setValue: setColour } = useViewModelInstanceEnum('colour', vmi);
  useEffect(() => { if (vmi) setColour(colour); }, [vmi, colour, setColour]);

  const { trigger: fireTap } = useViewModelInstanceTrigger('tap', vmi);

  const onCrack = useCallback(() => {
    const n = Math.round(vmi?.number('cracks')?.value ?? 0);
    cb.current.onEggCue?.('cueCrack', n);
    cb.current.onCrack?.(n);
  }, [vmi]);
  useViewModelInstanceTrigger('cueCrack', vmi, { onTrigger: onCrack });

  const onHatched = useCallback(() => cb.current.onHatched?.(), []);
  useViewModelInstanceTrigger('hatched', vmi, { onTrigger: onHatched });

  useImperativeHandle(ref, () => ({ tap: () => fireTap() }), [fireTap]);

  useEffect(() => {
    if (!rive) return;
    if (vmi) {
      if (!vmi.trigger('tap')) {
        cb.current.onFail?.('contract');
        return;
      }
      cb.current.onReady?.();
      return;
    }
    const t = window.setTimeout(() => cb.current.onFail?.('no-egg-view-model'), 800);
    return () => window.clearTimeout(t);
  }, [rive, vmi]);

  return <RiveComponent className={className} aria-hidden="true" />;
});

export default RiveEgg;
