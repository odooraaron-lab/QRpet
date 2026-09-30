'use client';
import { useEffect, useState } from 'react';
import { Buddy } from './Buddy';

/** The TV side of pairing: shows a 6-digit code and waits for the parent to type it in. */
export function TvPair({ base, colour, name, address }: { base: string; colour: string; name: string; address: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let device = '';
    try { device = localStorage.getItem('qb-tv-device') || ''; } catch { /* private mode */ }
    if (!device) { device = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join(''); try { localStorage.setItem('qb-tv-device', device); } catch { /* ignore */ } }
    let stop = false;
    const ask = async () => {
      try {
        const r = await fetch(`${base}/api/pair`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ device }) });
        const j = await r.json();
        if (j.paired) { window.location.reload(); return; }
        if (j.code) { setCode(j.code); setErr(''); } else if (j.error) setErr(j.error);
      } catch { setErr('Can’t reach the internet. Checking again…'); }
      if (!stop) setTimeout(ask, 4000);
    };
    ask();
    return () => { stop = true; };
  }, [base]);
  const pretty = name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <div className="world">
      <div className="floor" />
      <div className="overlay" style={{ justifyContent: 'flex-start', paddingTop: '6vh' }}>
        <div className="big-card">
          <h2>Connect {pretty} to this TV</h2>
          <p>On the parent page, tap <b>Connect a TV</b> and type this code:</p>
          <div style={{ fontFamily: 'var(--display)', fontSize: 'min(12vw, 11vh)', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ink)', margin: '10px 0' }}>{code ? `${code.slice(0, 3)} ${code.slice(3)}` : '… …'}</div>
          <p style={{ fontSize: 'min(3.4vw, 2.4vh)' }}>{err || `This TV remembers ${pretty} after that. Address: ${address}/tv`}</p>
        </div>
      </div>
      <div className="stage" style={{ width: 'min(36vw, 34vh)' }}><Buddy colour={colour} mood="happy" action="sway" /></div>
    </div>
  );
}
