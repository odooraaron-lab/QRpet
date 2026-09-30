'use client';

import { useCallback, useEffect, useState } from 'react';

export type BuddyRenderer = 'svg' | 'rive';
type Phase = 'svg' | 'loading' | 'rive';

const LOAD_TIMEOUT_MS = 10000;
const CROSS_FADE_MS = 450;

/** True when this device can run the Rive WebGL2 runtime. */
export function canRunRive(): boolean {
  if (typeof window === 'undefined' || typeof WebAssembly !== 'object') return false;
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Starts on the SVG renderer, tries Rive in the background, and switches once the
 * Rive file has loaded and passed its contract check. Any failure keeps the SVG.
 */
export function useRivePhase(src: string | null | undefined, renderer: 'auto' | BuddyRenderer) {
  const wantRive = renderer !== 'svg' && !!src;
  const [phase, setPhase] = useState<Phase>('svg');
  const [svgGone, setSvgGone] = useState(false);

  useEffect(() => {
    if (!wantRive) {
      setPhase('svg');
      return;
    }
    if (!canRunRive()) {
      if (renderer === 'rive') {
        console.warn('[QR Buddy] This device cannot run Rive (needs WebGL2 and WebAssembly). Using SVG.');
      }
      setPhase('svg');
      return;
    }
    setPhase('loading');
    const t = window.setTimeout(() => setPhase((p) => (p === 'loading' ? 'svg' : p)), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [wantRive, src, renderer]);

  // Retire the SVG renderer after the cross-fade, so it stops using CPU.
  useEffect(() => {
    if (phase !== 'rive') {
      setSvgGone(false);
      return;
    }
    const t = window.setTimeout(() => setSvgGone(true), CROSS_FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const onReady = useCallback(() => setPhase('rive'), []);
  const onFail = useCallback((reason: string) => {
    console.warn(`[QR Buddy] Using SVG instead of Rive (${reason}).`);
    setPhase('svg');
  }, []);

  const active: BuddyRenderer = phase === 'rive' ? 'rive' : 'svg';
  return { phase, active, svgGone, onReady, onFail, mountRive: phase !== 'svg' && !!src };
}
