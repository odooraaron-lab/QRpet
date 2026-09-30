// Shared by server and browser code (the buddy's own colours are in components/buddy/buddy.css).
/** Swatches for pickers (sign-up, parent page, printed card). The buddy's own colours are in buddy/buddy.css. */
export const PALETTES: Record<string, { name: string; body: string; shade: string; edge: string; patch: string }> = {
  honey: { name: 'Honey', body: '#FFD36E', shade: '#F2B84B', edge: '#C98A1E', patch: '#FFEDC4' },
  mint: { name: 'Mint', body: '#A8E6CF', shade: '#7FD1B2', edge: '#3E9C7C', patch: '#DDF7EC' },
  sky: { name: 'Sky', body: '#A7D8FF', shade: '#7EBDF5', edge: '#3F86C9', patch: '#E1F0FF' },
  peach: { name: 'Peach', body: '#FFC8AE', shade: '#FFA98A', edge: '#D8785B', patch: '#FFE7DB' },
  lilac: { name: 'Lilac', body: '#D4C2FF', shade: '#B7A0F5', edge: '#7C62C9', patch: '#F0E8FF' },
  cloud: { name: 'Cloud', body: '#F5F5FA', shade: '#DCDCEA', edge: '#9D9DB5', patch: '#FFFFFF' },
};
