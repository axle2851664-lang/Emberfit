# EmberFit — notes for future work

## Shape of the code
- Routes never contain business logic. They parse input, call a service, and
  return `fromResult(...)`. Logic lives in `src/lib/services`.
- External services are reached only through `src/lib/providers`. Adding or
  replacing a provider should not touch the UI.
- `nutritionService.ts` is pure — no I/O — so the estimate maths stays testable.
  Keep it that way.

## Conventions that matter
- Every service returns `Result<T>`; errors carry a `code`, a plain-language
  `message`, and a `hint` telling the user what to do next. No bare throws
  reaching the UI.
- Nutrition is stored per 100 g and scaled at the point of use. Meal items keep
  their own resolved snapshot so editing a Food never rewrites history.
- Sessions denormalise names and muscle groups so history survives deleting the
  workout it came from.
- Anything inferred is surfaced as an estimate and is editable before saving.
  Never present a model's guess as a measured value.

## Gotchas
- Grid and flex children need `min-w-0` or their content sets a minimum width
  and the page overflows horizontally on narrow screens. `body` has
  `overflow-x: hidden`, which hides this — check element right edges against
  `window.innerWidth`, not `document.scrollWidth`.
- SQLite has no arrays; list fields are JSON strings, read with `parseList`.
- Only one workout session may be in progress. Starting a different one returns
  a `conflict` error with the active session in `error.meta`; the UI asks rather
  than silently swapping.
- Alcohol carries 7 kcal/g that the protein/carb/fat model doesn't represent.
  Food table entries where that matters set `energyFromAlcohol: true`, which the
  data-integrity test honours.

## Testing
`npm test` runs pure-logic tests. The browser flows were verified with
Playwright against a production build: workout creation → live session → set
logging → completion → history, and the full home-cooked meal path through to
deletion.
