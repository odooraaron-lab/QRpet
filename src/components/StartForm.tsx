'use client';
import { useEffect, useRef, useState } from 'react';
import { Buddy, PALETTES } from './Buddy';

type Plan = 'monthly' | 'yearly';

export function StartForm({ domain, prices, trialDays, initialPlan, cancelled }: {
  domain: string; prices: Record<Plan, string>; trialDays: number; initialPlan: Plan; cancelled: boolean;
}) {
  const [name, setName] = useState('');
  const [check, setCheck] = useState<{ state: 'idle' | 'checking' | 'ok' | 'bad'; reason?: string; slug?: string }>({ state: 'idle' });
  const [colour, setColour] = useState('honey');
  const [childName, setChildName] = useState('');
  const [ageBand, setAgeBand] = useState('4-5');
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(cancelled ? 'Payment was cancelled. Your details are still here: try again when you’re ready.' : '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24);
  const pretty = slug ? slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ') : 'Your buddy';

  useEffect(() => {
    clearTimeout(timer.current);
    if (!slug) { setCheck({ state: 'idle' }); return; }
    setCheck({ state: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/name?n=${encodeURIComponent(slug)}`).then((x) => x.json());
        setCheck(r.ok ? { state: 'ok', slug: r.slug } : { state: 'bad', reason: r.reason, slug: r.slug });
      } catch { setCheck({ state: 'idle' }); }
    }, 350);
  }, [slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (check.state === 'bad') { setError(check.reason || 'Please pick another name.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: slug, colour, childName, ageBand, email, plan, trap: ((e.target as HTMLFormElement).elements.namedItem('qb_trap_x7') as HTMLInputElement | null)?.value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.url) { setError(j.error || 'Something went wrong. Please try again.'); setBusy(false); return; }
      window.location.href = j.url;
    } catch {
      setError('Couldn’t reach us. Check your connection and try again.');
      setBusy(false);
    }
  }

  return (
    <div className="wizard">
      <form onSubmit={submit} className="panel" noValidate>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="field">
          <label htmlFor="name">1. Name your buddy</label>
          <div className="addr">
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="teddy" autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={24} required />
            <span>.{domain}</span>
          </div>
          <span className={`status ${check.state === 'ok' ? 'ok' : check.state === 'bad' ? 'bad' : ''}`} aria-live="polite">
            {check.state === 'checking' && 'Checking…'}
            {check.state === 'ok' && `✓ ${slug}.${domain} is free`}
            {check.state === 'bad' && check.reason}
            {check.state === 'idle' && <span className="help">Letters, numbers and dashes. This is also its web address.</span>}
          </span>
        </div>
        <div className="field">
          <span className="label" id="colour-l">2. Pick a colour</span>
          <div className="swatches" role="group" aria-labelledby="colour-l">
            {Object.entries(PALETTES).map(([id, p]) => (
              <button key={id} type="button" className="swatch" aria-pressed={colour === id} aria-label={p.name} title={p.name} onClick={() => setColour(id)} style={{ background: `linear-gradient(145deg, ${p.body}, ${p.shade})` }} />
            ))}
          </div>
        </div>
        <div className="two">
          <div className="field">
            <label htmlFor="child">3. Your child’s first name</label>
            <input id="child" type="text" value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Optional" maxLength={24} autoComplete="off" />
            <span className="help">QR says it when saying hello.</span>
          </div>
          <div className="field">
            <span className="label" id="age-l">Age</span>
            <div className="chips" role="group" aria-labelledby="age-l">
              {['2-3', '4-5', '6+'].map((a) => <button type="button" key={a} className="chip" aria-pressed={ageBand === a} onClick={() => setAgeBand(a)}>{a}</button>)}
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">4. Your email (the grown-up’s)</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          <span className="help">For your sign-in link and receipts. Never shown to your child.</span>
        </div>
        <div className="field">
          <span className="label" id="plan-l">5. Plan</span>
          <div className="chips" role="group" aria-labelledby="plan-l">
            <button type="button" className="chip" aria-pressed={plan === 'monthly'} onClick={() => setPlan('monthly')}>{prices.monthly}</button>
            <button type="button" className="chip" aria-pressed={plan === 'yearly'} onClick={() => setPlan('yearly')}>{prices.yearly}</button>
          </div>
          {trialDays > 0 && <span className="help">First {trialDays} days free. Cancel any time before and you won’t be charged.</span>}
        </div>
        {/* Spam trap: people never see it. The name is deliberately one that browser autofill doesn't recognise. */}
        <input type="text" name="qb_trap_x7" tabIndex={-1} autoComplete="new-password" aria-hidden="true" style={{ position: 'absolute', left: -9999 }} />
        <button className="btn block" disabled={busy || !slug || !email}>{busy ? 'One moment…' : trialDays > 0 ? `Start ${trialDays} free days` : 'Continue to payment'}</button>
        <p className="help center" style={{ marginTop: 10 }}>Secure payment by Stripe. No ads, no chat, nothing to buy inside.</p>
      </form>
      <div className="preview-col">
        <div className="hero-stage">
          <span className="bubble">{childName.trim() ? `Hi ${childName.trim()}!` : 'Boo-OP!'}</span>
          <Buddy colour={colour} mood="grin" action="bounce" />
        </div>
        <p className="center" style={{ marginTop: 12, fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800 }}>{pretty}</p>
      </div>
    </div>
  );
}
