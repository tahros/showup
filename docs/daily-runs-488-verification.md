# Daily Runs scrub — v3.3.488

Based on main v3.3.487. That release's conversions worked, but switching
dist/pace replaced the DOM without rebinding the scrub or scrolling year.
The original tests subsequently performed a full render before scrubbing,
which masked the missing listeners. The new test clicks the mode button and
scrubs immediately, without an extra render or manual bind.

Verification:

- New regression initially failed on both unit-mode switches; minute-boundary
  formatting also reproduced 5'60". Both now pass.
- Deterministic unit tests: 5 km in 30 minutes -> 5.00 km / 6'00" per km,
  or 3.11 mi / 9'39" per mile. Expected numbers do not call conversion helpers.
- Tests cover mouse, synthetic touch hold/drag/release, scaled and scrolled
  SVG coordinates, historical dates across a year boundary, missing times,
  mixed timed/untimed distance, clipped outliers and no-timed-run mode switch.
- Local Chromium with sample data: Sep 6 -> 3.04 km / 7'34" per km;
  the same day in miles -> 1.89 mi / 12'11" per mile. A real mouse drag to
  Aug 31 changed the readout to 2.57 mi / 12'26" per mile. Mode switching
  retained working selection; browser error log was empty.
- Buildcheck passes. All 64 regression suites pass from a path without spaces.
  The initial sandbox run hit two legacy harness issues (unquoted paths and
  a C:/tmp fixture write); an authorized temporary-copy run passed unchanged.

No real workout data was edited. Touch gesture logic is covered by synthetic
events; this is not a physical iPhone/Safari certification. The interaction
remains: drag to scroll; hold ~250ms then drag to scrub; release keeps the pick.
