'use client';
import { useState } from 'react';

/** Parent page on a device that isn't signed in: the 4-digit parent PIN. */
export function PinForm({ base }: { base: string }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const r = await fetch(`${base}/api/pin`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ pin }) }).catch(() => null);
    if (r?.ok) { window.location.reload(); return; }
    const j = await r?.json().catch(() => ({}));
    setErr(j?.error || 'Something went wrong.'); setPin(''); setBusy(false);
  }
  return (
    <form onSubmit={go} className="code-entry">
      <label htmlFor="pin">Parent PIN</label>
      <input id="pin" type="password" inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ letterSpacing: '.5em', textAlign: 'center' }} />
      {err && <span className="status bad" role="alert">{err}</span>}
      <button className="btn block" disabled={busy || pin.length !== 4}>{busy ? 'Checking…' : 'Open the parent page'}</button>
    </form>
  );
}
