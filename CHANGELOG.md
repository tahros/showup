# ShowUp — changelog

## v2.14.1 — Contextual back button
- The redundant "← Legs" row on the exercise page is gone — the header already
  names the exercise and part right above it.
- In its place, the header's top-left slot is now contextual: inside an exercise,
  the brand arrow swaps for a bordered ← button (same circular styling as the
  gear, so it unmistakably reads as tappable) that returns to the part board.
  Leave the exercise and the mark comes back. Same footprint, zero new chrome.
- Settings keeps its own ← Back; nothing else moved.

## v2.14 — Edit in place + the session meter
Closes the last two items from the July feedback batch.

- **Hold a logged set (~0.5s) to edit it** — weight and reps for lifts (reps
  accepts a comma list for multi-set rows), distance/min/sec for runs. The tile
  being edited gets a blue outline, a light haptic tick fires where supported,
  and the follow-up click is swallowed so a hold can never accidentally delete.
  A plain tap still deletes; scrolling cancels the hold. Hint now reads
  "Tap a set to delete it — hold to edit."
- **Session meter** on the part board, under today's logged list: a bar filling
  toward your USUAL session for that part — the per-session average across all
  918 days of history plus app-logged days (today excluded, since today is the
  thing being measured). Grows with every set; at 100% the bar brightens and the
  percentage turns blue. Runs measure km instead of volume. This is the "how is
  today adding to the overall picture" visual — placed on the part board because
  that's where CHEST · TODAY lives. (The progression chart already shows today's
  top set live at the exercise level.)

## v2.13 — Your history moves into Supabase (stage 1)
The 4–5 years of workout history (918 days, 7,845 rows, back to 2021-12-13) now
lives in your Supabase row, not just inside index.html. Every push carries the
full imported history under doc.archive, converted to the app's own day format.

- Verified against the seed's own ground truth before shipping: an independent
  recount of the pushed payload gives exactly 7,845 rows, 1,477.6 km, and
  8,035,814 kg of lift volume — byte-for-byte agreement with the embedded totals.
- The app still RENDERS from the embedded seed for now — zero behavioral change,
  by design. This release is about where the data LIVES.
- Settings shows the archive line under your account, so you can always see what
  the cloud holds. You can also see the raw data yourself: Supabase → Table
  Editor → app_state → doc → archive.
- Push payload grows to ~0.5 MB per sync. Acceptable for now; goes away in
  stage 2, when the archive becomes the app's actual working data.

Stage 2 (v3.0, planned): the app computes all stats from raw days at boot, the
archive merges into days as the single source of truth, and the embedded seed
leaves index.html entirely — gated on a deep-diff harness proving derived stats
match the embedded ones exactly.

## v2.12 — Progression + Readiness
- NEW **Progression chart** on every exercise page (below Logged today): top set
  per session as a line, last ~14 sessions plus everything logged since. Red dots
  mark TRUE PRs — the first session that tied or beat your all-time max, checked
  against full history, not just the visible window. The latest session pulses
  blue; first/last dates anchor the x-axis. Bodyweight-only moves (all-zero
  history) chart top REPS instead. Hidden when under 3 sessions exist.
- NEW **Readiness board** on Today (pre-gym), replacing the Rotation chips: each
  main part is a bar filling toward how often you usually train it. Full blue
  bar = due. Sorted most-ready-first, each row shows "Nd / every Md", and tapping
  a row jumps straight into that part. Same data as before (your actual training
  intervals) — now glanceable instead of readable.

## v2.11 — Supabase-only, constant sync, and screenshot fixes
- REMOVED "Backup to GitHub" entirely (markup, handlers, and the CSV machinery
  with it). One sync system: Supabase. The bar-weight inputs — which quietly
  shared GitHub's save button — got their own "Save bar weights".
- REMOVED both CSV exports ("Export today" on the part board, "Export everything"
  in History). The sheet era is over; the cloud is the backup.
- CONSTANT SYNC: on top of the ~1s push after every change, the app now pushes on
  every tab switch (debounced) and on every backgrounding/close — the close-time
  push uses fetch keepalive so it completes even as iOS suspends the app.
- Display buttons ("kg · km" / "Light ◐") are the same size now — a stale header
  CSS rule was still targeting #unitBtn after the button moved to Settings.
- Header status line never wraps: one line with ellipsis, and "3.45km" tightened.
- Lift tab: today's logged exercises are visually distinct — accent left border,
  faint blue tint, ● while open, ✓ once completed.
- Today tab: "N sets →" columns align perfectly (right column no-wrap + pinned).

## v2.10.2 — Sync, the simple way + the Run cascade
Sync direction is now one sentence: THE PHONE IS THE SOURCE OF TRUTH.
- Cloud → phone happens exactly twice: first open on an empty device (restore),
  and the moment you sign in (initial sync). Routine app opens no longer pull.
- Phone → cloud happens everywhere else: automatically ~1s after every change,
  and pull-to-refresh now force-pushes SYNCHRONOUSLY before reloading.
- Why this fixes the "Supabase overrides my data" feeling: the old boot-time pull
  merged by union, and a union can't represent deletions — delete a set, pull to
  refresh before the debounced push fired, and the deleted set resurrected from
  the cloud. Now deletions ride the forced push and stay dead.
- Settings keeps "Pull ↓" as the one explicit restore-from-cloud action, and its
  copy now explains the direction in plain words.
- Safety unchanged: a device that hasn't restored yet still cannot overwrite the
  cloud (the v2.09.1 reinstall protection).

Also: completing the LAST open exercise or part now completes the whole workout.
Morning run → tap "✓ Complete Run" → header cools. No second trip to Today
required. Logging anything later reopens everything, as before.

## v2.10.1 — Rest timer: deleting a set now lets go of the clock
Reported: after deleting a logged set, the red header stayed on with the timer
still ticking. Root cause was two-fold:
- The timer anchored to the moment of the LAST LOGGED set — and deleting that set
  never moved the anchor. Sets now carry a timestamp (`at`), and every removal
  path (tap-to-delete, remove-exercise ✕, Clear today's, Undo) re-anchors the
  clock to the newest remaining set, or stops it when none remain.
- The red header itself was often CORRECT: a morning run keeps the workout open
  all day (by design — complete it to close it), so deleting an evening lift set
  leaves the header live. What was silly was a rest clock ticking for hours. The
  timer now hides after 30 minutes without a set — 30+ minutes isn't "rest
  between sets". The header stays red until you Complete the workout.
Verified against the exact scenario: run 3h ago → timer hidden, header live →
lift set → 0:00 ticking → delete it → header still live (run open), timer quiet →
remove everything → header cools.

## v2.10 — Logger polish (feedback batch)
- Suggested row moved BELOW "Log a set" — the primary action leads the page.
- Your latest logged set now leads the Suggested strip (blue-outlined chip):
  one tap duplicates it. Duplicate weights/reps dedupe so the strip stays tight.
- The ⓘ bubble now includes a plain-text readout of the whole last session
  ("Last session — Tue 7/7: 50×23 · 60×4 · 60×4 …") above the shortcut chips.
- Bigger − / + steppers (76px wide, up from 56) — and each tap flashes the weight
  red with a tiny scale pop. A little adrenaline, contained to 300ms.
- Tapping the weight (or any numeric field: reps, distance, min, sec, bar) selects
  the whole number — type straight over it, no manual deleting.
- "Clear today's N" / "Move to another lift →" now share one row, one line each.
- "✓ Complete …" buttons are now solid accent blue — unmissable.
- Sticky header FIXED: it was declared sticky all along, but body{overflow-x:hidden}
  silently disables sticky on iOS. Switched to overflow-x:clip, which clips without
  creating a scroll container. Header (and the rest count-up) now stays put while
  you scroll.
- After "Complete workout", the "Continue <part> →" chips disappear from Today.
  The exercise rows stay tappable — logging a set resumes everything, per v2.09.

## v2.09.1 — HOTFIX: the data-loss bug
What happened: deleting/re-adding the home-screen app (e.g. to refresh the icon)
wipes iOS localStorage. That should be fine — the cloud has everything — but two
bugs compounded:
1. SILENT SYNC DEATH. When the Supabase token refresh failed, the app signed
   itself out quietly. Every push afterwards was a silent no-op, so the cloud
   copy went stale while the app looked synced.
2. PUSH-BEFORE-PULL CLOBBER. Push replaces the whole cloud document. On a fresh
   install, any save that fired before the boot-time pull finished (logging a
   set, a settings write) pushed the near-empty local state OVER the cloud copy
   that still held history.

Fixes:
- Pull-before-push gate: a device that hasn't successfully merge-pulled this boot
  physically cannot push. First push after a fresh install is guaranteed to be a
  superset of the cloud. Verified against the exact reinstall scenario.
- Sync failures are loud now: expired sign-in shows a toast + a red dot on the
  gear button; Settings shows a "Not syncing" banner whenever local workouts
  exist without a session.
- Rolling local backup: one snapshot per day (last 5 kept) under separate
  localStorage keys, as a belt against any future app-level clobber.

Recovery notes for data lost before this fix: see the chat.

## v2.09 — Session flow: workouts now have a beginning and an end
The organizing idea (Sungjee's): a session is a continuous flow of sets with a
clear start and finish, at three levels — exercise, body part, whole workout.

- **Complete buttons at every level.** "✓ Complete <exercise>" at the bottom of the
  exercise page; "✓ Complete <part>" under the part's logged list; "✓ Complete
  workout" on the Today tab. Completing the last open exercise in a part quietly
  completes the part. Logging a new set to anything completed reopens it — and its
  parents — because you can absolutely train chest twice in a day.
- **Live mode.** While the workout is open (first set → Complete workout) the
  header burns red — the one place red now means "heart pumping" rather than
  "record". Completing the workout cools it back down. Live mode belongs to the
  workout, not the exercise: you're still training between exercises.
- **Rest count-up.** A ticking m:ss clock sits in the live header, restarting at
  every logged set. It's a glance-value only — nothing is logged — and it survives
  an app reload mid-gym.
- **Suggested sets are shortcut keys now.** Tap one to log that w×r — as many
  times as you like; chips never disappear on use. Each has a ✕ to dismiss it for
  today (persisted). Max 6 show at once; dismissing one slides the next in. Once
  you've started logging, the zone shrinks to a one-line horizontal strip so it
  stops eating screen. "Log all" logs exactly the visible chips.
- **Go-To dedup.** An exercise you're currently working lives ONLY in the
  "· today" list; it leaves Go-To/Sometimes until you complete it, then returns
  tagged "✓ done today".

## v2.08 — Feedback batch 1: nine fixes
- FIX double-tap zoom: tapping +/− quickly no longer zooms the page
  (touch-action: manipulation). Chart pinch-zoom is unaffected.
- FIX duplicate "Carried over from…" text: the static note under the Suggested
  Session header is gone; the ⓘ bubble is now the only place it lives.
- SIMPLER header: the "✓ showed up ·" prefix is dropped (the mark says it), and
  the kg/lb and light/dark buttons moved into Settings under a new Display card —
  they're set-and-forget, not every-session controls. Header is now: mark, date,
  one status line, streak, gear.
- MOVED "Heaviest / Best set" lines from the top of the exercise page to the very
  bottom, under everything. Their "(−0 days ago)" oddity is fixed too: now reads
  "today" / "yesterday" / "N days ago". Bottom of every page also gained real
  padding against the home indicator.
- INVERTED "Pace by month": faster months now sit lower, as requested.
- BODYWEIGHT moves (Dip etc.): tiles and shortcut chips now read "BW × 12" instead
  of "0 kg × 12", and the logger starts at bodyweight instead of a fake 20 kg.
  Adding plates still works — type a weight and it reads "bodyweight + N".
- DEFAULT WEIGHT is now saved per exercise: every change (stepper, typing, or
  tapping a shortcut set) persists, so the exercise opens at exactly the weight
  you last used, forever, until you change it again.
- PLATE LINE simplified: "(1×25 + 1×2.5)" tally removed — it's now just
  "20 kg bar + 10 kg per side".
- ABOUT the "40 kg → 10.8 per side" report: the math was right — (40−20)/2 = 10
  exactly — which means the stored weight was actually 41.6, almost certainly
  drift from an lb-era value seeding the default. Two of the fixes above kill
  this class of bug: inferred defaults now snap to clean stepper increments, and
  your explicit per-exercise defaults are saved verbatim.

Next: v2.09 = session flow (complete exercise/part/workout, live workout mode,
rest count-up, suggested-as-shortcuts with ✕, Go-To dedup). v2.10 = duplicate/edit
logged sets + today-vs-history visual. v2.11 = per-exercise progression.

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
