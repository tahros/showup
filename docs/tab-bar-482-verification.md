# v3.3.482 — conditional layout recovery

The second phone screenshot explicitly shows v3.3.481 and the same stacked,
oversized bar. This rules out assuming the first CSS-only release was simply
not installed. The exact originating device/rendering fault remains unknown.

Scope: inspect rendered geometry; override layout inline only after detecting
a broken bar. Keep the same DOM buttons, delegated routing, icon state,
surface colours and glass. No database/storage changes or diagnostic upload.
Transient data-layout-failure records only CSS values and rectangle dimensions.

Verification:
- test-nav-recovery.js checks healthy no-op, injected block/stacked/overflow
  recovery, important declarations, DOM identity, resize, skin changes,
  hidden geometry and lifecycle hooks.
- Negative control replaces the recovery function body in memory with an
  immediate false return: the new test fails on the broken-bar assertion.
- Browser fault injection: display:block !important and width:110vw
  !important produce height 217px and tops 518/571/624/677. Recovery restores
  height 58px and four identical top coordinates (677).
- A normal Stats-tab click after fault injection triggers recovery without
  using the fixture's manual recovery button.
- Resizing a recovered bar to 320/390/430px viewports gives bar widths
  272/342/382px, height 58px, and a single row contained within the viewport.
- The complete suite needs PYTHONUTF8=1 on this Windows host; without it the
  existing Python import validator fails while printing a Unicode arrow.

This verifies controlled-failure recovery in Chromium, not the cause of the
original iPhone failure. Final validation remains on the affected phone.
Rollback is a commit revert; there is no data migration.
