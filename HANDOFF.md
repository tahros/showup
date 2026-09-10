# ShowUp — handoff (2026-08-22, v3.3.267)

## Compact Week overview — v3.3.532 (2026-09-10)

Scope: refined Today view's .weekstack only. Week names 14px versus focused
Today 15px; numeric type remains 12px. Rows use 8px vertical padding, 56px
minimum height, 4px set-grid top gap and 12px inner card padding. The example
measures 438 -> 373 CSS px tall at 393px viewport (~15% shorter).
Preserve shared load columns, fold motion/inert state and full-row logger
entry. Focused Today, Previous layout, header, completion, tab bar and all
plan logic are untouched; Claude's Paste/Run changes remain intact.
Browser QA: light/dark at 320/393/430, no overflow, aligned columns, >=44px
tap targets, fold/reopen and actual logger entry. Focused Today still 15px.
Validation: buildcheck and syntax pass; 71/72 suites pass with the existing
test-runclose local JSDOM width failure documented below unchanged.
Rollback: revert these scoped CSS/test changes with a new version stamp;
no stored data or preference changes.

## Luminous selected tab — v3.3.531 (2026-09-10)

Maker chose B from selected-tab-shine preview. Refined + Minimal + light
bar only, on either page theme: exact B radial highlight, silver stops and
rim shadows on button.on. The two explicit selectors keep the cascade
clear. Airy/Midpoint bar backgrounds, inactive inks, dark Graphite bar,
icon colors, header, geometry and shimmer timing are unchanged. Preserve
Claude's v3.3.529 Paste and v3.3.530 Run completion changes. Header.js and
application logic were inspected and left untouched. Existing nav suite
pins the new capsule plus the unchanged bar/contrast boundaries.
Rollback: revert only these selected-capsule styles/tests and version the
rollback; no stored data or preference migration.
Validation: 71/72 suites pass. test-runclose reports width:100% in this local
JSDOM environment on BOTH untouched v3.3.530 and this branch. Real Chromium
shows correct side-by-side widths at 320/393/430: Add run 156/229/266px,
close 88px, 10px gap, exactly one close control. Do not silently rewrite
Claude's Run code or its test under this appearance task. Navigation browser
QA covers all four theme/bar combinations, Previous, phone widths, tab
changes, anchored scrolling and reduced motion. Buildcheck/syntax pass.

## Compact expanded Today plan — v3.3.528 (2026-09-10)

Refined Today plan rows only: name 17 -> 15px at weight 500; vertical padding
16 -> 12px; min-height 72 -> 64px; set-grid top margin 8 -> 6px and row gap
3 -> 2px. Numeric type remains 12px, line-height 1.6 -> 1.5. Preserve shared
load columns, full-row click, dimmed completed sets, footer notes, fold,
chevrons and motion. No global typography or logger overrides. The example
five-exercise plan measures 533 -> 457 CSS px tall at 393px viewport (~14%).
Browser checked both themes at 320/393/430, aligned columns, no overflow,
and tapping into the actual logger. test-flow-layout pins scoped sizes.
Rollback is a CSS/test revert with a new release stamp; no data migration.

## Additive woven training trial — v3.3.525 (2026-09-10)

Approved interactive concept is added AFTER What you did, before all the
remaining Stats sections. Do not replace or remove those sections. All new
functions/DOM/CSS are woven-prefixed in stats.js and app.css. Seven / 28
calendar days, day selection, period paging, per-exercise readout, per-session
Hide. No storage or cloud schema changes. Local DB.days[d].w wins even when
explicitly empty; seed fallback preserves timed unit at index 7. Count actual
reps-array entries, never planned sets or runs. Curves connect recorded body
parts within a day, not exercise sequence or inferred secondary muscles.

Rollback: revert the woven feature commit through a PR and give the rollback
a new version stamp. No data migration or recovery is needed. Hide is a UI
trial control, not persistent deletion. Test-woven pins record truth, empty
overrides, units, dates, input handling, escaping, and additive assembly.
Validation: 70 suites exit 0; buildcheck/syntax checks pass. Count and legacy
unit mutation probes fail as intended. Isolated browser QA passes 320/393/430
phone widths and 1000 desktop, light/dark, chart taps, slider, seven-day
detail, Hide/Show, timed holds and reduced motion. No real user data used.

## Dark-page / light-bar midpoint — v3.3.524 (2026-09-10)

The maker approved Midpoint Silver exclusively for dark content + light bar.
Three CSS rules require Refined + Minimal + data-theme=dark + data-bar=light.
No shared tokens change. Use the preview stops exactly: 245/.95 at 0%,
251/.90 at 15%, 241/.88 at 48%, 239/.84 at 78%, 234/.36 at 100%. The higher
base RGB offsets added transparency against dark content. Inactive ink is
#6B6B6B; selected remains --pill-chalk over #E0E0E0/#C9C9C9/#ABABAB. Softer
rim, existing .20 under-bar shadow, unchanged geometry and shimmer. Light
content keeps Airy, both dark bars keep Graphite, Previous stays untouched.
Regression pins the full intersection selectors, preview stops, capsule,
shadow and glyph-band contrast. Browser QA covers all four combinations,
theme transitions, tab switching, phone widths, Previous and Reduce Motion.

## Approved airy silver — v3.3.523 (2026-09-10)

Refined + Minimal + Light uses C's #797979 inactive ink and .48-alpha lower
edge. Explicit selected color preserves --pill-chalk rather than inheriting
the new gray. Same opaque silver capsule, darker drop shadow and shimmer.
The preview's middle alphas .92/.91 are raised to .95/.94 at 48%/78%: a tiny
contrast correction for gray icons over black, while the clear edge stays
exactly C's. No blur, fixed-layer, geometry, state-color, Dark or Previous
changes. test-nav-layout samples icon/state contrast through the occupied
0-78% band; browser QA checks real glyph bounds, computed inks and scrolling.

## Approved polished silver — v3.3.522 (2026-09-10)

Refined + Minimal + data-bar=light adopts preview B's neutral silver stops:
white, 251/.99 at 15%, 233/.97 at 48%, 192/.92 at 100%. Selected capsule is
opaque #F7F7F7 / #DEDEDE / #BDBDBD. Its surface rim is bright white; the
existing external 0 10px 30px shadow deepens from .16 to .20 black without
changing its geometry. This is the maker's requested darker falloff beneath
the bar, not a new fixed overlay. No blur, transform or parent opacity.
Dark polished graphite, Previous layout, page surfaces and state colors stay
unchanged. test-nav-layout pins the light-only stops, capsule, shadow and
icon contrast, while retaining all dark gradient/contrast assertions.

Browser QA verifies winning gradients/shadow, neutral dividers and fixed
anchoring in all four page/bar combinations; Previous excludes the finish
and Reduce Motion disables shimmer. Read-time mutation probes independently
remove the silver gradient, darker shadow, capsule and rim; all fail the
targeted regression without changing working files.

## Approved polished graphite — v3.3.521 (2026-09-10)

Maker chose preview B and asked for more text visibility, dark bar only.
Refined + Minimal + data-bar=dark gets B's four neutral stops (78/46/29/21),
at 0/15/48/100%, with alpha .98/.98/.94/.82. The lower two stops are clearer
than B's .97/.96 preview. An opaque #4C4C4C to #303030 selected capsule keeps
the icon separate from underlying text. Rim/shadow terms come from B; no blur,
transform, overall opacity or geometry is added to the fixed nav. Light bar
rules and tokens, page colors, state accents and Previous are untouched.

test-nav-layout pins all four stops, dark-only capsule/rim and contrast at
101 gradient positions over white/dark/blue backdrops, plus selected shimmer
contrast. Browser QA verifies computed gradients, unchanged Light treatment,
neutral row/section dividers and fixed anchoring while scrolling.

## Neutral dividers — v3.3.520 (2026-09-10)

Minimal's old `--line` / `--whisper` overrides still carried blue despite
the neutral page and bar. Replace dark #242938/#1F2330 with #292929/#232323,
and light #E9EAEF/#F1F2F6 with #EAEAEA/#F2F2F2. The neutral grays are derived
from each original's relative luminance, rounded to an 8-bit channel. No
thickness, spacing, semantic accent, surface or state changes. Classic was
already neutral; the unused Modern preview is deliberately untouched.

The shared tokens cover headers, section rules, list rows and SVG/canvas
gridlines, in both Refined and Previous layouts. test-skin guards equal RGB
channels and luminance drift below .003 for all four overrides. Browser QA
checks actual section and row borders against the resolved neutral token.

## Neutral tab surfaces — v3.3.519 (2026-09-10)

Maker requested a deeper Light gradient, a lighter/translucent Dark bar and
less page/bar hue mismatch. Page surfaces were already neutral; neutralize
the bar tokens instead. Dark `--pill` is #282828, muted ink #BDBDBD. Light
ink is #525252, strong ink #111111 and its shadows use neutral black.
Blue state accents and rest green are untouched. Refined Light's lower stop
uses 90% pill + 10% ink; Refined Dark uses 88% to 82% pill opacity. Dark pooled
white light falls from 14% to 4% to keep all icon states above 3:1 over white,
dark and blue backdrops. No backdrop filter, transform or fixed-layer changes.

Previous keeps the earlier near-opaque gradient, but shares the corrected
neutral bar tokens. test-rest now reads bounded data-bar blocks rather than
identifying Light by its old blue shadow. test-nav-layout guards neutrality,
gradient bounds and contrast. Browser checks verify winning computed gradients
and fixed-bar anchoring through scroll in all page/bar theme combinations.

## Plan / Train coherence — v3.3.518 (2026-09-10)

`nextPlanItem()` is shared by TODAY's next-exercise card and TRAIN's planned
focus. `plannedTrainPart()` resolves the catalog/custom body part, ignoring
rest/completed days. Fresh Train nav prefers this part to an old bookmark;
an open logger has priority. Manual part taps and rerenders preserve browsing.
The planned part leads the grid and replaces the rotation's hot cue. Only
today's accepted plan (including today's week block) counts, not future days.

Refined drops Copy from `_planEdge`, drops the repeated GO-TO scope pill, and
restores the generic `--line` BODY PART rule. Scoped PLAN spacing permits wrap
and prevents the info wrapper shrinking. Light bar gets a 6% ink gradient
inside its existing surface; no fixed overlay, blur or transform is added.
`trainListWeight` rounds pounds only in both browse-row layouts; stored loads,
logger input, kilograms and distances retain their existing precision.

Regression cases in test-flow-layout cover real nav, manual browsing, open
logger preservation, week/future/completed plans and unit boundaries. Plan
and week suites expect the refined three/two controls; Previous retains Copy.
Browser QA covers 320/375/393/430px day/week headers without overlap or page
overflow and all four light/dark page/bar combinations. Rollback remains in
Settings; shared plan focus and display rounding are not theme-only changes.

Validation: 68 behavioral suites plus smoke, buildcheck and all JS syntax
checks pass. Read-time mutation probes fail when plan-priority nav, Copy
removal or whole-pound formatting is disabled; the working files stay intact.

## Refinement details — v3.3.517 (2026-09-09)

Maker feedback on 516: refined TRAIN tiles now left-align; `.flow-bodyhead`
uses `--edge` rather than the much lighter Minimal `--line`. The selector
needs `h2.flow-bodyhead` to beat the existing `:is(...) h2` rule. Last Time's
head and child groups use center alignment, including the date and chevron.
Refined go-to rows omit yearly frequency; recency uses `--faint`. Shared
`agoLabel` now writes `4d ago`, `1mo ago`, `1y ago` in both layouts.

`#hStreak.atrisk` keeps `--chalk`, not `--record`. Risk logic and the pending
square remain unchanged. Refined `nav button.on::after` reuses `sheen`, on a
6.8-second cycle, under the icon and without pointer events. Reduce Motion
disables it. Do not add backdrop filters or transforms to the fixed nav.
Previous disables these refined layout and shimmer rules; the neutral count
and shared compact time grammar remain. No database or server changes.

Browser checks cover 320/393/430px light and dark, exact header-element center
alignment, the winning rule color, selected-tab-only motion, tab switching,
Reduce Motion and Previous. Regression guards extend test-flow-layout.js;
the intentional time-grammar and streak-color expectations are updated in
test-coldstart.js, test-repweight.js and test-rest.js.

## Reversible TODAY / TRAIN refinement — v3.3.516 (2026-09-09)

The approved prototype is adapted to the live renderers, not copied as a
second app. `refinedFlow()` gates markup; `data-flow="refined"` plus the view
scope gate the CSS. The real parser, writer, plan/week state, unit laws,
logger, sync and completion are unchanged. New-user Today keeps the first-set
flow but offers Paste/Write and lets an actual saved plan outlive that welcome.

Settings → TODAY & TRAIN layout → Previous disables the trial immediately.
`showup:flow-layout` and `showup:flow-last-fold` are localStorage presentation
keys OUTSIDE `tracker-v1`. No migration, backup restore, deletion, or cloud
settings update is needed. The previous `DB.settings.plFold` is left intact.
The initial default is Refined; the selected layout survives reloads.

Pre-change release: `efe0fd6` (v3.3.515), tagged `v3.3.515-pre-flow-refinement`.
Release-level rollback instructions: `docs/FLOW-ROLLBACK.md`.
Regression coverage: `tools/test-flow-layout.js` covers the new flow and
data-preserving switch; `tools/test-partlast.js` retains the previous layout's
exact fold contract. Do not remove the Previous option without maker approval.

Validation: all 69 suites, JS syntax and buildcheck pass. Removing the refined
mechanism makes the new regression suite fail. Isolated Chromium checks cover
real Paste / Read / Use, logger return, retained fold DOM, reload-persistent
rollback and light/dark TRAIN at 320, 393 and 430 CSS pixels. Rendered phone
screens were inspected. No real cloud request or personal data was used.

## Completion correction — v3.3.490 (2026-09-07)

`#doneAllBtn` passes an explicit-intent flag through `doneToast()` to
`celebrateDayDone()`. A same-day stamp must block automatic repetition only;
it must never make that visible button a no-op. The summary count is 84px
(76px at four digits), has no decorative trail, and the completed card says
only `Day N` at 22px. The date/status/reopen note and share path stay intact.

## Completion update — v3.3.489 (2026-09-07)

Today uses the approved completion prototype. `dayCloseHTML()` gives Today a
prominent in-flow action; Train keeps its existing plan-aware affordance.
`celebrateDayDone()` owns the real count and date, waits for explicit Done/Share,
and does not auto-dismiss or auto-share. Sharing still uses `drawDayCard`.
Once-per-day, replay, first-day, and century ledger rules are preserved.
Scope finished-card layout to `.card.dayclosed`: `nav.dayclosed` is a separate
state and must never inherit its layout. New regression: `test-completion-489.js`.

Paste this into a new conversation to resume with full context.

---

## What ShowUp is

A personal fitness-tracking PWA I build and daily-drive. Thesis: **days > volume**
— consistency over tonnage. ~926 consecutive days logged, grown out of a Google
Sheets training log.

- Live: `https://tahros.github.io/showup`
- Repo: `tahros/showup`, branch `main`
- Backend: Supabase (`https://anmmqhgnsuutufladfik.supabase.co`) + Google OAuth
- localStorage key: `tracker-v1`
- Fonts: IBM Plex Sans / IBM Plex Mono

**Current release version: v3.3.267** (History starts with a compact 42px
`Share your progress` launcher; the large bottom report block is gone)

---

## Standing instructions (these matter)

1. **Lead every release response with the version number** so I can check it
   against the Settings footer.
2. **Don't ask "push?" per release.** One deploy authorization per session, then
   ship. Pause only for destructive actions or anything outside the repo.
3. When I ask "what do you think?" — **give an opinion, not options.** Reasoning
   before recommendations.
4. Own mistakes plainly and name root causes. No hedging.
5. Feedback arrives as **annotated gym screenshots**, usually within the hour of a
   deploy. Treat each as a spec.

---

## Architecture

`index.html` (2.7KB shell) + `css/app.css` + **11 classic scripts in ONE global
scope** — ordered `<script src>` tags, NOT ES modules. Do not modularise;
over-engineering is actively resisted.

| file | owns |
|---|---|
| `js/core.js` | APP_VERSION, SEED0, storage, Supabase/auth/sync, `hist` + `lift` state |
| `js/derive.js` | `deriveAll()` → SEED, migrations |
| `js/util.js` | gestures, units, `wLaw`, toast, `iBtn`, `isLive`, PTR, `resealDay`, `foldSets`/`setRows`, app-wide up-button |
| `js/header.js` | `renderHeader`, rest timer, tip portal, `rhythmCard` |
| `js/report.js` | share canvas |
| `js/today.js` | onboarding, `renderToday`, `fireDist` |
| `js/lift.js` | part list, exercise view, logger, `liveBars`, `repChoices` |
| `js/stats.js` | grid, charts, heatmap, `YEAR_COLORS` |
| `js/history.js` | calendar, part axis, session detail, past-day editing |
| `js/settings.js` | settings UI |
| `js/app.js` | click router, `render()`, boot |

---

## Verification harness — committed at `tools/`

The repository currently has **48 Node behavioral suites plus buildcheck**.
Tests require `jsdom`; install it in an external dependency directory or expose
an existing installation through `NODE_PATH` rather than adding generated
dependency files to this repository.

```powershell
python tools/buildcheck.py .
$env:NODE_PATH = '<external-node_modules>'
Get-ChildItem tools/test-*.js | ForEach-Object {
  node $_.FullName .
  if ($LASTEXITCODE) { exit $LASTEXITCODE }
}
```

Run the targeted suite first while iterating, then run all 49 checks before a
release. `tools/test-pmix.js` owns Session Build behavior and SVG geometry.

---

## Release ritual (every version, no exceptions)

1. Fetch `origin`, confirm a clean tree, and branch from current `main`.
2. Make the smallest reviewable patch; do not overwrite unrelated work.
3. Bump `APP_VERSION` in `js/core.js`; every `?v=` asset in `index.html`; and
   the `sw.js` cache plus shell stamps.
4. Run `node --check` on every touched JavaScript file.
5. Run `python tools/buildcheck.py .`.
6. Run the targeted regression, then **all 48 Node suites**.
7. Add a dated CHANGELOG entry and update this handoff when the current state,
   workflow, or durable design logic changed.
8. Commit only the intended files, push the feature branch, open a PR, and
   merge it into `main`—no direct feature commits to `main`.
9. Confirm GitHub Pages built the merged commit and the live Settings footer
   reports the new version.

---

## Design doctrine

- **Never rewrite; small reviewable diffs.**
- **Red = LIVE only.** Header, open sets, Continue, fire needle, live bars.
  Sealed shows accent blue. Red never gets decorative sheen.
- **One colour authority per element.**
- **Sheen means "selected / primary action"** — don't spend it on decoration.
- **Rest is ABSENCE.**
- **Every state the app walks into, it walks out of.**
- **Forensics before conversion** — root-cause, don't pattern-match.
- **Judged by use.** Trial-and-revert is a win, not a failure (the de-AI pass
  v3.3.11→12, and the Rhythm chart v3.3.52→53, are both recorded wins).

---

## Hard-won engineering lessons

- **jsdom has NO layout.** Anything that can only break visually (clipping,
  wrapping, overlap) needs a **structural assertion in buildcheck.py**. Three
  such guards now exist (SVG-rect/flex collision, badge-in-clip-box, header
  nowrap) — each was added *after* shipping the bug it now catches.
- **Put new test assertions BEFORE `process.exit(...)`.** Appending after it
  silently skipped them twice (v3.3.45, v3.3.65) while reporting success.
- **Line-anchor CSS regexes** (`^\s*\.foo\{`). A bare `\.foo\{` also matches
  `header.live .foo{...}` — burned me in v3.3.50 and v3.3.55.
- **Freeze test fixtures against the wall clock.** `test-sessfmt` rotted and
  failed spontaneously when the date rolled to 7/22.
- **Delegated click routers must use `closest('#id')`, never
  `e.target.id===`.** A button that gains children at runtime silently stops
  responding (v3.3.58 — real lost sets in the gym).
- **`fill-mode:both` on entrance animations creates permanent stacking
  contexts.** Use `backwards`.
- **IntersectionObserver fires a mandatory initial callback** with current
  state on `observe()` — skip report #1 if you only care about changes.
- `#app` has `overflow-x:clip`, which per spec forces the vertical axis to
  clip too. Nothing may overhang negatively inside it.
- **The same logic in two places is the same logic drifting in two places.**
  `resealDay()`, `foldSets()`/`setRows()` were all extracted after drift bugs.

---

## Recent work (v3.3.236 → v3.3.263)

- **Running:** Pace intentionally shows nine months and is touch-scrubbable;
  Distance labels were repaired and Every Week gained chart headroom.
- **Growth Audit:** records have a rolling 180-day authority window while
  all-time remains visible; improvements compare across days, not within one
  day; chosen exercise homes control grouping; in-progress records are shown.
- **New-user guidance:** Today recommends before eight logged days, and the
  onboarding answer to "What you train" is editable without deleting history.
- **iOS/PWA:** the top header and status-bar treatment were rebuilt around iOS
  standalone behavior, and the service worker now registers and checks for an
  update at launch.
- **Equipment:** increments now come from one kg/lb equipment table; stack and
  plate-loaded machines are distinct; pound-barbell minus and cable-pound
  stepping were repaired.
- **Stats/History:** Session Build now leads Stats, Muscle Coverage and Growth
  Audit follow, and the History body-part digest was removed. Session Build
  labels day totals in a fixed row, selected-part counts above their own
  stacked segments, and uses the original Google Sheets colour identities.

## Earlier work (v3.3.36 → v3.3.65)

**History rebuilt:** shorter calendar, body-part filter chips, dense selectors,
sessions open by default in the LAST TIME grouped format, and calendar-tap jump
with header clearance. (The experimental digest was later removed in v3.3.258.)

**Past-day editing (v3.3.61–63):** explicit per-day edit mode; edit / delete /
add sets; addressed by entry-index + rep-index so legacy multi-rep rows are
editable set-by-set; weight change on one set *splits* it out; all mutations
funnel through `commitPastDay()` which re-derives. Empty legacy marker rows no
longer render or count.

**Logger:** rep tiles follow the weight (evidence at ±3% first, then a personal
Epley curve for never-lifted weights); 8 tiles on one row; Add-set tap bug fixed.

**Today:** Daily Fire deleted, Rhythm took the top slot; live session leads with
the part digest.

**Polish:** info returns to an "i" beside section titles; header never wraps;
weekday chart highlights *today* with a caret for strongest; exercise cards
animate in on part change and carry a `→` affordance; app-wide "↑ top" button.

---

## Open items

**Bugs / debt**
- Legacy sheet-import rows with `reps:[]` remain in storage. They render and
  count as nothing now, and `commitPastDay()` sweeps them from any day you
  edit. **A one-time purge with a confirmation + count is offered and not yet
  built.**
- **No undo for past-day edits.** Today's sets have undo; History deletions are
  permanent. Worth adding if past-editing sees real use.
- Stats SVG bar charts stay matte — CSS pseudo-elements can't attach to SVG
  children; would need a JS gradient overlay.
- `lbGrow()` doesn't fire for the Today part-digest copy (keys on `lift.ex`).
- Gear icon shows a red `.warn` dot in several screenshots — never examined.

**Harness**
- Full snapshot-diffing system (`harness.js`, `compare.js`, `dump.js`,
  `current_baseline.json`) still unbuilt.

**Product / GTM**
- Highest-value unshipped work: **hand the URL to friend #1.** Suggest a
  Backup ↓ first (926 days of data).
- ROADMAP waves: v3.4 custom exercises → v4.0 Routine Engine → v5.0 Import
  wizard → v6.0 premium.
- Personal seed data was removed from the build in v3.2.1; history now lives in
  Supabase/local storage.
- Milestone moment has never fired for real (~16 km from 2,400 lifetime km).
- 2026 km goal number still mine to re-pick.

**Ops**
- GitHub API rate-limits the sandbox IP unauthenticated — read via
  `raw.githubusercontent.com` or authenticated API.
- Pages throttles ~10 builds/hour; exceeded builds are silently dropped.
