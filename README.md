# QR Buddy

A gentle digital buddy for 2 to 6 year olds, by myQR. QR hatches on the family TV or tablet and learns one
new thing every day the child visits. Parents steer it from a parent page. No ads, no chat, nothing to buy
inside.

- Sales site and sign-up: **create.myqr.co.nz**
- Parent login: **login.myqr.co.nz**
- Each buddy: **teddy.myqr.co.nz** (the TV at `/tv`, the parent page at `/parent`)

Concept and plan: [docs/AS-BUILT.md](docs/AS-BUILT.md) (links the full concept doc).

Stack: Next.js 15, React 19, Neon Postgres, Stripe subscriptions, Resend, Vercel.

## Run it on your computer

```bash
npm install
# a local Postgres, e.g.  createuser qb -P ; createdb -O qb qbdev
echo 'DATABASE_URL=postgres://qb:qb@localhost:5432/qbdev' > .env.local
npm run dev
```

Tables create themselves on first use (same SQL in `sql/schema.sql`). Without Stripe keys, sign-up skips
payment. Without Resend, emails (with the sign-in link) are printed in the terminal.

Shortcuts, local only:

- `/api/dev/seed?name=teddy&days=24&age=2-3&awake=1` makes a buddy that is 24 days old and signs this browser
  in as both the child's device and the parent. `days=0` to `3` shows the egg days (3 = hatching day).
  Add `&reset=1` to start again, `&colour=mint`, `&tv=1` for TV mode, and `&awake=1` to switch bedtime off.
- `teddy.localhost:3000` works like `teddy.myqr.co.nz` when you set `BUDDY_DOMAIN=localhost`.

## Deploy (Vercel)

1. **New project** from this repo. Framework: Next.js.
2. **Environment variables**: copy `.env.example`, fill it in and paste the whole thing into
   Settings → Environment Variables. You need at least:
   - `DATABASE_URL`
   - `SESSION_SECRET` (a long random string)
   - the Stripe keys and prices
   - `RESEND_API_KEY`
   - `HQ_SECRET`
   - `CRON_SECRET`
3. **Domains** (Settings → Domains): add `create.myqr.co.nz` and `login.myqr.co.nz`.
   - Do **not** add `*.myqr.co.nz`: the party site already owns the wildcard.
   - The party site forwards buddy names here (see below).
4. **Stripe**:
   - Make a product "QR Buddy" with two recurring prices: $4.99 NZD monthly and $39 NZD yearly. Put their
     IDs in `STRIPE_PRICE_MONTHLY` and `STRIPE_PRICE_YEARLY`.
   - Add a webhook endpoint at `https://create.myqr.co.nz/api/stripe/webhook` with these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
   - Turn on the customer portal (Settings → Billing → Customer portal). Parents use it for receipts, card
     changes and cancelling.
   - Every myQR app shares the Stripe account. This app only acts on events tagged `metadata.product = buddy`.
5. **Admin**: in admin.myqr.co.nz add a product with code `buddy`, or set `HQ_PRODUCT` to whatever code you
   use. Set its action URL to `https://create.myqr.co.nz/api/hq/action` and give both sides the same
   `HQ_SECRET`.
6. **Party site** (party-kit): set `BUDDY_ORIGIN=https://create.myqr.co.nz` there and redeploy it.
   - `teddy.myqr.co.nz` is then forwarded to this app.
   - New parties never take a buddy's name.
   - This app asks the party site (`PARTY_SITE_URL/api/slug-status`) before giving out a name.
7. **Assets**: keep `ASSET_PREFIX=https://create.myqr.co.nz`. Buddy pages are served through the party
   site's domain, so their scripts must load from this app's own address.

## How it fits together

| Path | What |
| --- | --- |
| `src/lib/growth.ts` | The catalogue of everything QR learns, stages, and what QR can do from what it has learned |
| `src/lib/buddies.ts` | Database access; `visitToday` is the daily step (one unlock per visit day) |
| `src/components/buddy/` | The designer's character package: SVG buddy (works today) that switches to the Rive file when `NEXT_PUBLIC_BUDDY_RIVE` is set; `buddy.css` holds its drawing and moves |
| `src/components/Buddy.tsx` | Thin adapter: the app's props (colour, mood, action, accessory, stage, taps) → the package |
| `src/components/Player.tsx` | The child's screen: hatch, greet, reveal, games, songs, limits, bedtime |
| `src/lib/sound.ts` | Synthesised sounds and songs (to be replaced by the recorded set) |
| `src/components/Dashboard.tsx` + `src/app/b/[slug]/api/parent` | Parent page and its actions |
| `src/app/b/[slug]/go` | The QR card's target: checks the card key and remembers this device |
| `src/app/b/[slug]/tv`, `api/pair` | TV pairing with a 6-digit code |
| `src/app/api/start`, `api/stripe/webhook`, `start/done` | Sign-up and payment |
| `src/middleware.ts` | `login.` host → `/login`; `teddy.<BUDDY_DOMAIN>` → `/b/teddy` |

Who can open a buddy:

- A device that scanned the card or typed the **buddy code** (e.g. `MOON-TIGER-APPLE-27`, stored in
  `card_key`). It gets a random token, stored hashed.
- A paired TV.
- The parent. The **parent PIN** (4 digits) opens the parent page, including from inside the buddy: press and
  hold the top-right corner for 3 seconds. There's also a one-day link in the "forgot my code" email. The
  parent session is signed with `SESSION_SECRET` and lasts 30 days.

Anyone else sees a box to type the buddy code. "New code" on the parent page replaces the code and card and
signs out phones that used the old one. Age-based games live in `src/lib/learning.ts` and
`src/components/Games.tsx`. Research notes are in [docs/RESEARCH.md](docs/RESEARCH.md).

## Rive animation

The character package in `src/components/buddy/` shows the SVG buddy and, when a Rive file is configured,
cross-fades to it after checking it has artboard `QR`, state machine `Main` and View Model `Buddy`.

1. Put `qr-buddy.riv` in `public/rive/`.
2. Set `NEXT_PUBLIC_BUDDY_RIVE=https://create.myqr.co.nz/rive/qr-buddy.riv` in Vercel and redeploy.

Use the full address, because buddies are served on teddy.myqr.co.nz. `/rive/*` sends CORS headers.

- Only the buddy on the kid screen loads Rive; small pictures elsewhere stay SVG.
- If the file is missing or doesn't match, the SVG stays and the browser console says why.
- The app's two extra moves, `eat` and `shake`, play as `hop` and `giggle` in Rive until the animator adds them
  to the `action` enum.
- The package's recorded-sound player (`buddyAudio.ts`) is included but not switched on yet. The app still
  uses `src/lib/sound.ts`.
