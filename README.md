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
   and falls back to `zxing-wasm`. Handles plain GTINs, product URLs, GS1
   Digital Link and JSON payloads. If a code can't be read or found, you get
   name search and manual entry rather than a dead end.
3. **Home-cooked** — the important one. Enter ingredients and rough amounts,
   pick a cooking method and how many servings the recipe makes; nutrition is
   summed from the ingredients rather than guessed from the finished dish. It
   shows exactly which reference food each ingredient matched.
4. **Search** — saved foods, a bundled composition table and the product
   database, merged and de-duplicated.

**Nutrition history**
Meals grouped by day and by breakfast/lunch/dinner/snacks, with totals for
protein, carbs, fat, fibre, sugar and sodium, plus daily trends.

There are deliberately no calorie targets, no deficits, no weight tracking and
no body comparisons. The nutrition side is for understanding what you ate.

## Running it

Requires **Node 20 or newer** (`node --version` to check; get it from
[nodejs.org](https://nodejs.org)).

The same two commands work in PowerShell, Command Prompt, Terminal and any
shell:

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**.

That's the whole setup. The first `npm run dev` creates `.env`, sets up the
database and seeds the exercise library for you — there's nothing else to run,
and no API keys are required. (A `npm run setup` still exists if you'd rather
do that step explicitly.)

### If something goes wrong

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
