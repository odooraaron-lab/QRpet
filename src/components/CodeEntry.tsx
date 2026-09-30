'use client';
import { useState } from 'react';

/**
 * Type the buddy code (MOON-TIGER-APPLE-27) to open the buddy on this device. On a buddy's own address it
 * goes straight to that buddy (`base`); on the login page it asks which buddy the code belongs to.
 */
export function CodeEntry({ base, tv = false, wrong = false, label = 'Buddy code' }: { base?: string; tv?: boolean; wrong?: boolean; label?: string }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState(wrong ? 'That code didn’t match. Check the spelling on your card.' : '');
  const [busy, setBusy] = useState(false);
  async function go(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (c.replace(/[^a-z0-9]/gi, '').length < 8) { setErr('Type the whole code, like MOON-TIGER-APPLE-27.'); return; }
    setBusy(true); setErr('');
    if (base !== undefined) { window.location.href = `${base}/go?c=${encodeURIComponent(c)}${tv ? '&tv=1' : ''}`; return; }
    const r = await fetch('/api/code', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: c, tv }) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (r?.ok && j?.url) { window.location.href = j.url; return; }
    setErr(j?.error || 'Something went wrong. Please try again.'); setBusy(false);
  }
  return (
    <form onSubmit={go} className="code-entry">
      <label htmlFor="code">{label}</label>
      <input id="code" type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="MOON-TIGER-APPLE-27" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={40} />
      {err && <span className="status bad" role="alert">{err}</span>}
      <button className="btn block" disabled={busy || !code.trim()}>{busy ? 'Opening…' : 'Open'}</button>
    </form>
  );
}
