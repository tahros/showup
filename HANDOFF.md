# ShowUp — handoff (2026-08-22, v3.3.267)

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
