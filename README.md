# EmberFit

A warm, calm fitness and nutrition tracker. Plan and log workouts, get sensible
suggestions for what to train next, and understand what you eat — from a photo,
a barcode, or the ingredients of something you cooked yourself.

Built to run entirely on your own machine. No account, no cloud sync, no
subscription.

## What it does

**Training**
- Build workouts from a library of 46 exercises, or add your own.
- Save any workout as a template and reuse it.
- A live session screen that writes every set straight through to the database,
  so a closed tab never loses your work.
- Log reps, weight, duration and per-exercise notes; add exercises mid-session.
- History with per-set detail, a consistency grid, weekly volume and a
  muscle-group distribution.

**Suggestions**
- Looks at what you've trained recently (weighted by recency), which muscle
  groups have had least attention, how often you've trained this week, your
  stated experience level, preferred styles and available equipment.
- Rotates emphasis away from what you just did, and will suggest an easy day
  when you've already trained today or gone well past your own weekly plan.
- Always shows its reasoning. It never pushes volume.

**Food**
Four ways to log a meal, all landing in the same review step where you can
correct anything before saving:

1. **Photo** — recognition names the likely foods and guesses portions. The
   nutrition itself always comes from the food database, never from the model,
   so no number is invented. Every result is labelled with a confidence and is
   editable.
2. **Barcode / QR** — scans with the native `BarcodeDetector` where available
   and falls back to `zxing-wasm`, served locally so scanning contacts nobody.
   Handles plain GTINs, product URLs, GS1 Digital Link and JSON payloads. If a
   code can't be read or found, you get name search and manual entry rather
   than a dead end. Scanned products also show their published quality
   signals — see below.
3. **Home-cooked** — the important one. Enter ingredients and rough amounts,
   pick a cooking method and how many servings the recipe makes; nutrition is
   summed from the ingredients rather than guessed from the finished dish. It
   shows exactly which reference food each ingredient matched.
4. **Search** — saved foods, a bundled composition table and the product
   database, merged and de-duplicated.

**Product quality**
Packaged products show the measures Open Food Facts publishes for them:
Nutri-Score (the official EU front-of-pack nutrition label), NOVA processing
group, any additives listed on the label, and organic certification. These are
stored with the product, so an item you have scanned before still shows them with
no connection.

Deliberately no single blended score. Apps like Yuka combine these into one
number, which is genuinely convenient, but their weighting is proprietary and
one invented figure would read as far more authoritative than the inputs
justify. Each signal is shown as published, attributed, and left for you to
weigh.

**Nutrition history**
Meals grouped by day and by breakfast/lunch/dinner/snacks, with totals for
protein, carbs, fat, fibre, sugar and sodium, plus daily trends.

There are deliberately no calorie targets, no deficits, no weight tracking and
no body comparisons. The nutrition side is for understanding what you ate.

## Running it

Requires **Node 20 or newer** (`node --version` to check; get it from
[nodejs.org](https://nodejs.org)).

Download the project, then run two commands inside it:

```bash
git clone https://github.com/axle2851664-lang/Emberfit.git
cd Emberfit
npm install
npm run dev
```

Then open **http://localhost:3000**.

That's the whole setup. The first `npm run dev` creates `.env`, sets up the
database and seeds the exercise library for you — there's nothing else to run,
and no API keys are required. (A `npm run setup` still exists if you'd rather
do that step explicitly.)

### If something goes wrong

**It mentions https://nextjs.org/telemetry**
That notice is Next.js's, not a problem — and you shouldn't see it here anyway:
this project turns Next.js telemetry off by default, since the whole point is
that your data stays on your machine. If you'd like to take part, see
`scripts/next.mjs`.

**Windows: "npm.ps1 cannot be loaded because running scripts is disabled"**
PowerShell blocks the `npm.ps1` shim by default. Node is fine — it's the shell
refusing to run it. Two ways round it:

- Use `npm.cmd` instead of `npm` (`npm.cmd install`, `npm.cmd run dev`). Nothing
  on your system changes; PowerShell will run a `.cmd` quite happily.
- Or allow local scripts permanently, once:
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`
  This is a real security setting — it lets locally-created scripts run for your
  user account — so only do it if you're comfortable with that. Command Prompt
  (`cmd.exe`) has no such restriction if you'd rather just use that.

**"fatal: not a git repository"**
You're not inside the project folder. `git clone` first (above), then `cd` into
it. `cd` on its own tells you where you are.

**Pages load but break, or you see "The table `main.User` does not exist"**
The database wasn't set up. `npm run dev` now handles this itself, so make sure
you're on the latest version (`git pull`). Otherwise run `npm run setup` — it's
always safe to run again.

**"Unsupported engine" / "Cannot find module 'node:...'" / syntax errors during install**
Node is too old. Next.js 15 and React 19 need Node 20+. Upgrade Node, then
delete `node_modules` and run `npm install` again.

**"Port 3000 is already in use"**
Use another port: `npm run dev -- -p 3001`.

**"@prisma/client did not initialize yet"**
Run `npm run setup`, which generates the client.

**"DATABASE_URL is missing" / environment variable not found**
`npm run setup` and `npm run dev` create `.env` automatically. If you deleted
`.env.example` too, restore it from the repo — or create a `.env` file with the
single line `DATABASE_URL="file:./dev.db"`.

**Install fails behind a proxy or corporate network**
Prisma downloads a query engine on install. If it's blocked, `npm install` will
report the failed download — retry on an unrestricted connection.

**Something else**
Run `npm run build`. It typechecks the whole project and usually names the real
problem in one line.

### Optional configuration

| Variable | Effect if unset |
| --- | --- |
| `ANTHROPIC_API_KEY` | Photo recognition is disabled; the photo flow offers manual ingredient entry instead. |
| `ANTHROPIC_VISION_MODEL` | Defaults to `claude-opus-5`. |
| `OPEN_FOOD_FACTS_USER_AGENT` | A default identifying string is sent. |
| `ENABLE_REMOTE_FOOD_LOOKUP` | Remote lookups are on; set to `0` to run fully offline. |
| `DATABASE_URL` | Defaults to a local SQLite file. |

API keys are read on the server only and never reach the browser.

## Architecture

```
src/
  app/                 Routes and API endpoints (Next.js App Router)
  components/          UI, split by area (ui/, food/, workout/, charts/)
  lib/
    providers/         One adapter per external service
      openFoodFacts.ts   product database
      anthropicVision.ts photo recognition
      localFoodProvider.ts  bundled composition table
    services/          Business logic — the only layer the routes talk to
      foodService.ts       resolve a food from any source
      nutritionService.ts  pure nutrition maths (no I/O)
      barcodeService.ts    decode a scanned value, then resolve it
      visionService.ts     photo → candidate foods
      recipeService.ts     home-cooked estimates
      mealService.ts       the food journal
      workoutService.ts    plans, sessions, sets, stats
      recommendationService.ts
    data/              Reference tables (foods, exercises)
```

Swapping the nutrition provider means writing one adapter in `providers/` with
the same two functions; nothing in the UI or the routes changes. The same holds
for vision and for the database — Prisma's provider can be pointed at Postgres
without touching application code.

Every route returns the same envelope (`{ ok: true, data }` or
`{ ok: false, error: { code, message, hint } }`), so the client has exactly one
error shape to render, and every failure carries a suggested next step.

## Using it on your phone

There's no hosted version — your phone needs to reach the same server running
on your computer. Two options, depending on how much you want:

**Same Wi-Fi (covers almost everything).** Start the server (`npm run dev` or
`npm start`) and look at the terminal — alongside `Local: http://localhost:3000`
it also prints a `Network:` line with an address like `http://192.168.1.23:3000`.
Connect your phone to the *same* Wi-Fi network (not a guest network — those
usually isolate devices from each other) and open that address in its browser.
On Windows, the first run may trigger a firewall prompt; allow it on private
networks. From there, Add to Home Screen works exactly as below.

This covers workouts, all four food-logging paths, history and profile
normally — including taking food photos, since that always uses the phone's
native camera app rather than the browser. Two things degrade gracefully
instead of working fully: the **live barcode camera viewfinder** needs a
secure connection that a plain local IP doesn't have, so it'll show a
permission error — "scan from photo" and manual entry both still work; and
**notifications** won't turn on (Profile explains why if you try).

**Full functionality, including the live scanner.** Both of those need a real
`https://` address. Two ways to get one, in order of how much setup they take:

- **[`cloudflared`](https://github.com/cloudflare/cloudflared/releases) quick
  tunnel** — no account, one command: `cloudflared tunnel --url
  http://localhost:3000`, then use the `https://something.trycloudflare.com`
  address it prints. Only works while that command is running, and the address
  changes every time.
- **[Tailscale](https://tailscale.com)** — a bit more setup (install it on both
  the computer and the phone, signed into the same free account), but the
  result is a stable address that works from anywhere, not just your home
  Wi-Fi, with a real trusted certificate. Turn on **HTTPS Certificates** under
  [DNS settings](https://login.tailscale.com/admin/dns) in the admin console,
  then run `tailscale serve https / http://localhost:3000` (the exact syntax
  has changed across Tailscale versions — `tailscale serve --help` shows
  yours) and open the `https://<device>.<tailnet>.ts.net` address it gives you.
  Use `serve`, not `funnel`: **`funnel` puts the app on the open internet**,
  and it has no login of any kind, so anyone with the link could see and edit
  everything in it. `serve` keeps it private to your own Tailscale devices.

## Installing it as an app

EmberFit is a progressive web app, so it installs to a phone, tablet or desktop
without an app store.

- **Android / Chrome / Edge** — the app offers to install itself, or use the
  install icon in the address bar. There's also a permanent button on Profile.
- **iPhone / iPad** — Safari has no install button: tap Share, then "Add to Home
  Screen". The app shows these steps for you.

Once installed it runs full screen with its own icon and launch screen, and the
long-press menu jumps straight to starting a workout or scanning food.

**What works without a connection.** The app shell, icons and the offline page
are cached, so it opens rather than showing a browser error, and comes straight
back the moment the server is reachable. Your actual pages are not cached: they
are built from live data, and a saved copy could show yesterday's meals as
today's, which is the kind of quiet wrongness the whole app is built to avoid.
So a page you open with no connection tells you so plainly instead of guessing.

Because the app normally runs on your own machine, "offline" here usually means
the server isn't running rather than that the internet is down. The offline page
checks whether the app actually answers (`/api/health`) rather than trusting the
browser's online flag, which cannot tell the difference.

**Notifications** are local reminders your own device schedules. There is no
push server and no device token, so nothing about you leaves your machine — the
trade-off is that they arrive while the app is installed or open, rather than
being pushed days later. Turn them on under Profile → Notifications.

## Estimates

Anything inferred is labelled as an estimate and can be edited before it's
saved:

- Photo recognition can be wrong about both the food and the portion. It names
  foods; it never produces nutrition values.
- Home-cooked meals are summed from reference composition data, which is a good
  approximation when amounts are roughly right — not a measurement.
- Cooking methods add an allowance for absorbed fat; frying is modelled, water
  loss deliberately is not.
- Volume units are converted at roughly water density.

## Privacy

- Food photos are analysed in memory and never written to disk.
- Barcode lookups send only the product number.
- The barcode decoder runs entirely on your device, and its WebAssembly is
  served from this app rather than a CDN, so scanning contacts nobody.
- Everything else stays in your database.
- Any meal or workout session can be permanently deleted from the UI.
- No weight, body measurements, calorie targets, location or contacts are
  collected.

## Development

```bash
npm test          # pure-logic tests (nutrition maths, decoding, data integrity)
npm run build     # production build
npx prisma studio # inspect the database
```

The test suite covers the places where a silent mistake would quietly corrupt
someone's numbers: unit conversion, portion scaling, macro splits, cooking
adjustments, barcode/QR decoding, provider response mapping, and the integrity
of the bundled food and exercise tables.
