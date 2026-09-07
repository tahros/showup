# v3.3.484 — White Today with a pale-blue edge

- One production CSS override changed: selected completed Today on Dark bars
  uses --pill-chalk (#FFFFFF), outlined with --pill-accent (#95A4E8), 2 SVG units.
- Buildcheck and all 63 Node suites pass. The selector test covers 48 state
  combinations, including independent bar appearance and app theme.
- Isolated Chromium fixture shows white fill / rgb(149, 164, 232) stroke /
  2px stroke width in light and dark app themes with Dark bar selected.
  Switching to Train restores the existing pale-blue fill and no stroke.
- Fixture stylesheet URL changed to avoid caching the prior visual test.
- Layout recovery and all workout-completion behaviour are untouched.
  The interactive completion concept is outside the app repository and is
  only a preview, not included in this release.

Physical-phone verification remains with the user.
