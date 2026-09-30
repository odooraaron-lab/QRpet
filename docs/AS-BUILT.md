# QR Buddy: what's built

The full concept and build plan (character, animation, sound, growth, UX, safety, pricing, pitch) is the
Claude Doc **QR: The Growing Digital Buddy — Concept & Build Plan**:
https://claude.ai/code/artifact/9a1c58bc-04b0-45a9-bdbc-4f24b3b288cb

This repo is phase 2 of that plan, the **working web MVP**. Decisions taken:

| Question from the plan | Decision |
| --- | --- |
| Buddy addresses | `teddy.myqr.co.nz`. The party site (party-kit) owns the wildcard and forwards buddy names here; both apps check each other before giving out a name. |
| Prices and trial | $4.99 a month or $39 a year, 7 days free (all set by env vars). |
| Character art | Stand-in: an SVG character with CSS animation (`src/components/Buddy.tsx`), same poses and moods the Rive rig will have. Swapping in the designer's Rive file replaces that one component. |
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

## Not built yet (later phases in the plan)

- Rive character and recorded sound set (needs the designer and animator).
- Capacitor app shell, push notifications, offline service worker.
- Family plan, printed kits, seasonal packs, early-learning centre plan.
