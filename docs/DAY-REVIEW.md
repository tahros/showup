# Whole-day comparison — v4.6.236

`js/day-review.js` is a read-only projection. `stats.js` places it immediately
after `currentRhythmSection()`. Styles are scoped to `.day-review` in planner.css.
It does not change the header, logging, persistence, plan parser or authentication.

## Data contract

- `plBasis(date)` supplies the frozen original plan. An explicitly null frozen
  basis means Last, even if someone saves a plan after the first set.
- Planned days use the union of planned and performed exercises. Extras do not
  switch to Last. Running targets are not invented from unparsed plan notes.
- Unplanned days show performed exercises only. Last is the most recent earlier
  date with that exercise, not the previous calendar day or another exercise.
- Actual-vs-plan differences require original plan target IDs. Legacy unlinked
  rows remain visible but do not get retroactively assigned to planned sets.
- Rep gains compare corresponding sets at equal load; extra sets are separate.
  A heavier load is a factual load difference, not a PR or performance verdict.
  Holds, by-feel targets, estimates, warmups and assisted/bodyweight exercises
  do not receive misleading load/rep improvement claims.
- Multiple completed sessions use `sessionRows` and `workoutCompletionMetrics`
  separately. Breaks between sessions are excluded; unknown/incomplete timing
  displays a dash. All-day set/exercise counts still include every log.
- `isCardio` determines row shape. Run-only distance is kept separate from other
  cardio. Imperial/metric conversion never changes stored values.
- Date and performed body parts are real. Location/weather are currently absent
  from the data model, so the preview's examples are deliberately not shipped.

## Motion and export

Today values and entire rep chips start transparent, reveal top-to-bottom once
on entry, and can be replayed. The reference stays still. Reduced motion is static.
No whole-page rerender or scroll jump is needed for Replay or Share.

`dayReviewExportModel` freezes formatted values, units and theme before awaiting
fonts. `drawDayReview` paints both static image and video frames. It uses the
official lifted-P-trio/Pip lockup, white in dark mode, and self-hosted IBM Plex.
No external render service receives workout data. Existing `showCard` and
`bindPlateExport` provide Image/MP4, preview, cancellation and sharing; GIF is not
offered for this card. MP4 availability follows the existing browser capability
check. `plate-video.js` now takes capture dimensions from the source canvas;
existing 1080x1280 exports keep their size, while tall daily cards are not cropped.

## Verification

- `node tools/test-day-review.js .`: provenance, mixed data, timing, units,
  extra/missing exercises, honest deltas and no record mutation.
- `PW_PORT=8858 node tools/check-day-review.cjs .`: isolated browser fixtures,
  320/393/736px, light/dark, exact footer type sizes, ordered blank-to-text reveal,
  reduced motion, placement, branded image and decoded full-height MP4.
- Existing floating-header, attendance-share, session-comparison, full behavioral
  suite, distribution and OTA integrity checks remain release gates.
