# ShowUp — changelog

## v2.07.4 — Logo goes monochrome
- The mark is now pure black-and-white: both the shaft and the arrowhead are chalk.
  The accent blue is out of the logo entirely (it was in the v2.07.3 cut).
- All icons re-cut from the mono source: icon-192, icon-512, apple-touch-icon (180),
  maskable-512.
- Header mark simplified to a single currentColor — it still flips white on the
  live-blue header, but the special-case rule for the accent arrowhead is gone.

## v2.07.3 — New logo
- NEW mark: a geometric up-arrow. Built on a 512 grid — 54px stroke, round caps,
  arrowhead legs at exactly 45°, shaft on the vertical axis. Shaft in chalk, head in
  the accent blue, so the mark uses the app's own palette rather than being flat
  monochrome.
- Replaces the generic bar-graph placeholder everywhere: icon-192, icon-512,
  apple-touch-icon (180), plus a new maskable 512 (glyph scaled to a 72% safe zone
  so Android's circle crop can't clip the arrowhead).
- The mark now also sits in the app header, left of the date. It inherits the theme
  (chalk in dark, ink in light) and flips fully white when the header goes live-blue
  mid-session, so the accent-colored head can't disappear into the accent background.
- Service worker pre-caches the icons; favicon added.

## v2.07.2 — Pull to refresh
- NEW: hold the page down from the very top and let go — a circular indicator
  follows the pull, the arrow flips blue at the trigger point (72px), and on
  release the whole app refreshes.
- One gesture does three things in order: flushes any pending save (so nothing
  is lost), asks the service worker to check for a newer app version, then
  reloads — and the boot sequence cloud-pulls when signed in. So it means both
  "freshest data" and "freshest app".
- Pulls that start inside a zoomable chart are ignored, so the gesture never
  fights pinch-zoom. Pulls only begin when the page is scrolled to the very top;
  normal scrolling is untouched. The native rubber-band bounce is disabled
  (overscroll-behavior) so the two effects don't stack.

## v2.07.1 — Standalone-mode fixes
- FIX: header no longer hides under the iPhone status bar / Dynamic Island when the
  app is installed to the home screen. The page opts into edge-to-edge rendering
  (viewport-fit=cover) and the bottom nav already padded for the home indicator,
  but the header never got the matching top inset. In Safari the browser chrome
  masked it; standalone exposed it. Header now pads by env(safe-area-inset-top).
- FIX: theme (and any setting or set) could be lost if the app was closed within
  ~350ms of the change. Saves are debounced, and iOS kills a home-screen app the
  instant it's swiped away — the pending write simply died. This is why dark/light
  seemed not to stick. Now a pagehide/visibilitychange flush writes synchronously
  to localStorage the moment the app is backgrounded.
- FIX: no more wrong-theme flash at launch. A one-line pre-paint script applies the
  saved theme from a tiny mirror key before any CSS renders, instead of waiting for
  the async data load.

## v2.07 — Motion pass
Modern motion behaviors (the shadcn/Animate-UI language), implemented natively —
zero dependencies, still one file. Guiding rule: if removing an animation makes the
UI harder to understand, it earns its place; otherwise it's decoration and it's out.
Everything below vanishes under iOS "Reduce Motion", and the whole pass is wrapped
so a motion failure can never break rendering.

- **Tab transitions** — switching tabs cross-fades with a 3px drift via the View
  Transitions API (iOS 18+ Safari; older browsers just get the instant swap).
  In-view re-renders (logging a set, toggling a setting) intentionally do NOT
  transition, so mid-workout logging never flashes.
- **Tap feedback** — buttons, part cards, exercise rows and set tiles press in
  ~4.5% with a 130ms spring. Confirms the touch; biggest win for in-gym use.
- **Set-save moment** — the set you just logged springs into its tile; if it ties
  or beats your best weight, one red pulse radiates out. Red still = records only.
- **KPI count-ups** — plain numbers (1,478 km, streaks, session counts) tick up
  over 450ms with ease-out. Paces and dates don't move.
- **Staggered entrance** — cards and headers rise 8px with a 40ms stagger, capped
  at 9 steps so long pages never feel slow.
- **Chart draw-in** — every line chart sweeps left-to-right (consistency, YoY run,
  pace); single-series bars grow from their baseline (weekly run, monthly training,
  weekday). Stacked composition segments intentionally excluded — growing them
  independently would tear the stack apart mid-animation.

## v2.06 — Cloud credentials baked in
- The Supabase project URL and anon key are now embedded in index.html, so a fresh
  device (new phone, cleared Safari, incognito) never asks for them — Settings goes
  straight to "Continue with Google". This was the chicken-and-egg on the iPhone:
  the credentials lived in each device's localStorage, but a new device needed them
  BEFORE it could sign in and sync.
- The URL was embedded as the bare origin (the pasted /rest/v1 variant is trimmed).
- Safe to embed: the anon key is public by design — every browser using the app sends
  it anyway, and row-level security is what actually protects the data.
- If values are ever saved manually in Settings, those still override the baked-in
  ones (useful if the database ever moves).

## v2.05 — Run folds into Stats
- The Run tab is gone after one version; nav is back to 4 tabs. The whole Run story
  now lives inside Stats, between "Every month, by part" and Records.
- Stats got a jump bar at the top — Days · Parts · Run · Records — one tap scrolls
  to the section, so the longer page stays navigable.
- Milestone number is quiet now (chalk, not red), and the progress bar is blue.
  Red stays reserved for records.
- "Every week" x-axis: week numbers (24, 25, 26…) instead of unreadable month/day.
- "Year over year": axis gridlines are evenly spaced round numbers (90/180/270/360)
  with the unit on the top label; each year's tag sits at the end of its own line
  ('23 and '24 auto-nudge apart since 305 vs 303 nearly tie); the live 2026 line
  ends in the same pulsating blue beacon the consistency chart uses.
- "Pace by month": the current month is a pulsating blue dot with blue text;
  the fastest month keeps its red dot.
- Records dates dropped to a small muted second line under each number.

## v2.04 — Running gets its own tab
- NEW **Run** tab (5th in the nav). Running was near-daily but only ever showed up
  as one small monthly bar chart buried in Stats; it now has a home.
- **Next milestone** card: distance to the next 100 (km or mi), a progress bar, how
  many runs that is at your recent average, and a projected date from your last-4-week
  rate. Currently: 22.4 km to 1,500.
- **Every week**: last 16 weeks of distance, with the 16-week average line.
- **Year over year**: cumulative distance by day of year, 2022→2026, same shape as the
  consistency chart. (2022: 252 · 2023: 305 · 2024: 303 · 2025: 361 · 2026: 246 so far.)
- **Pace by month**: minutes per km/mi, last 12 months, fastest month in red.
  Computed from timed runs ONLY — 824 of your 900 runs have a clock on them, and an
  untimed run now adds distance without polluting the pace.
- **Records**: longest run, fastest pace, biggest week, biggest month.
- Run streak counts back from today (or yesterday, if today just hasn't happened yet),
  matching how the lift streak already behaves.
- REMOVED the "Distance run, by month" card from Stats — the Run tab supersedes it.
  The underlying monthly-km map stays; the composition chart still overlays it.
- Verified: the Run tab's all-time total reconciles exactly to the seed's 1,477.6 km,
  so nothing is double-counted between seed history and app-logged days.

### Note on the data model (confirmed against the sheet)
A run row is `[part, exercise, distance, reps[], Minutes, Seconds]` — the Minutes and
Seconds columns of the Log sheet. Distance is stored in km (your Analysis tab calls it
"KM Ran") and converted for display when the app is in imperial mode.
