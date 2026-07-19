# ShowUp — architecture map

One-page index of where things live. **Read this first, then open only the
file you need** — that is the entire point of the v3.2.5 split.

No framework, no build step, no bundler. `index.html` is a ~2.6 KB shell:
meta tags, the DOM skeleton (header / #view / nav / overlays), one inline
pre-paint theme script, and ordered `<link>` + `<script src>` tags.

## Why classic scripts, not ES modules
Every file is a plain `<script src>`, so they all share ONE global scope —
exactly as when everything lived in a single `<script>` block. Loading files
in order is semantically identical to concatenating them. That is what made
the split a pure move with zero logic rewrites, and it is why you can call
`save()` from `lift.js` without importing anything.

**Consequence: load order is the dependency order.** Top-level `const`/`let`
run in file order; a file may not USE another file's top-level binding at
load time unless that file loads first. (Function bodies are fine — they run
after boot.) Keep the order in index.html as-is unless you have a reason.

## Files, in load order

| File | ~Size | Holds |
|---|---|---|
| `css/app.css` | 40 KB | All styles. `:root` design tokens live at the top. |
| `js/core.js` | 25 KB | `APP_VERSION`, `SEED0` static catalog, storage (`KEY`/`SKEY`, `DB`, `save`, `day()`), Supabase config, Google OAuth, cloud push/pull/merge, `buildArchive`. |
| `js/derive.js` | 10 KB | `deriveAll()` → `SEED` (sessions, partDays, last, totals), `migrateV3`, stamped migrations. |
| `js/util.js` | 22 KB | Gestures (rubber-band, tab swipe, pull-to-refresh), formatting, units, bar/plate math, `toast`, `iBtn`, session flow (`isLive`, `exOpen`, `partOpen`, `reopen`). |
| `js/header.js` | 5.6 KB | `renderHeader`, rest timer, live/at-risk states, `activeFocus`. |
| `js/report.js` | 5.5 KB | Monthly report card: `repData`, canvas drawing, share overlay. |
| `js/today.js` | 21 KB | Daily Fire, onboarding overlay, demo mode, `trainingPlan`, `renderToday`. |
| `js/lift.js` | 39 KB | Part list, exercise view, logger, Suggested, Last Time, plate hints, Run view, done/reopen. |
| `js/stats.js` | 16 KB | Consistency grid, drift view, charts, records, `renderStats`. |
| `js/history.js` | 4.3 KB | `renderHistory`. |
| `js/settings.js` | 4.0 KB | `renderSync` — settings, account, sync UI, INSTALL prose. |
| `js/app.js` | 23 KB | Global click delegation (most button handlers), chart zoom, `render()` router, boot. |

## Common tasks → files
- Logger / set chips / suggestions → `lift.js`
- Anything on the Today screen → `today.js` (fire chart maths: same file)
- Charts, grid, drift → `stats.js`; the shareable image → `report.js`
- Red-header / streak / rest timer → `header.js`
- Colors, spacing, any visual token → `css/app.css`
- A new button's click handler → usually `app.js` (delegated), unless the
  screen file already owns a local listener.
- Storage shape, sync, auth → `core.js`; derived maps → `derive.js`

## Release rules (unchanged, plus two new ones)
1. One version per release: bump `APP_VERSION` in `js/core.js`.
2. **Bump the `?v=` stamp on every `<link>`/`<script>` in index.html to match**,
   and the `CACHE` name + `SHELL` list in `sw.js`. The stamps make a deploy
   atomic: a new index.html can only ever request new files.
3. Run the build checks (`buildcheck.py`) and the snapshot harness before push.
4. CHANGELOG.md records the request and the implementation.
