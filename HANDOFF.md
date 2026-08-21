# ShowUp — handoff (2026-08-21, v3.3.263)

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

**Current release version: v3.3.263** (Session Build focus labels now follow
their selected segment; missing release history and workflow notes repaired)

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
  labels day totals in a fixed row and selected-part counts above their own
  stacked segments—the last geometry bug is fixed in v3.3.263.

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
