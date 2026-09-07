# v3.3.489 — Approved Today completion

Source: approved `showup-completion.html` prototype. Applied to the actual app,
not the Modern design preview. Real workout data replaces prototype constants.

## Verification

- All 65 Node suites passed in an isolated copy (including new completion suite).
- `tools/buildcheck.py` passed, v3.3.489; changed JS syntax checks passed.
- Existing daydone suite preserves explicit close, once-per-day stamping,
  replay, first-day, century accounting, and Train's plan-aware action.
- New suite checks real Today completion clicks; 5 km / 3.11 mi summaries;
  no fake distance on strength-only days; count including today exactly once;
  read-only replay and preview; no automatic share after 1.7 seconds; duplicate
  call protection; Done, Share, Escape and keyboard focus; reopening; four-digit
  milestone sizing; scoped card CSS and reduced-motion/safe-area guards.
- Browser: actual local app, sample data only, 390 × 844 portrait. Logged a
  2.67 mi run, completed Today, inspected 57-day count and run summary. Done
  returns to the completed record; replay is available. No horizontal overflow.
- Fresh-origin light-mode first-day preview verified final typography
  (`You showed up.` in sentence case) and white surface. Action buttons fit
  inside the portrait viewport. Earlier dark-mode rendered moment checked.

No signed-in workout data was modified. Browser checks are Chromium, not a
physical iPhone/Safari certification. Existing landscape rest-timer takeover
was encountered during testing; completion is tested in the app's portrait mode.

## Deliberate scope

- Today gets a prominent in-flow button; Train's existing entry point stays.
- No automatic dismissal or share; Share invokes the existing `drawDayCard`.
- Century mark animation and attendance counting are retained.
- `.card.dayclosed` prevents completed-card styling from affecting nav state.
- Daily Runs, plans, sync, and navigation icon colors are unchanged.
