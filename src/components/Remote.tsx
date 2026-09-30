'use client';
import { useState } from 'react';
import { Buddy } from './Buddy';

const BUTTONS = [
  { c: 'hello', icon: '👋', label: 'Hello', bg: '#FFE7A8' },
  { c: 'sing', icon: '🎵', label: 'Sing', bg: '#D9C8FF' },
  { c: 'count', icon: '🔢', label: 'Count', bg: '#BFE3FF' },
  { c: 'dance', icon: '💃', label: 'Dance', bg: '#FFD0E0' },
  { c: 'peekaboo', icon: '🙈', label: 'Peekaboo', bg: '#CFF1E1' },
  { c: 'hug', icon: '🤗', label: 'Hug', bg: '#FFE0CC' },
];

/** A phone remote for QR on the TV: big picture buttons, no words needed. */
export function Remote({ base, colour, name }: { base: string; colour: string; name: string }) {
  const [sent, setSent] = useState('');
  async function send(c: string) {
    setSent(c);
    await fetch(`${base}/api/remote`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ command: c }) }).catch(() => {});
    setTimeout(() => setSent(''), 900);
  }
  return (
    <div className="world" style={{ overflowY: 'auto' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '20px 16px 40px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 84 }}><Buddy colour={colour} mood={sent ? 'grin' : 'happy'} action={sent ? 'hop' : 'idle'} /></div>
          <div><h1 style={{ fontSize: 28, margin: 0 }}>{name.charAt(0).toUpperCase() + name.slice(1)} on the TV</h1><p style={{ margin: 0, fontFamily: 'var(--font)', fontWeight: 700 }} className="muted">Tap a button, watch the TV!</p></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {BUTTONS.map((b) => (
            <button key={b.c} onClick={() => send(b.c)} style={{ background: b.bg, border: 0, borderRadius: 28, minHeight: 130, fontSize: 54, cursor: 'pointer', boxShadow: '0 12px 24px -14px rgba(46,33,64,.5)', transform: sent === b.c ? 'scale(.94)' : 'none', transition: 'transform .15s' }} aria-label={b.label}>
              {b.icon}<div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--display)' }}>{b.label}</div>
            </button>
          ))}
        </div>
        <p className="center" style={{ marginTop: 18 }}><a href={`${base}/`} style={{ fontFamily: 'var(--font)', fontWeight: 800 }}>Play on this phone instead</a></p>
      </div>
    </div>
  );
}
