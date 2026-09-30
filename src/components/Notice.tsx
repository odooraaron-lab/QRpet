import { Buddy, type Mood } from './Buddy';

/** A full-screen friendly message in the buddy's world (not found, asleep, ask a grown-up). */
export function Notice({ title, text, mood = 'happy', colour = 'honey', link }: { title: string; text?: string; mood?: Mood; colour?: string; link?: { href: string; label: string } }) {
  return (
    <div className="world">
      <div className="floor" />
      <div className="overlay" style={{ justifyContent: 'flex-start', paddingTop: '8vh' }}>
        <div className="big-card">
          <h2>{title}</h2>
          {text && <p>{text}</p>}
          {link && <p style={{ marginTop: 14 }}><a className="btn" href={link.href}>{link.label}</a></p>}
        </div>
      </div>
      <div className="stage" style={{ width: 'min(46vw, 40vh)' }}><Buddy colour={colour} mood={mood} action={mood === 'asleep' ? 'idle' : 'sway'} /></div>
    </div>
  );
}
