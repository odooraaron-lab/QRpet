// The plush egg QR lives in for its first days. `crack` 0 to 6: 1 appears on egg day 2, 2 on day 3
// (with eyes peeking through), and on hatching day each tap cracks it a bit more.
export function Egg({ crack, peek, wobble, glow, colour }: { crack: number; peek: boolean; wobble: number; glow: boolean; colour: string }) {
  const INK = '#C99A55';
  return (
    <svg viewBox="0 0 200 240" className={`egg-svg${wobble ? ' wobble' : ''}${glow ? ' egg-glow' : ''}`} key={wobble} aria-hidden="true">
      <defs>
        <radialGradient id="egg-shade" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#fff" /><stop offset="0.6" stopColor="#FFF6E6" /><stop offset="1" stopColor="#F3DDB4" /></radialGradient>
      </defs>
      <ellipse cx="100" cy="228" rx="70" ry="9" fill="#2E2140" opacity="0.12" />
      <ellipse cx="100" cy="130" rx="84" ry="104" fill="url(#egg-shade)" stroke="#E7C98F" strokeWidth="6" />
      <circle cx="68" cy="96" r="14" fill={colour} opacity="0.9" /><circle cx="130" cy="150" r="18" fill="#B4DAFF" /><circle cx="88" cy="184" r="10" fill="#FFCBB2" /><circle cx="140" cy="84" r="8" fill="#DCCBFF" />
      {crack >= 1 && <path d="M58 118l16 10 12 -12 16 14 14 -10" stroke={INK} strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
      {crack >= 2 && (
        <>
          <path d="M116 120l16 -8 14 12 16 -8" stroke={INK} strokeWidth="5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {peek && (
            <g className="egg-peek">
              <path d="M76 124l10 -6 16 12 14 -8 10 6v12H76z" fill="#2E2140" opacity="0.85" />
              <g className="egg-eyes"><circle cx="92" cy="132" r="4" fill="#fff" /><circle cx="112" cy="132" r="4" fill="#fff" /></g>
            </g>
          )}
        </>
      )}
      {crack >= 3 && <path d="M40 150l14 -6 10 12 16 -10" stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
      {crack >= 4 && <path d="M60 60l12 12 14 -6 10 10" stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
      {crack >= 5 && <path d="M122 176l14 10 14 -10 12 8" stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
      {crack >= 6 && <path d="M96 30l6 18 -8 12 10 14" stroke={INK} strokeWidth="4" fill="none" strokeLinejoin="round" strokeLinecap="round" />}
    </svg>
  );
}
