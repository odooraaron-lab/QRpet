// QR, drawn in SVG and animated with CSS (see "Buddy" in globals.css).
// This is the stand-in for the Rive rig: the same poses and moods, driven by the same props,
// so swapping in the designer's Rive file later only replaces this component.

export type Mood = 'happy' | 'grin' | 'surprised' | 'sing' | 'sleepy' | 'asleep' | 'shy' | 'proud' | 'think' | 'pout';
export type Action = 'idle' | 'bounce' | 'spin' | 'wave' | 'clap' | 'dance' | 'jump' | 'giggle' | 'hop' | 'hug' | 'hide' | 'sway' | 'float';

export const PALETTES: Record<string, { name: string; body: string; shade: string; edge: string; patch: string }> = {
  honey: { name: 'Honey', body: '#FFD98E', shade: '#F4B955', edge: '#C98B2E', patch: '#FFEDC4' },
  mint: { name: 'Mint', body: '#AEEBD2', shade: '#72CFA9', edge: '#3E9C78', patch: '#DDF7EC' },
  sky: { name: 'Sky', body: '#B4DAFF', shade: '#7DB6F0', edge: '#4A83C2', patch: '#E1F0FF' },
  peach: { name: 'Peach', body: '#FFCBB2', shade: '#F7A283', edge: '#C96A4B', patch: '#FFE7DB' },
  lilac: { name: 'Lilac', body: '#DCCBFF', shade: '#B39AF0', edge: '#7E62C4', patch: '#F0E8FF' },
  cloud: { name: 'Cloud', body: '#F6F3EE', shade: '#DDD6CB', edge: '#A89F92', patch: '#FFFFFF' },
};

const INK = '#2E2140';

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'sing':
    case 'surprised':
      return <ellipse className="qb-mouth-o" cx="200" cy="228" rx="13" ry={mood === 'sing' ? 15 : 11} fill={INK} />;
    case 'grin':
    case 'proud':
      return <path d="M172 218q28 34 56 0z" fill={INK} stroke={INK} strokeWidth="4" strokeLinejoin="round" />;
    case 'sleepy':
    case 'asleep':
      return <path d="M188 226q12 6 24 0" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />;
    case 'pout':
      return <path d="M186 230q14 -10 28 0" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />;
    case 'shy':
      return <path d="M190 222q10 8 20 0" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />;
    case 'think':
      return <path d="M186 226h26" stroke={INK} strokeWidth="5" fill="none" strokeLinecap="round" />;
    default:
      return <path d="M178 218q22 24 44 0" stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round" />;
  }
}

function Eyes({ mood }: { mood: Mood }) {
  if (mood === 'asleep' || mood === 'sleepy') {
    return (
      <g stroke={INK} strokeWidth="6" fill="none" strokeLinecap="round">
        <path d="M146 182q18 12 36 0" /><path d="M218 182q18 12 36 0" />
      </g>
    );
  }
  if (mood === 'grin') {
    return (
      <g stroke={INK} strokeWidth="7" fill="none" strokeLinecap="round">
        <path d="M146 188q18 -20 36 0" /><path d="M218 188q18 -20 36 0" />
      </g>
    );
  }
  const big = mood === 'surprised' ? 1.12 : 1;
  const eye = (cx: number) => (
    <g className="qb-eye">
      <ellipse cx={cx} cy="180" rx={21 * big} ry={25 * big} fill={INK} />
      <g className="qb-pupil">
        <circle cx={cx + 7} cy="170" r="8" fill="#fff" />
        <circle cx={cx - 6} cy="190" r="4" fill="#fff" opacity="0.85" />
      </g>
    </g>
  );
  return <g className="qb-eyes">{eye(164)}{eye(236)}</g>;
}

function Accessory({ id }: { id: string | null }) {
  switch (id) {
    case 'bow':
      return <g transform="translate(262 96) rotate(18)"><path d="M0 0l-30-18v36zM0 0l30-18v36z" fill="#FF7EB6" stroke="#D64F8C" strokeWidth="3" strokeLinejoin="round" /><circle r="9" fill="#FF9CC8" stroke="#D64F8C" strokeWidth="3" /></g>;
    case 'beanie':
      return <g><path d="M112 118q88 -86 176 0v10H112z" fill="#6FA8F5" stroke="#3D6FB8" strokeWidth="4" /><rect x="104" y="116" width="192" height="24" rx="12" fill="#FFD23F" stroke="#C99A12" strokeWidth="4" /></g>;
    case 'headphones':
      return <g fill="none" stroke="#2E2140" strokeWidth="10" strokeLinecap="round"><path d="M104 170q0 -96 96 -96t96 96" /><rect x="84" y="150" width="30" height="54" rx="14" fill="#FF9A3C" strokeWidth="5" /><rect x="286" y="150" width="30" height="54" rx="14" fill="#FF9A3C" strokeWidth="5" /></g>;
    case 'party':
      return <g transform="translate(208 30) rotate(10)"><path d="M0 0l-34 86h68z" fill="#9B6BDF" stroke="#6D45B0" strokeWidth="4" strokeLinejoin="round" /><circle cy="-4" r="11" fill="#FFD23F" stroke="#C99A12" strokeWidth="3" /><circle cx="-8" cy="52" r="5" fill="#FFD23F" /><circle cx="10" cy="34" r="5" fill="#fff" /><circle cx="14" cy="68" r="5" fill="#3FB984" /></g>;
    case 'glasses':
      return <g fill="none" stroke="#2E2140" strokeWidth="6"><circle cx="164" cy="180" r="32" /><circle cx="236" cy="180" r="32" /><path d="M196 178h8" /></g>;
    case 'flower':
      return <g transform="translate(118 100)">{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx="0" cy="-15" rx="10" ry="15" fill="#FFB3D1" stroke="#E07AA3" strokeWidth="2" transform={`rotate(${a})`} />)}<circle r="9" fill="#FFD23F" stroke="#C99A12" strokeWidth="2" /></g>;
    case 'scarf':
      return <g><path d="M112 262q88 34 176 0l4 26q-92 38 -184 0z" fill="#EF5B5B" stroke="#B83B3B" strokeWidth="4" strokeLinejoin="round" /><path d="M250 282l12 46h-26l-6 -40" fill="#EF5B5B" stroke="#B83B3B" strokeWidth="4" strokeLinejoin="round" /><path d="M140 272l6 -18M170 278l4 -20M200 280v-20M230 278l-4 -20M260 272l-6 -18" stroke="#fff" strokeWidth="5" opacity="0.8" /></g>;
    case 'crown':
      return <path d="M144 112l14 -48 24 30 18 -40 18 40 24 -30 14 48z" fill="#FFD23F" stroke="#C99A12" strokeWidth="5" strokeLinejoin="round" />;
    default:
      return null;
  }
}

export function Buddy({
  colour = 'honey', mood = 'happy', action = 'idle', accessory = null, glow = false, scale = 1, sticker = false, className = '', onTummy, onHead,
}: {
  colour?: string; mood?: Mood; action?: Action; accessory?: string | null; glow?: boolean; scale?: number; sticker?: boolean; className?: string;
  onTummy?: () => void; onHead?: () => void;
}) {
  const p = PALETTES[colour] ?? PALETTES.honey;
  const hideEyes = action === 'hide';
  return (
    <svg viewBox="0 0 400 400" className={`qb qb-${action} qb-mood-${mood} ${glow ? 'qb-glow' : ''} ${className}`} style={{ ['--qb-scale' as string]: scale }} role="img" aria-label="QR, your buddy">
      <defs>
        <radialGradient id={`qb-body-${colour}`} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.35" stopColor={p.body} />
          <stop offset="1" stopColor={p.shade} />
        </radialGradient>
        <radialGradient id="qb-glow-grad"><stop offset="0" stopColor="#FFE680" stopOpacity="0.9" /><stop offset="1" stopColor="#FFE680" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse className="qb-shadow" cx="200" cy="376" rx="104" ry="14" fill="#2E2140" opacity="0.12" />
      <g className="qb-body">
        {/* feet */}
        <ellipse cx="156" cy="352" rx="34" ry="20" fill={p.shade} stroke={p.edge} strokeWidth="4" />
        <ellipse cx="244" cy="352" rx="34" ry="20" fill={p.shade} stroke={p.edge} strokeWidth="4" />
        {/* tuft */}
        <g className="qb-tuft">
          <path d="M200 86q-6 -30 14 -46" stroke={p.edge} strokeWidth="7" fill="none" strokeLinecap="round" />
          {glow && <circle cx="216" cy="36" r="30" fill="url(#qb-glow-grad)" />}
          <circle cx="216" cy="38" r="13" fill={glow ? '#FFE680' : p.shade} stroke={p.edge} strokeWidth="4" />
        </g>
        {/* arms */}
        <g className="qb-arm qb-arm-l"><rect x="68" y="208" width="58" height="34" rx="17" fill={p.shade} stroke={p.edge} strokeWidth="4" /></g>
        <g className="qb-arm qb-arm-r"><rect x="274" y="208" width="58" height="34" rx="17" fill={p.shade} stroke={p.edge} strokeWidth="4" /></g>
        {/* body: a soft squircle */}
        <path onClick={onTummy} className="qb-torso" d="M200 82c78 0 112 20 116 110c4 96 -24 160 -116 160s-120 -64 -116 -160c4 -90 38 -110 116 -110z" fill={`url(#qb-body-${colour})`} stroke={p.edge} strokeWidth="5" />
        <path d="M200 96c64 0 94 16 98 94c3 80 -18 140 -98 140s-101 -60 -98 -140c4 -78 34 -94 98 -94z" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
        {/* tummy patches: three stitched QR corners */}
        <g opacity="0.9">
          {[[168, 262], [216, 262], [168, 302]].map(([x, y]) => (
            <g key={`${x}${y}`}><rect x={x} y={y} width="30" height="30" rx="9" fill={p.patch} stroke={p.edge} strokeWidth="3" strokeDasharray="4 4" /><rect x={x + 10} y={y + 10} width="10" height="10" rx="3" fill={p.edge} opacity="0.7" /></g>
          ))}
          <rect x="222" y="308" width="12" height="12" rx="3" fill={p.edge} opacity="0.5" />
        </g>
        {sticker && <path d="M262 286l5 10 11 2 -8 8 2 11 -10 -5 -10 5 2 -11 -8 -8 11 -2z" fill="#FFD23F" stroke="#C99A12" strokeWidth="2.5" strokeLinejoin="round" />}
        {/* face */}
        <g className="qb-face" onClick={onHead}>
          <rect x="120" y="120" width="160" height="80" fill="transparent" />
          {!hideEyes && <Eyes mood={mood} />}
          <ellipse cx="140" cy="214" rx="18" ry="11" fill="#FF8FB1" opacity={mood === 'shy' ? 0.85 : 0.55} />
          <ellipse cx="260" cy="214" rx="18" ry="11" fill="#FF8FB1" opacity={mood === 'shy' ? 0.85 : 0.55} />
          <Mouth mood={mood} />
        </g>
        {hideEyes && (
          <g>
            <rect x="126" y="160" width="74" height="42" rx="21" fill={p.shade} stroke={p.edge} strokeWidth="4" />
            <rect x="200" y="160" width="74" height="42" rx="21" fill={p.shade} stroke={p.edge} strokeWidth="4" />
          </g>
        )}
        <Accessory id={accessory} />
      </g>
    </svg>
  );
}
