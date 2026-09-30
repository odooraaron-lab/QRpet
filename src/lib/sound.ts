'use client';

// ─────────────────────────────────────────────────────────────
// QR'S VOICE
// Every sound is synthesised in the browser (Web Audio), so there are no files to load and it works offline.
// Rules: C major pentatonic only (nothing can clash), soft attacks, short, and a hard volume cap.
// Swap any of these for recorded sounds later without touching the player.
// ─────────────────────────────────────────────────────────────

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let level = 0.5;

const VOLUME = { low: 0.25, medium: 0.5, high: 0.75 };

/** Must be called from a tap (browsers only allow sound after the user touches the page). */
export function unlockAudio(volume: keyof typeof VOLUME = 'medium') {
  level = VOLUME[volume] ?? 0.5;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); // the volume cap: nothing jumps out
    comp.threshold.value = -18;
    comp.ratio.value = 8;
    master = ctx.createGain();
    master.gain.value = level;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (master) master.gain.value = level;
}

// C major pentatonic from C5: C D E G A, then the next octave.
const PENTA = [0, 2, 4, 7, 9];
export const noteHz = (step: number, base = 523.25) => base * Math.pow(2, (PENTA[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);

function tone(o: { hz: number; at?: number; dur?: number; type?: OscillatorType; gain?: number; bendTo?: number; attack?: number }) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + (o.at ?? 0);
  const dur = o.dur ?? 0.25;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.hz, t);
  if (o.bendTo) osc.frequency.exponentialRampToValueAtTime(o.bendTo, t + dur * 0.8);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain ?? 0.3, t + (o.attack ?? 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

/** A soft marimba-like note: a sine plus a quiet octave that fades fast. */
function mallet(hz: number, at = 0, dur = 0.5, gain = 0.28) {
  tone({ hz, at, dur, gain, type: 'sine', attack: 0.008 });
  tone({ hz: hz * 2, at, dur: dur * 0.35, gain: gain * 0.25, type: 'sine', attack: 0.005 });
  tone({ hz: hz * 4, at, dur: dur * 0.12, gain: gain * 0.08, type: 'triangle', attack: 0.003 });
}

export const sounds = {
  /** The signature call: two notes, G then high C, with a little upward bend. */
  boop() { tone({ hz: 784, dur: 0.18, bendTo: 830 }); tone({ hz: 1046.5, at: 0.17, dur: 0.3, bendTo: 1150 }); },
  giggle() { [0, 0.12, 0.24].forEach((at, i) => tone({ hz: 1320 - i * 140, at, dur: 0.1, type: 'triangle', gain: 0.18, bendTo: 1100 - i * 140 })); },
  hmm() { tone({ hz: 440, dur: 0.5, bendTo: 620, type: 'triangle', gain: 0.2, attack: 0.08 }); },
  pop() { tone({ hz: 900, dur: 0.07, bendTo: 300, type: 'square', gain: 0.08 }); tone({ hz: 660, at: 0.08, dur: 0.25, bendTo: 880 }); },
  yawn() { tone({ hz: 520, dur: 1.2, bendTo: 260, type: 'triangle', gain: 0.18, attack: 0.25 }); },
  trill() { [0, 1, 2, 3, 4].forEach((s, i) => mallet(noteHz(s + 5), i * 0.08, 0.3, 0.22)); },
  ding() { mallet(1568, 0, 1.4, 0.3); tone({ hz: 3136, dur: 0.8, gain: 0.05 }); },
  oops() { tone({ hz: 700, dur: 0.18, bendTo: 520, type: 'triangle', gain: 0.18 }); tone({ hz: 600, at: 0.2, dur: 0.25, bendTo: 700, type: 'triangle', gain: 0.18 }); },
  sparkle() { for (let i = 0; i < 9; i++) mallet(noteHz(10 + ((i * 3) % 7)), i * 0.11, 0.35, 0.12); },
  whoosh() { tone({ hz: 200, dur: 0.5, bendTo: 900, type: 'sine', gain: 0.08, attack: 0.2 }); },
  hatch() { [0, 0.25, 0.5].forEach((at) => tone({ hz: 300, at, dur: 0.08, type: 'square', gain: 0.05 })); setTimeout(() => sounds.trill(), 800); },
  /** One note per number, climbing the scale. */
  count(n: number) { mallet(noteHz(n - 1), 0, 0.45, 0.3); },
  cheer() { [0, 2, 4, 5, 7].forEach((s, i) => mallet(noteHz(s), i * 0.09, 0.4, 0.22)); mallet(noteHz(10), 0.5, 0.9, 0.25); },
};

// Short original melodies (steps on the pentatonic scale; -1 = rest).
export const SONGS: Record<string, { name: string; steps: number[]; beat: number }> = {
  hello: { name: 'Hello song', steps: [4, 7, 7, 5, 4, -1, 4, 5, 7, 9, 7, -1], beat: 0.32 },
  star: { name: 'Star song', steps: [0, 0, 4, 4, 5, 5, 4, -1, 3, 3, 2, 2, 1, 1, 0], beat: 0.34 },
  rain: { name: 'Rain song', steps: [7, 5, 7, 5, 4, 5, 4, 2, 4, 2, 0, -1, 0, 2, 4, 5, 7], beat: 0.24 },
  goodnight: { name: 'Goodnight song', steps: [4, 3, 2, 1, 2, 3, 4, -1, 2, 1, 0, -1, 0], beat: 0.5 },
  name: { name: 'Name song', steps: [3, 5, 7, 5], beat: 0.26 },
  lullaby: { name: 'Lullaby', steps: [4, 2, 4, 2, 3, 1, 0, -1, 1, 2, 3, 2, 1, 0], beat: 0.6 },
  birthday: { name: 'Birthday tune', steps: [0, 0, 1, 0, 3, 2, -1, 0, 0, 1, 0, 4, 3], beat: 0.34 },
};

/** Plays a melody; calls onNote for each note (for the floating-notes animation). Returns its length in ms. */
export function playSong(id: string, onNote?: (i: number) => void) {
  const s = SONGS[id] ?? SONGS.hello;
  s.steps.forEach((step, i) => {
    if (step < 0) return;
    mallet(noteHz(step), i * s.beat, s.beat * 1.6, 0.26);
    if (onNote) setTimeout(() => onNote(i), i * s.beat * 1000);
  });
  return Math.round(s.steps.length * s.beat * 1000) + 400;
}

/** Reads words aloud with the device's own voice, gently. Used for numbers and parent messages. */
export function say(text: string) {
  try {
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.25;
    u.volume = Math.min(1, level + 0.3);
    const v = speechSynthesis.getVoices().find((x) => /en[-_](NZ|AU|GB)/i.test(x.lang)) ?? speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch { /* no voice: the picture still shows it */ }
}
