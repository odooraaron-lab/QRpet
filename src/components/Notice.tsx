import { Buddy, type Mood } from './Buddy';

/** A full-screen friendly message in the buddy's world (not found, asleep, open with your code). For grown-ups to read. */
export function Notice({ title, text, mood = 'happy', colour = 'honey', link, children }: { title: string; text?: string; mood?: Mood; colour?: string; link?: { href: string; label: string }; children?: React.ReactNode }) {
  return (
    <div className="world" style={{ overflowY: 'auto' }}>
      <div className="floor" />
      <div className="overlay" style={{ justifyContent: 'flex-start', paddingTop: '5vh' }}>
        <div className="code-card">
          <h2>{title}</h2>
          {text && <p>{text}</p>}
          {children}
          {link && <p style={{ marginTop: 14, marginBottom: 0 }}><a className={children ? 'linkbtn' : 'btn'} href={link.href}>{link.label}</a></p>}
        </div>
      </div>
      <div className="stage" style={{ width: 'min(40vw, 30vh)', bottom: '4%' }}><Buddy colour={colour} mood={mood} action={mood === 'asleep' ? 'idle' : 'sway'} /></div>
    </div>
  );
}
