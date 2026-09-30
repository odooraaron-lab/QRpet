# QR Buddy: what's built

The full concept and build plan (character, animation, sound, growth, UX, safety, pricing, pitch) is the
Claude Doc **QR: The Growing Digital Buddy — Concept & Build Plan**:
https://claude.ai/code/artifact/9a1c58bc-04b0-45a9-bdbc-4f24b3b288cb

This repo is phase 2 of that plan, the **working web MVP**. Decisions taken:

| Question from the plan | Decision |
| --- | --- |
| Buddy addresses | `teddy.myqr.co.nz`. The party site (party-kit) owns the wildcard and forwards buddy names here; both apps check each other before giving out a name. |
| Prices and trial | $4.99 a month or $39 a year, 7 days free (all set by env vars). |
| Character art | The designer's package (`src/components/buddy/`): a detailed SVG buddy now, which switches to `qr-buddy.riv` automatically once it's delivered (see README, Rive animation). |
| Sound | Stand-in: synthesised in the browser (Web Audio, C major pentatonic, volume-capped) plus the device's speech voice for numbers and parent messages (`src/lib/sound.ts`). |

## Built

- **Sales site** (`/`), sign-up wizard with live name check and live preview (`/start`), Stripe subscription
  Checkout with free trial, done page, privacy, terms, robots, sitemap.
- **Parent login** at `login.myqr.co.nz`: email sign-in links, no passwords.
- **The buddy** (`/b/<name>`, served as `<name>.myqr.co.nz`): egg hatch, greeting by name, today's reveal,
  parent messages read aloud, tap reactions, songs, count / colour / shape / peekaboo games, room that fills
  up over time, session limit with a friendly goodbye, daily cap, bedtime lullaby, screensaver, parent gate.
- **Growth engine**: 65 items across 10 tracks, one per visit day in the family's time zone, never twice a day
  (database unique key), learning sliders, no track three days running, holiday mode, stages Hatchling → Legend.
- **TV**: `/tv` shows a 6-digit code; the parent types it on the parent page. Phones become a big-button remote.
- **Parent page**: today, special moments (plays live on every open screen), dated messages, learning mix,
  play time and bedtime, colour / outfit / child's name, screens (remove, connect TV), printable QR card and
  lost-card replacement, timeline, Stripe billing portal, delete.
- **Admin**: sites and TV heartbeats reported to admin.myqr.co.nz under product `buddy`; disable / enable /
  resend email from the admin.

## v2 (after the first family test)

Why each change was made: [RESEARCH.md](RESEARCH.md).

- **Buddy code instead of email:** `MOON-TIGER-APPLE-27` opens the buddy on any device, typed at
  login.myqr.co.nz, on the buddy's own page or on the TV. It's also inside the QR card and printed under it.
  "New code" replaces it and signs out phones. Email is only for "forgot my code".
- **Parent PIN** (4 digits, changeable). The padlock is gone: press and hold the top-right corner for 3 seconds,
  then the PIN. Five wrong tries lock it for 10 minutes.
- **Egg stage:** visits 1–3 the egg wiggles and cracks more (eyes peek out on day 3). On visit 4 the child taps it
  8 times and it hatches (once per device).
- **Kid screen:** no text cards. One or two outlined words at most, briefly, with no background. Parent
  messages are read aloud, not shown. Three tools: 🍎 feed, 🎲 games, 🎵 sing.
- **Touch:** every tap on QR does something different; tapping the room pops a musical bubble.
- **Feeding:** eight snacks, reactions, full after six.
- **Sleep:** asleep at bedtime or after play time, where a tap gets a sleepy wave and back to sleep in about 5
  seconds. It also dozes after 2 idle minutes, and a tap wakes it properly.
- **Learning by age** (`src/lib/learning.ts`): 17 games across the 2-3 / 4-5 / 6+ bands. They unlock over the
  first two weeks and adapt a little to how well the child is doing. The parent sets the age and switches
  games on or off.
- **Parent page:** four tabs (Today, Learning, Settings, Access) with a bottom tab bar on phones, big buttons,
  and changes that save as you go.
- **Phones:** add to home screen (full screen), screen stays awake while playing, Guided Access / App
  pinning tips.

## Not built yet (later phases in the plan)

- Rive character and recorded sound set (needs the designer and animator).
- Capacitor app shell, push notifications, offline service worker.
- Family plan, printed kits, seasonal packs, early-learning centre plan.
