# v3.3.481 tab-bar layout repair

Base: 2731e00 (v3.3.480). Report: four icons stacked vertically in a tall
dark tab bar while the app uses the light theme.

The desktop browser did not reproduce the original mobile stacking. Do not
claim a proven Safari root cause. This narrowly scoped repair replaces the
bar's four grid tracks with a non-wrapping flex row and explicit equal shares
on its four buttons. Existing material, appearance overrides, scroll nudge,
icon states and click routing are unchanged. No user data migration.

Validation (September 7, 2026):
- Buildcheck passes for v3.3.481; all version/cache stamps agree.
- All 61 Node suites pass. The first run found a source-regex fixture that
  rejected a comment before the nav selector; moving the comment inside the
  rule restored that fixture without changing its assertions.
- New test-nav-layout guard fails when the flex row is replaced by the old
  grid declaration, and passes again with the repair restored.
- Actual browser at 320, 390 and 430 CSS px: all four buttons have the same
  top coordinate and width, remain inside the bar, and provide 48px-high
  targets. Bar height 58px, bottom inset 10px (no device safe-area inset).
- Light app with Dark tab-bar override verified. Today, Train, Stats and
  History switching verified. At scrollY 650 the bar remains at the same
  viewport position and height.
- Physical iPhone Safari/PWA verification remains for the reporter. Desktop
  rendering is not a substitute for reproducing the original device issue.

Rollback: revert this release commit; no ledger/schema changes are involved.
