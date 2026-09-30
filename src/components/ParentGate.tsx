'use client';
import { useRef, useState } from 'react';

/**
 * The grown-ups' way out of the buddy, with nothing a child can see: press and hold the top-right corner
 * for 3 seconds, then type the 4-digit parent PIN. (Explained on the parent page, under "Access".)
 */
export function ParentGate({ base }: { base: string }) {
  const [holding, setHolding] = useState(false);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const down = (e: React.PointerEvent) => {
    e.stopPropagation();
    setHolding(true);
    timer.current = setTimeout(() => { setHolding(false); setOpen(true); setPin(''); setErr(''); }, 3000);
  };
  const up = () => { setHolding(false); if (timer.current) clearTimeout(timer.current); };

  async function press(d: string) {
    if (d === 'x') { setPin(pin.slice(0, -1)); return; }
    const next = (pin + d).slice(0, 4);
    setPin(next); setErr('');
    if (next.length < 4) return;
    const r = await fetch(`${base}/api/pin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin: next }) }).catch(() => null);
    if (r?.ok) { window.location.href = `${base}/parent`; return; }
    const j = await r?.json().catch(() => ({}));
    setErr(j?.error || 'Wrong PIN'); setPin('');
  }

  return (
    <>
      <button className={`gate-spot${holding ? ' holding' : ''}`} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={(e) => e.preventDefault()} aria-label="Grown-ups: press and hold for 3 seconds" />
      {open && (
        <div className="pin-pad" onPointerDown={(e) => e.stopPropagation()} role="dialog" aria-label="Parent PIN">
          <div className="pin-box">
            <p>Grown-ups: parent PIN</p>
            <div className="pin-dots">{[0, 1, 2, 3].map((i) => <i key={i} className={i < pin.length ? 'on' : ''} />)}</div>
            {err && <p className="pin-err">{err}</p>}
            <div className="pin-keys">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0'].map((d) => <button key={d} onClick={() => press(d)} aria-label={d === 'x' ? 'Delete' : d}>{d === 'x' ? '⌫' : d}</button>)}
              <button onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
