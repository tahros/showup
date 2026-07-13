# ShowUp — changelog

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
