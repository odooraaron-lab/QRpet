'use client';
import { useState } from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setState('busy');
    const r = await fetch('/api/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (!r?.ok) { setError(j?.error || 'Something went wrong. Please try again.'); setState('idle'); return; }
    setState('sent');
  }
  if (state === 'sent') return <div className="notice" role="status">Check your inbox. If <b>{email}</b> has a buddy, its code and PIN are on the way.</div>;
  return (
    <form onSubmit={submit} className="panel">
      {error && <div className="error" role="alert">{error}</div>}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      </div>
      <button className="btn block" disabled={state === 'busy' || !email}>{state === 'busy' ? 'Sending…' : 'Email me my code'}</button>
    </form>
  );
}
