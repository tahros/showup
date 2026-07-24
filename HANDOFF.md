# ShowUp — handoff (2026-07-24, v3.3.65)

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

**Current deployed version: v3.3.65** (commit `424d5cf`; harness commit `14ebe6c`)

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

## Verification harness — NOW COMMITTED at `tools/`

It lived only in the sandbox and was destroyed by container resets twice. It is
now in the repo. **Restore it in a fresh sandbox:**

```bash
mkdir -p /home/claude/work/refactor && cd /home/claude/work/refactor
# clone/pull repo into stage65/ (or next stage number)
cp stage65/tools/* .
npm install jsdom
python3 buildcheck.py stage65 && node smoke.js stage65
for t in todayhero settings sessfmt histpart reseal scrollpos exitpair \
         continue statspolish repweight enter addsub calreturn pastedit; do
  node test-$t.js stage65 >/dev/null 2>&1 && echo "$t OK" || echo "$t FAIL"
done
```

**PAT** at `/home/claude/.ghtok` (mode 600). Was expected to expire ~2026-07-23
but still returned HTTP 200 on 2026-07-24. **Verify it early; renewal is
user-supplied.** It lacks `pages` scope, so Pages builds are commit-triggered only.

### The 14 behavioural suites
`todayhero` · `settings` · `sessfmt` · `histpart` · `reseal` · `scrollpos` ·
`exitpair` · `continue` · `statspolish` · `repweight` · `enter` · `addsub` ·
`calreturn` · `pastedit`

---

## Release ritual (every version, no exceptions)

1. `cp -r stageN stageN+1` (check it didn't nest!)
2. Make the change with **assertion-guarded** Python patch scripts (`assert
   c.count(old)==1` before every replace)
3. Bump `APP_VERSION` in `js/core.js`; `?v=` on every asset in `index.html`;
   `sw.js` CACHE + 12 SHELL stamps
4. `node --check` every touched JS file
5. `python3 buildcheck.py stageN+1`
6. Targeted new test + **full 14-suite regression**
7. CHANGELOG.md entry with date and reasoning
8. `python3 deploy.py stageN+1 "msg" <files>`
9. Poll Pages build until `built`, then `cmp` deployed bytes against the stage

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

## Recent work (v3.3.36 → v3.3.65)

**History rebuilt:** shorter calendar, body-part axis with filter chips + digest
(cadence / growth / sets), dense selectors, sessions open by default in the
LAST TIME grouped format, calendar-tap jump with sticky-header clearance.

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
- Phase 0 blocker: the build contains personal seed data tied to my account.
- Milestone moment has never fired for real (~16 km from 2,400 lifetime km).
- 2026 km goal number still mine to re-pick.

**Ops**
- GitHub API rate-limits the sandbox IP unauthenticated — read via
  `raw.githubusercontent.com` or authenticated API.
- Pages throttles ~10 builds/hour; exceeded builds are silently dropped.
