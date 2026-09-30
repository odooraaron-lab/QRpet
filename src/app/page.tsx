import Link from 'next/link';
import { Buddy } from '@/components/Buddy';
import { SiteFoot, SiteHead } from '@/components/Site';
import { APP_URL, BUDDY_DOMAIN, PRICES, PRODUCT, TRIAL_DAYS } from '@/lib/config';

const FAQ = [
  ['What age is it for?', 'QR is designed for 2 to 6 year olds. Everything is big, tappable and spoken, so no reading is needed. You set the learning mix and the play limits.'],
  ['Does my child need an account or a tablet?', 'No accounts for kids, ever. You get a buddy code (like MOON-TIGER-APPLE-27): scan the printed QR card or type the code on any phone, tablet or smart TV and it remembers your buddy. Nothing to install.'],
  ['How does hatching work?', 'Your buddy arrives as an egg. Each visit it wiggles and cracks a little more, eyes peek out on day three, and on the fourth visit your child taps it open. Then it learns one new thing every day.'],
  ['What does “grows every day” mean?', 'Each day your child visits, QR learns one new thing: a sound, a move, a colour, a number, a song, a hat. Skipping a day loses nothing. It just picks up where it left off.'],
  ['What will my child learn?', 'You pick an age. Ages 2 to 3 play colours, shapes, animal sounds, big and small, counting to 5 and peekaboo. Ages 4 to 5 add counting to 10, how many, more or fewer, patterns, letters and memory pairs. Ages 6 and up add adding and taking away, first sounds of words and counting to 20. Every instruction is spoken, and nothing ever fails.'],
  ['Is there chat, ads or anything to buy?', 'No. There is no chat, no strangers, no ads, no links out and nothing to buy inside the buddy. Only you, on the parent page, can change things.'],
  ['How do screen-time limits work?', 'You pick how long one play lasts (QR says a friendly goodbye), a daily cap, and bedtime. At bedtime QR sings a lullaby and goes to sleep until the morning.'],
  ['Can I cancel?', TRIAL_DAYS > 0 ? `Yes, any time from the parent page. The first ${TRIAL_DAYS} days are free, and you won’t be charged if you cancel before the trial ends.` : 'Yes, any time from the parent page. Your buddy keeps working until the end of the period you’ve paid for.'],
  ['What do you store?', 'Your email, the buddy’s name and colour, your child’s first name (optional) and what QR has learned. No photos, no voice recordings, no location. See the privacy page.'],
];

export default function Home() {
  const example = BUDDY_DOMAIN ? `teddy.${BUDDY_DOMAIN}` : `${APP_URL.replace(/^https?:\/\//, '')}/b/teddy`;
  const ld = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'Product', name: PRODUCT, description: 'A gentle digital buddy for 2 to 6 year olds that learns one new thing every day.', brand: { '@type': 'Brand', name: 'myQR' },
        offers: [{ '@type': 'Offer', price: '4.99', priceCurrency: 'NZD', url: `${APP_URL}/start` }] },
      { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
    ],
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="hero">
        <SiteHead />
        <div className="wrap hero-in">
          <div>
            <span className="eyebrow">🥚 For 2 to 6 year olds · Made in NZ</span>
            <h1>A little buddy who grows every day</h1>
            <p className="lede">QR hatches on your TV or tablet, then learns one new thing each day your child visits: a giggle, a dance, counting to five, the colour blue. Gentle, ad-free and yours alone.</p>
            <div className="row">
              <Link href="/start" className="btn">Make your buddy</Link>
              <a href="#how" className="btn ghost">How it works</a>
            </div>
            <ul className="ticks">
              <li>{TRIAL_DAYS > 0 ? `${TRIAL_DAYS} days free, then ${PRICES.monthly.label}` : `Just ${PRICES.monthly.label}`}</li>
              <li>No ads, no chat, nothing to buy inside</li>
              <li>Its own address, like <b>{example}</b></li>
            </ul>
          </div>
          <div className="hero-stage">
            <span className="bubble">Boo-OP! I can count to 3!</span>
            <Buddy colour="honey" mood="grin" action="bounce" accessory="beanie" />
          </div>
        </div>
      </div>

      <section className="section" id="how">
        <div className="wrap">
          <h2 className="center">Three steps to hatching</h2>
          <ol className="steps">
            <li><h3>Name it and pick a colour</h3><p>Teddy, Moana, Pickle… the name becomes its own web address. Takes a minute.</p></li>
            <li><h3>Scan the card or type the code</h3><p>An egg arrives. It wiggles and cracks a little more each visit, and hatches on the fourth. Works on phones, tablets and TVs.</p></li>
            <li><h3>Visit every day</h3><p>Each visit, QR shows off something new it learned. You see the whole timeline on the parent page.</p></li>
          </ol>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--wash)' }}>
        <div className="wrap">
          <h2 className="center">What QR learns</h2>
          <p className="lede center" style={{ margin: '0 auto 24px' }}>Over 60 little skills, one a day, in a gentle order. Nudge the mix toward counting, colours, shapes, songs or feelings.</p>
          <div className="cards three">
            {[
              ['🔢', 'Counting', 'From 1 and 2 up to 10, then counting back down. Your child counts along.'],
              ['🎨', 'Colours and shapes', 'QR asks “which one is blue?” Big friendly buttons, lots of cheering.'],
              ['🎵', 'Songs and sounds', 'Hello song, twinkle, a birthday tune and a sleepy lullaby at bedtime.'],
              ['💛', 'Feelings', 'Happy, surprised, shy and proud faces, with words to match.'],
              ['🕺', 'Moves', 'Waves, claps, spins and a very serious dance.'],
              ['🎩', 'Outfits and room', 'A beanie, a crown, a window with stars, bunting for day 30.'],
            ].map(([e, t, d]) => <div className="card" key={t}><span className="big-emoji">{e}</span><h3>{t}</h3><p>{d}</p></div>)}
          </div>
        </div>
      </section>

      <section className="section" id="safety">
        <div className="wrap">
          <h2 className="center">Made for little kids, run by grown-ups</h2>
          <div className="cards">
            <div className="card"><span className="big-emoji">🔒</span><h3>A parent gate</h3><p>Settings sit behind a 2-second hold and your own sign-in link. Kids only ever see QR.</p></div>
            <div className="card"><span className="big-emoji">⏰</span><h3>Gentle limits</h3><p>Play length, a daily cap and bedtime. QR says goodbye nicely, so there’s no tug-of-war.</p></div>
            <div className="card"><span className="big-emoji">🙅</span><h3>No ads, chat or shop</h3><p>Nothing to tap that leads anywhere else. No strangers, no upsells, no loot boxes.</p></div>
            <div className="card"><span className="big-emoji">💌</span><h3>Your messages</h3><p>Leave “Well done at swimming!” for tomorrow. QR says it out loud when your child visits.</p></div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--lilac-soft)' }} id="pricing">
        <div className="wrap">
          <h2 className="center">Simple pricing</h2>
          <p className="lede center" style={{ margin: '0 auto 24px' }}>{TRIAL_DAYS > 0 ? `${TRIAL_DAYS} days free. ` : ''}Cancel any time from the parent page.</p>
          <div className="price-row">
            <div className="price"><h3>Monthly</h3><div className="amount">{PRICES.monthly.label.replace(/ a month/, '')}</div><p className="muted">a month</p><Link href="/start?plan=monthly" className="btn ghost block">{TRIAL_DAYS > 0 ? 'Start free trial' : 'Choose monthly'}</Link></div>
            <div className="price best"><h3>Yearly</h3><div className="amount">{PRICES.yearly.label.replace(/ a year/, '')}</div><p className="muted">a year (best value)</p><Link href="/start?plan=yearly" className="btn block">{TRIAL_DAYS > 0 ? 'Start free trial' : 'Choose yearly'}</Link></div>
          </div>
        </div>
      </section>

      <section className="section" id="questions">
        <div className="wrap">
          <h2 className="center">Questions</h2>
          <div className="faq" style={{ margin: '0 auto' }}>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
          <p className="center" style={{ marginTop: 28 }}><Link href="/start" className="btn">Make your buddy</Link></p>
        </div>
      </section>
      <SiteFoot />
    </>
  );
}
