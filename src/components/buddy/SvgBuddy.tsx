'use client';

/**
 * QR Buddy — SVG renderer.
 *
 * Runs everywhere with no downloads: it is the fallback while qr-buddy.riv loads,
 * on devices that can't run Rive, and the whole buddy until the .riv exists.
 * It follows the same contract and timings as the spec, so swapping renderers
 * changes nothing for the game.
 *
 * Rig, from the floor up: growth (stage) → react (taps, learn) → act (actions)
 * → tilt (mood posture) → breath → parts. Each layer animates only itself.
 */
import {
  type CSSProperties,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import {
  ACTION_CUES,
  ACTION_KIND,
  ACTION_MS,
  ASLEEP_ACTIONS,
  BLEND_MS,
  BOO_MS,
  GROW_MS,
  effectiveAction,
  type Action,
  type BuddyState,
  type Cue,
  type Mood,
  type RendererCallbacks,
  type RendererHandle,
} from './buddyTypes';

type Shown = Action | 'boo';
type Reaction = 'giggle' | 'surprise' | 'stir' | 'learn';
type Face = Mood | 'hug' | 'hide' | 'stir';

const REACTION_MS: Record<Reaction, number> = { giggle: 1000, surprise: 800, stir: 1000, learn: 1500 };
const REACTION_CUES: Record<Reaction, ReadonlyArray<readonly [number, Cue]>> = {
  giggle: [[0, 'cueGiggle']],
  surprise: [[560, 'cueLand']],
  stir: [],
  learn: [[200, 'cuePop']],
};

const BODY =
  'M200 172C262 172 296 186 296 246L296 306C296 352 266 368 200 368C134 368 104 352 104 306L104 246C104 186 138 172 200 172Z';
const LEAF = 'M0 2C-10 -8 -11 -28 0 -42C11 -28 10 -8 0 2Z';
const STAR = 'M0 -9Q1.5 -1.5 9 0Q1.5 1.5 0 9Q-1.5 1.5 -9 0Q-1.5 -1.5 0 -9Z';

function faceFor(mood: Mood, shown: Shown, reaction: Reaction | null): Face {
  if (reaction === 'giggle') return 'grin';
  if (reaction === 'surprise') return 'surprised';
  if (reaction === 'stir') return 'stir';
  if (reaction === 'learn') return 'proud';
  if (shown === 'giggle' || shown === 'boo') return 'grin';
  if (shown === 'eat') return 'sing';
  if (shown === 'shake') return 'pout';
  if (shown === 'hug') return 'hug';
  if (shown === 'hide') return 'hide';
  return mood;
}

function eyesFor(face: Face): 'open' | 'arc' | 'closed' {
  if (face === 'grin' || face === 'sing' || face === 'proud' || face === 'hug') return 'arc';
  if (face === 'asleep' || face === 'hide') return 'closed';
  return 'open';
}

function mouthFor(face: Face): string {
  switch (face) {
    case 'grin': return 'grin';
    case 'surprised':
    case 'sing': return 'o';
    case 'sleepy':
    case 'asleep':
    case 'stir': return 'small';
    case 'shy': return 'wobble';
    case 'proud': return 'proud';
    case 'think': return 'side';
    case 'pout': return 'pout';
    default: return 'smile';
  }
}

export interface SvgBuddyProps extends BuddyState, RendererCallbacks {
  /** Show tap areas on the head and tummy. */
  interactive?: boolean;
  /** Accessible name. */
  label?: string;
  className?: string;
}

export const SvgBuddy = forwardRef<RendererHandle, SvgBuddyProps>(function SvgBuddy(props, ref) {
  const {
    mood, action, actionKey, colour, accessory, stage, glow, talking, calm, look,
    interactive = true, label, className,
  } = props;

  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const rootRef = useRef<SVGSVGElement>(null);

  const cb = useRef<RendererCallbacks>({});
  cb.current = { onActionDone: props.onActionDone, onCue: props.onCue, onTap: props.onTap };
  const moodRef = useRef(mood);
  moodRef.current = mood;
  const calmRef = useRef(calm);
  calmRef.current = calm;

  /* ------------------------------------------------------------ timers */
  const actionTimers = useRef<number[]>([]);
  const reactTimers = useRef<number[]>([]);
  const clear = (list: { current: number[] }) => {
    list.current.forEach((t) => window.clearTimeout(t));
    list.current = [];
  };
  const later = (list: { current: number[] }, ms: number, fn: () => void) => {
    list.current.push(window.setTimeout(fn, ms));
  };
  useEffect(() => () => { clear(actionTimers); clear(reactTimers); }, []);

  const emit = useCallback((cue: Cue) => cb.current.onCue?.(cue), []);

  /* ------------------------------------------------------ action engine */
  const [shown, setShown] = useState<{ name: Shown; id: number; delay: number }>({ name: 'idle', id: 0, delay: 0 });
  const current = useRef<Shown>('idle');
  const idRef = useRef(0);
  const pendingBlend = useRef<Map<string, { t: string; o: string }> | null>(null);

  /** Remember where every moving part is, so the next move can blend from it. */
  const captureBlend = (): boolean => {
    const root = rootRef.current;
    if (!root || typeof getComputedStyle === 'undefined') return false;
    const map = new Map<string, { t: string; o: string }>();
    root.querySelectorAll<SVGElement>('[data-part]').forEach((el) => {
      const cs = getComputedStyle(el);
      const t = cs.transform;
      const o = cs.opacity;
      if ((t && t !== 'none') || o !== '1') map.set(el.dataset.part as string, { t: t || 'none', o });
    });
    pendingBlend.current = map;
    return map.size > 0;
  };

  const start = useCallback((name: Shown, reported: Action, next?: Action) => {
    clear(actionTimers);
    const blend = captureBlend();
    const delay = blend ? BLEND_MS : 0;
    const id = ++idRef.current;
    // Calm mode: a jump becomes a hop.
    const visual: Shown = calmRef.current && name === 'jump' ? 'hop' : name;
    current.current = name;
    setShown({ name: visual, id, delay });

    if (name === 'boo') {
      later(actionTimers, delay + BOO_MS, () => {
        if (idRef.current === id && next) start(next, next);
      });
      return;
    }

    const cueAction = visual as Action;
    const cues = ACTION_CUES[cueAction] ?? [];
    const kind = ACTION_KIND[name];
    const length = ACTION_MS[cueAction];

    if (kind === 'loop') {
      const cycle = (at: number) => {
        cues.forEach(([ms, cue]) => later(actionTimers, at + ms, () => idRef.current === id && emit(cue)));
        later(actionTimers, at + length, () => idRef.current === id && cycle(0));
      };
      if (cues.length) cycle(delay);
    } else {
      cues.forEach(([ms, cue]) => later(actionTimers, delay + ms, () => idRef.current === id && emit(cue)));
    }

    if (kind === 'once') {
      const total = delay + Math.max(length, ACTION_MS[name]);
      later(actionTimers, total, () => {
        if (idRef.current !== id) return;
        idRef.current += 1;
        current.current = 'idle';
        pendingBlend.current = null;
        setShown({ name: 'idle', id: idRef.current, delay: 0 });
        cb.current.onActionDone?.(reported);
      });
    }
  }, [emit]);

  const asleep = mood === 'asleep';
  const lastRequest = useRef<{ action: Action; key: number | string } | null>(null);
  useEffect(() => {
    const prev = lastRequest.current;
    lastRequest.current = { action, key: actionKey };
    const sleepChangedOnly = !!prev && prev.action === action && prev.key === actionKey;
    const playing = current.current;

    if (sleepChangedOnly) {
      if (asleep) {
        // Falling asleep: a play-once move finishes; loops not allowed while asleep settle to idle.
        if (playing === 'boo' || ACTION_KIND[playing] === 'once' || ASLEEP_ACTIONS.includes(playing)) return;
        start('idle', 'idle');
        return;
      }
      // Waking up: play the move that was waiting, if it isn't already playing.
      if (playing === action) return;
    }

    const next = effectiveAction(moodRef.current, action);
    if (playing === 'hide' && next !== 'hide') start('boo', next, next);
    else start(next, next);
  }, [action, actionKey, asleep, start]);

  // Blend: animate each part from where it was to where the new move starts.
  useLayoutEffect(() => {
    const map = pendingBlend.current;
    const root = rootRef.current;
    pendingBlend.current = null;
    if (!map || !root || shown.delay === 0) return;
    root.querySelectorAll<SVGElement>('[data-part]').forEach((el) => {
      const from = map.get(el.dataset.part as string);
      if (!from || typeof el.animate !== 'function') return;
      try {
        el.animate([{ transform: from.t, opacity: from.o }], {
          duration: BLEND_MS,
          easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
        });
      } catch {
        /* Very old browsers: the move simply starts from rest. */
      }
    });
  }, [shown.id, shown.delay]);

  /* --------------------------------------------------------- reactions */
  const [reaction, setReaction] = useState<{ name: Reaction; id: number } | null>(null);
  const reacting = useRef<Reaction | null>(null);

  const react = useCallback((name: Reaction): boolean => {
    if (reacting.current) return false; // one clean reaction at a time
    reacting.current = name;
    setReaction({ name, id: Date.now() });
    REACTION_CUES[name].forEach(([ms, cue]) => later(reactTimers, ms, () => emit(cue)));
    later(reactTimers, REACTION_MS[name], () => {
      reacting.current = null;
      setReaction(null);
    });
    return true;
  }, [emit]);

  const tapTummy = useCallback(() => {
    if (react(moodRef.current === 'asleep' ? 'stir' : 'giggle')) cb.current.onTap?.('tummy');
  }, [react]);
  const tapHead = useCallback(() => {
    if (react(moodRef.current === 'asleep' ? 'stir' : 'surprise')) cb.current.onTap?.('head');
  }, [react]);
  const learn = useCallback(() => { react('learn'); }, [react]);

  const setMouth = useCallback((v: number) => {
    rootRef.current?.style.setProperty('--mouth', (v < 0 ? 0 : v > 1 ? 1 : v).toFixed(3));
  }, []);

  useImperativeHandle(ref, () => ({ tapTummy, tapHead, learn, setMouth }), [tapTummy, tapHead, learn, setMouth]);

  /* ---------------------------------------------------------- idle life */

  // Random blinks every 3 to 7 s; about one in five is a double blink.
  useEffect(() => {
    let t = 0;
    const blinkOnce = () => {
      const root = rootRef.current;
      if (!root || root.dataset.eyes !== 'open') return;
      root.querySelectorAll<SVGElement>('.qr-lid-blink').forEach((el) => {
        if (typeof el.animate !== 'function') return;
        el.animate(
          [
            { transform: 'translateY(-58px)' },
            { transform: 'translateY(0px)', offset: 0.45 },
            { transform: 'translateY(-58px)' },
          ],
          { duration: 160, easing: 'ease-in-out' },
        );
      });
    };
    const schedule = () => {
      t = window.setTimeout(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          blinkOnce();
          if (Math.random() < 0.2) window.setTimeout(blinkOnce, 260);
        }
        schedule();
      }, 3000 + Math.random() * 4000);
    };
    schedule();
    return () => window.clearTimeout(t);
  }, []);

  // Eyes: follow a target, or wander every 2 to 5 s.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const set = (x: number, y: number) => {
      root.style.setProperty('--look-x', `${(x * 6).toFixed(2)}px`);
      root.style.setProperty('--look-y', `${(y * 5).toFixed(2)}px`);
      root.style.setProperty('--turn', `${(x * 3).toFixed(2)}px`);
    };
    if (look) {
      set(Math.max(-1, Math.min(1, look.x)), Math.max(-1, Math.min(1, look.y)));
      return;
    }
    let t = 0;
    const wander = () => {
      const centre = Math.random() < 0.35;
      set(centre ? 0 : (Math.random() * 2 - 1) * 0.8, centre ? 0 : (Math.random() * 2 - 1) * 0.6);
      t = window.setTimeout(wander, 2000 + Math.random() * 3000);
    };
    t = window.setTimeout(wander, 1200);
    return () => window.clearTimeout(t);
  }, [look?.x, look?.y, look === null]);

  // Sleepy: yawn cue when the mood arrives.
  const prevMood = useRef(mood);
  useEffect(() => {
    if (mood === 'sleepy' && prevMood.current !== 'sleepy') emit('cueYawn');
    prevMood.current = mood;
  }, [mood, emit]);

  // Stage change: a 1.2 s grow moment.
  const [growing, setGrowing] = useState(false);
  const prevStage = useRef(stage);
  useEffect(() => {
    if (prevStage.current === stage) return;
    prevStage.current = stage;
    setGrowing(true);
    const t = window.setTimeout(() => setGrowing(false), GROW_MS);
    return () => window.clearTimeout(t);
  }, [stage]);

  /* ------------------------------------------------------------ drawing */
  const face = faceFor(mood, shown.name, reaction?.name ?? null);
  const eyes = eyesFor(face);
  const mouth = mouthFor(face);

  const onKey = (fn: () => void) => (e: { key: string; preventDefault(): void }) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fn();
    }
  };

  const eye = (side: 'l' | 'r', cx: number) => (
    <g className={`qr-eye qr-eye--${side}`} transform={`translate(${cx} 234)`}>
      <g className="qr-eye-open">
        <ellipse rx="24" ry="27" fill="var(--sclera)" stroke="var(--ink)" strokeOpacity="0.12" strokeWidth="1.5" />
        <g clipPath={`url(#${uid}-eye)`}>
          <g className="qr-pupil">
            <ellipse cy="2" rx="16.5" ry="19.5" fill={`url(#${uid}-pupil)`} />
          </g>
          {/* Highlights stay put while the pupils move */}
          <circle cx="7" cy="-8" r="6" fill="#fff" />
          <circle cx="-7" cy="9" r="2.8" fill="#fff" opacity="0.9" />
          <ellipse className="qr-lid qr-lid-mood" rx="27" ry="30" />
          <ellipse className="qr-lid qr-lid-blink" rx="27" ry="30" />
        </g>
      </g>
      <g className="qr-eye-arc"><path d="M-15 6Q0 -12 15 6" strokeWidth="6" /></g>
      <g className="qr-eye-closed"><path d="M-15 -2Q0 10 15 -2" strokeWidth="5" /></g>
    </g>
  );

  const patch = (x: number, y: number) => (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-2.5" y="-2.5" width="21" height="21" rx="5.5" fill="none" stroke="var(--stitch)"
        strokeWidth="1.4" strokeDasharray="2.2 2.4" strokeLinecap="round" />
      <rect width="16" height="16" rx="4" fill="var(--patch-ink)" />
      <rect x="3" y="3" width="10" height="10" rx="2.5" fill="var(--patch-light)" />
      <rect x="5.5" y="5.5" width="5" height="5" rx="1.4" fill="var(--patch-ink)" />
    </g>
  );

  const arm = (side: 'l' | 'r', x: number) => (
    <g transform={`translate(${x} 272)`}>
      <g className={`qr-arm qr-arm--${side}`} data-part={`arm-${side}`}>
        <rect x="-11.5" y="-8" width="23" height="52" rx="11.5" className="qr-fill-body qr-line" strokeWidth="2" />
        <ellipse cx="0" cy="36" rx="7" ry="4" className="qr-fill-shade" opacity="0.6" />
      </g>
    </g>
  );

  const foot = (side: 'l' | 'r', x: number) => (
    <g transform={`translate(${x} 364)`}>
      <g className={`qr-foot qr-foot--${side}`} data-part={`foot-${side}`}>
        <ellipse rx="27" ry="12" className="qr-fill-shade qr-line" strokeWidth="2" />
        <ellipse cx="0" cy="-3" rx="15" ry="4" fill="#fff" opacity="0.25" />
      </g>
    </g>
  );

  return (
    <svg
      ref={rootRef}
      className={`qr${className ? ` ${className}` : ''}`}
      viewBox="0 0 400 400"
      role={interactive ? 'group' : 'img'}
      aria-label={label ?? `QR buddy, feeling ${mood}`}
      style={{ '--qr-delay': `${shown.delay}ms` } as CSSProperties}
      data-mood={mood}
      data-face={face}
      data-eyes={eyes}
      data-mouth={mouth}
      data-action={shown.name}
      data-react={reaction?.name ?? 'none'}
      data-colour={colour}
      data-acc={accessory}
      data-stage={stage}
      data-glow={glow ? 'true' : 'false'}
      data-calm={calm ? 'true' : 'false'}
      data-talking={talking ? 'true' : 'false'}
      data-growing={growing ? 'true' : 'false'}
    >
      <defs>
        <clipPath id={`${uid}-body`}><path d={BODY} /></clipPath>
        <clipPath id={`${uid}-eye`}><ellipse rx="24" ry="27" /></clipPath>
        <clipPath id={`${uid}-grin`}><path d="M-15 -5Q0 -6 15 -5Q13 13 0 15Q-13 13 -15 -5Z" /></clipPath>
        <radialGradient id={`${uid}-pupil`} cx="0.45" cy="0.62" r="0.7">
          <stop offset="0" stopColor="#6a5690" />
          <stop offset="0.55" stopColor="#35294f" />
          <stop offset="1" stopColor="#1f1830" />
        </radialGradient>
        <radialGradient id={`${uid}-glow`}>
          <stop offset="0" stopColor="#fff7c2" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#ffe680" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffe680" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="qr-growth">
        <ellipse className="qr-shadow" data-part="shadow" cx="200" cy="378" rx="80" ry="9" />

        <g className="qr-react">
          <g className="qr-act" data-part="act" key={shown.id}>
            <g className="qr-tilt">
              <g className="qr-breath">
                {/* Body */}
                <path d={BODY} className="qr-fill-body qr-line" strokeWidth="2.5" />
                <g clipPath={`url(#${uid}-body)`}>
                  <ellipse cx="200" cy="376" rx="124" ry="46" className="qr-fill-shade" opacity="0.75" />
                  <ellipse cx="200" cy="330" rx="58" ry="34" fill="#fff" opacity="0.26" />
                </g>
                <ellipse cx="152" cy="200" rx="30" ry="11" fill="#fff" opacity="0.4" transform="rotate(-20 152 200)" />

                {foot('l', 162)}
                {foot('r', 238)}

                {/* Three stitched QR corners, plus a few "data" stitches */}
                <g className="qr-patches" data-part="patches">
                  {patch(178, 312)}
                  {patch(206, 312)}
                  {patch(178, 334)}
                  <rect x="208" y="336" width="5" height="5" rx="1.2" fill="var(--patch-ink)" opacity="0.85" />
                  <rect x="216" y="342" width="5" height="5" rx="1.2" fill="var(--patch-ink)" opacity="0.85" />
                  <rect x="216" y="334" width="4" height="4" rx="1" fill="var(--patch-ink)" opacity="0.6" />
                </g>

                {/* Scarf sits under the face */}
                <g className="qr-acc qr-acc--scarf">
                  <path d="M106 282Q200 306 294 282L296 300Q200 326 104 300Z" fill="#ff6b6b" stroke="#d94b58" strokeWidth="2" />
                  <path d="M150 297Q200 312 250 297" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" fill="none" strokeDasharray="7 7" />
                  <path d="M248 300L262 348L244 346L236 305Z" fill="#ff6b6b" stroke="#d94b58" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M246 346v6M252 347v6M258 348v6" stroke="#d94b58" strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Face */}
                <g className="qr-face" data-part="face">
                  <g transform="translate(132 270)"><ellipse className="qr-cheek" rx="15" ry="9" /></g>
                  <g transform="translate(268 270)"><ellipse className="qr-cheek" rx="15" ry="9" /></g>
                  {eye('l', 164)}
                  {eye('r', 236)}

                  <g transform="translate(200 280)">
                    <g className="qr-mouth-shapes">
                      <g className="qr-mouth-shape qr-mouth--smile"><path className="qr-stroke" d="M-11 -3Q0 8 11 -3" strokeWidth="4.5" /></g>
                      <g className="qr-mouth-shape qr-mouth--proud"><path className="qr-stroke" d="M-15 -4Q0 10 15 -4" strokeWidth="4.5" /></g>
                      <g className="qr-mouth-shape qr-mouth--grin">
                        <path d="M-15 -5Q0 -6 15 -5Q13 13 0 15Q-13 13 -15 -5Z" fill="var(--mouth-dark)" />
                        <g clipPath={`url(#${uid}-grin)`}><ellipse cy="13" rx="9" ry="6" fill="var(--tongue)" /></g>
                      </g>
                      <g className="qr-mouth-shape qr-mouth--o"><ellipse rx="7" ry="8.5" fill="var(--mouth-dark)" /></g>
                      <g className="qr-mouth-shape qr-mouth--small"><path className="qr-stroke" d="M-6 -1Q0 3.5 6 -1" strokeWidth="4" /></g>
                      <g className="qr-mouth-shape qr-mouth--pout"><path className="qr-stroke" d="M-8 3Q0 -4 8 3" strokeWidth="4.5" /></g>
                      <g className="qr-mouth-shape qr-mouth--wobble"><path className="qr-stroke" d="M-10 0Q-5 4 0 1Q5 -2 10 2" strokeWidth="4" /></g>
                      <g className="qr-mouth-shape qr-mouth--side"><path className="qr-stroke" d="M-2 1Q6 5 13 -2" strokeWidth="4.5" /></g>
                    </g>
                    <g className="qr-mouth-yawn"><ellipse rx="9" ry="11" fill="var(--mouth-dark)" /></g>
                    <g className="qr-mouth-talk">
                      <ellipse cy="3" rx="11" ry="10" fill="var(--mouth-dark)" />
                      <ellipse cy="9" rx="7" ry="3.5" fill="var(--tongue)" />
                    </g>
                  </g>
                </g>

                {/* Accessories behind the tuft */}
                <g className="qr-acc qr-acc--glasses">
                  <circle cx="164" cy="234" r="31" fill="#fff" fillOpacity="0.12" stroke="#3a3152" strokeWidth="4.5" />
                  <circle cx="236" cy="234" r="31" fill="#fff" fillOpacity="0.12" stroke="#3a3152" strokeWidth="4.5" />
                  <path d="M195 229Q200 223 205 229M133 228L108 222M267 228L292 222" stroke="#3a3152" strokeWidth="4.5" fill="none" strokeLinecap="round" />
                </g>
                <g className="qr-acc qr-acc--headphones">
                  <path d="M112 232C112 150 288 150 288 232" stroke="#3a3152" strokeWidth="9" fill="none" strokeLinecap="round" />
                  <rect x="93" y="212" width="25" height="46" rx="12" fill="#ff7a9c" stroke="#3a3152" strokeWidth="3" />
                  <rect x="282" y="212" width="25" height="46" rx="12" fill="#ff7a9c" stroke="#3a3152" strokeWidth="3" />
                </g>
                <g className="qr-acc qr-acc--beanie">
                  <path d="M116 196C116 158 152 142 200 142C248 142 284 158 284 196Z" fill="#6c8cff" stroke="#4a68e0" strokeWidth="2.5" />
                  <path d="M112 188Q200 176 288 188L288 204Q200 193 112 204Z" fill="#587af0" stroke="#4a68e0" strokeWidth="2.5" strokeLinejoin="round" />
                  <path d="M128 187v14M144 185v14M160 184v14M176 183v14M192 183v14M208 183v14M224 183v14M240 184v14M256 185v14M272 187v14"
                    stroke="#fff" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />
                </g>
                <g className="qr-acc qr-acc--crown">
                  <path d="M170 176L170 156L184 168L200 148L216 168L230 156L230 176Z" fill="#ffc933" stroke="#d99a12" strokeWidth="2.5" strokeLinejoin="round" />
                  <circle cx="184" cy="170" r="3" fill="#ff6b8a" />
                  <circle cx="200" cy="166" r="3.5" fill="#5b8cff" />
                  <circle cx="216" cy="170" r="3" fill="#ff6b8a" />
                </g>

                {/* Tuft: grows with stage, glows while learning */}
                <g transform="translate(200 176)">
                  <g className="qr-tuft-grow">
                    <g className="qr-tuft" data-part="tuft">
                      <g className="qr-tuft-mood">
                        <g className="qr-glow">
                          <circle className="qr-glow-pulse" cy="-26" r="46" fill={`url(#${uid}-glow)`} />
                        </g>
                        <path className="qr-leaf--4 qr-fill-tuft qr-line" d={LEAF} strokeWidth="2" transform="rotate(62) scale(0.55)" />
                        <path className="qr-leaf--2 qr-fill-tuft qr-line" d={LEAF} strokeWidth="2" transform="rotate(-62) scale(0.55)" />
                        <path className="qr-fill-tuft qr-line" d={LEAF} strokeWidth="2" transform="rotate(-34) scale(0.78)" />
                        <path className="qr-fill-tuft qr-line" d={LEAF} strokeWidth="2" transform="rotate(30) scale(0.78)" />
                        <path className="qr-fill-tuft qr-line" d={LEAF} strokeWidth="2" />
                        <path d="M0 -3Q1.5 -20 0 -35" stroke="var(--deep)" strokeOpacity="0.35" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                      </g>
                    </g>
                  </g>
                </g>

                {/* Accessories in front of the tuft */}
                <g className="qr-acc qr-acc--bow">
                  <g transform="translate(242 186) rotate(18)">
                    <path d="M0 0C-6 -14 -24 -16 -24 -2C-24 10 -8 8 0 0Z" fill="#ff7a9c" stroke="#d9567a" strokeWidth="2" />
                    <path d="M0 0C6 -14 24 -16 24 -2C24 10 8 8 0 0Z" fill="#ff7a9c" stroke="#d9567a" strokeWidth="2" />
                    <path d="M-2 3L-10 17L-3 15ZM2 3L10 17L3 15Z" fill="#ff7a9c" stroke="#d9567a" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle r="5" fill="#ff5c86" stroke="#d9567a" strokeWidth="1.5" />
                  </g>
                </g>
                <g className="qr-acc qr-acc--flower">
                  <g transform="translate(136 192)">
                    {[0, 72, 144, 216, 288].map((a) => (
                      <ellipse key={a} cy="-9" rx="7" ry="10" fill="#fff" stroke="#f0b4c8" strokeWidth="1.5" transform={`rotate(${a})`} />
                    ))}
                    <circle r="6" fill="#ffd34d" stroke="#e8b420" strokeWidth="1.5" />
                  </g>
                </g>
                <g className="qr-acc qr-acc--partyHat">
                  <g transform="translate(164 182) rotate(-18)">
                    <path d="M-25 0L0 -62L25 0Q0 7 -25 0Z" fill="#8c6cff" stroke="#6a4de0" strokeWidth="2.5" strokeLinejoin="round" />
                    <path d="M-17 -20L13 -27M-9 -40L7 -44" stroke="#ffd34d" strokeWidth="5" strokeLinecap="round" />
                    <circle cy="-64" r="7" fill="#ffd34d" stroke="#e8b420" strokeWidth="1.5" />
                  </g>
                </g>

                {arm('l', 110)}
                {arm('r', 290)}
              </g>
            </g>
          </g>

          {/* Extras that float free of the body */}
          <g transform="translate(276 206)">
            <g className="qr-note qr-note--1">
              <ellipse rx="6" ry="4.5" transform="rotate(-20)" />
              <path d="M5 -1V-26Q12 -22 14 -14" fill="none" strokeWidth="2.5" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(300 222)">
            <g className="qr-note qr-note--2">
              <ellipse rx="5" ry="4" transform="rotate(-20)" />
              <path d="M4 -1V-22Q10 -18 12 -12" fill="none" strokeWidth="2.2" strokeLinecap="round" />
            </g>
          </g>
          <g transform="translate(262 190)"><g className="qr-z qr-z--1"><path d="M0 0H11L0 13H11" strokeWidth="3" /></g></g>
          <g transform="translate(284 176)"><g className="qr-z qr-z--2"><path d="M0 0H8L0 9H8" strokeWidth="2.5" /></g></g>

          <g className="qr-bulb">
            <g transform="translate(292 120)">
              <path d="M-26 -4H-34M26 -4H34M0 -30V-38M-19 -23L-25 -29M19 -23L25 -29" stroke="#ffcf3f" strokeWidth="3.5" strokeLinecap="round" />
              <circle cy="-4" r="17" fill="#ffe27a" stroke="#e0b02e" strokeWidth="2.5" />
              <path d="M-5 0Q0 -9 5 0" stroke="#e0a21e" strokeWidth="2" fill="none" strokeLinecap="round" />
              <rect x="-8" y="12" width="16" height="10" rx="3" fill="#b8b8c8" stroke="#8e8ea4" strokeWidth="1.5" />
            </g>
          </g>
          <g transform="translate(98 196)"><path className="qr-sparkle qr-sparkle--1" d={STAR} fill="#ffd84d" /></g>
          <g transform="translate(306 188)"><path className="qr-sparkle qr-sparkle--2" d={STAR} fill="#ffd84d" /></g>
          <g transform="translate(124 142) scale(0.8)"><path className="qr-sparkle qr-sparkle--3" d={STAR} fill="#ffd84d" /></g>
          <g transform="translate(316 262) scale(0.8)"><path className="qr-sparkle qr-sparkle--4" d={STAR} fill="#ffd84d" /></g>
        </g>

        {interactive && (
          <g>
            <rect
              className="qr-hit" x="112" y="138" width="176" height="100" rx="40"
              role="button" tabIndex={0} aria-label="Pat the head"
              onPointerDown={tapHead} onKeyDown={onKey(tapHead)}
            />
            <rect
              className="qr-hit" x="128" y="286" width="144" height="78" rx="34"
              role="button" tabIndex={0} aria-label="Tickle the tummy"
              onPointerDown={tapTummy} onKeyDown={onKey(tapTummy)}
            />
          </g>
        )}
      </g>
    </svg>
  );
});

export default SvgBuddy;
