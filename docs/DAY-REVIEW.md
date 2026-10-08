# Whole-day comparison — v4.6.247

Share images/videos use the approved 560-unit editorial grid, rendered at 1080px:
28-unit horizontal margins, equal 30-unit top/bottom padding, gray 57-unit
official wordmark and inline DAY/count (real msLiveTotal, no zero padding).
Date/body parts form the left stack; location/weather are centered at the right.
Rows have 11-unit top/bottom padding and 9-unit load gaps. Plain neutral Today
numbers replace ordinary chips; only existing gains keep blue backgrounds.
Gain captions are omitted from exports, not from data or accessible app text.
Four 126-unit summary columns are center-aligned. Complete two-line attribution
is at bottom left; first name and 38-unit grayscale Pip sit at bottom right.
Visible artwork and text ink share a centerline. The interactive UI is unchanged.

Compact spacing: 12px above/below exercise groups, 16px between load lanes,
14px below the location/body-parts line. The type refinement uses 13px
weights (12px below 359px wide) and 11px reps; line and chip heights stay fixed.
Exercise labels (including their small note/delta) are centered within the whole
exercise group. Dividers separate exercises only, never individual load lanes.
The in-app comparison retains this spacing; image/video use the editorial grid above.
Header chrome is untouched.

Weather uses original filled SVG geometry alongside temperature, with the same
paths painted into image/video exports. Condition descriptions remain in the
accessible label and tooltip. Unknown symbols show temperature only; saved
weather data and location consent are unchanged.

`js/day-review.js` renders a read-only projection. `stats.js` places it immediately
after `currentRhythmSection()`. Styles are scoped to `.day-review` in planner.css.
An explicit location action may save optional dayContext metadata through the
existing durable save path. It does not change the header, workout logging,
plan parser or authentication.

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
- Corresponding reference/Today load groups share vertical lanes. Plan lanes
  match original target IDs; Last lanes use original set order. Missing targets
  stay blank, unlinked additions stay separate. The warm-up label is hidden,
  not the set or its qualifier in storage/comparison logic.

## Optional city and weather

- Allow location opens a disclosure and then the device permission. Never runs
  during rendering, sharing, launch, or in the background. One current fix per
  explicit action; use it while still at the workout location, not for history.
- Coordinates are rounded to two decimals on-device; POST contains only those
  coordinates and consent:true. No account identity/workout facts are forwarded
  to providers. The existing public function gateway key is not a secret.
- `supabase/functions/day-context` proxies Photon and MET Norway with an
  identifying User-Agent, timeout, per-instance throttling, single-flight and
  bounded transient cache that respects upstream expiry. No database writes,
  request-body logs, global GPS store, signup or paid API subscription.
- Saves city/region, nearest-hour conditions estimate and capture timestamp;
  no street address/GPS. Shows city before performed parts, weather at top
  right, and provider attribution. Capture timestamps remain saved internally;
  the Captured/conditions timestamp copy is omitted from the card and exports.
  Consent still explains that this is a current snapshot, not a historical lookup.
  A failed provider can leave its own field absent without blocking workouts.
- Record path: `DB.days[date].dayContext`; Remove saves an updatedAt tombstone.
  The normal newest-day merge carries metadata, and sign-in union respects
  newer context/removal. Account/date/navigation/removal races cancel writes.
- Backup/cloud sync includes saved metadata. Existing exports/backups aren't
  erased by Remove. Privacy policy and permission text disclose this.
- Photon public API is best effort at reasonable volume; replace with a private
  instance/service before scaling. MET Norway data is CC BY 4.0. Sources:
  https://github.com/komoot/photon and https://api.met.no/doc/TermsOfService.

### iPhone rollout

`tools/ios-config.py` adds a local ShowUpLocation plugin and the when-in-use
purpose string. Run `npm run sync:ios` and rebuild in Xcode. Old binaries keep
taking OTA and show an explicit rebuild-needed message, not a doomed native
permission call. No new npm plugin/OTA requirement blocks existing devices.
Windows fixtures check generation/idempotency; real permission approval/denial
and location retrieval must also be checked on an iPhone after rebuilding.
Before App Store submission, review the privacy answers for optional coarse
location linked to the user through synced workout metadata (app functionality,
not tracking), and make sure they match this policy and provider processing.

## Motion and export

Today values and entire rep chips start transparent, reveal top-to-bottom once
on entry, and can be replayed. The reference stays still. Reduced motion is static.
No whole-page rerender or scroll jump is needed for Replay or Share.

`dayReviewExportModel` freezes formatted values, units and theme before awaiting
fonts. `drawDayReview` paints both static image and video frames. It uses the
official lifted-P-trio wordmark and Pip, rendered neutral, and self-hosted IBM Plex.
No external render service receives workout data. Existing `showCard` and
`bindPlateExport` provide Image/MP4, preview, cancellation and sharing; GIF is not
offered for this card. MP4 availability follows the existing browser capability
check. `plate-video.js` now takes capture dimensions from the source canvas;
existing 1080x1280 exports keep their size, while tall daily cards are not cropped.

## Verification

The approved Training-Receipt-Design package supplies the export sizes:
33 date, 20 body parts/exercises, 19 semibold Mono loads, 17 regular reps,
14 context/headings, 30 totals and 11 Mono total labels. Wrapping and row
heights use actual painted measurements; long words and rep lists are retained.
Paired lanes reserve the taller load/rep/qualifier block. Reveal staggering is
bounded so all values finish before the exported video ends. The final frame
matches the still, including long-data fixtures. Theme choice is preserved.

- `node tools/check-training-receipt.cjs`: exact reference fixture, one gain chip,
  neutral Today values, no delta caption, paired baselines, equal totals,
  long names/locations/reps, empty data and still/video pixel equality.

- `node tools/test-day-review.js .`: provenance, mixed data, timing, units,
  extra/missing exercises, honest deltas and no record mutation.
- `PW_PORT=8858 node tools/check-day-review.cjs .`: isolated browser fixtures,
  320/393/736px, light/dark, exact footer type sizes, ordered blank-to-text reveal,
  reduced motion, placement, branded image and decoded full-height MP4.
- Existing floating-header, attendance-share, session-comparison, full behavioral
  suite, distribution and OTA integrity checks remain release gates.
- `test-day-context.js` and `check-day-context.cjs`: provider/cache/validation,
  matched rows, both themes, 320/393/736px, no GPS on load/cancel, explicit
  consent, coarse payload, denial/offline preservation and persistent removal.
