# ShowUp — session handoff

Read this first in a new session. Everything below is current as of
**v3.3.434**, `origin/main`. Re-check HEAD before trusting it: Codex pushes to
this repo independently.

---

## 0. First five minutes

```bash
cd /home/claude && mkdir -p work && cd work
git clone https://github.com/tahros/showup stage1 && cd stage1
cat docs/HANDOFF.md docs/WRITER-DOCTRINE.md   # this file, then the writer rules
git log --oneline -15                          # what shipped, and what Codex did
bash tools/runsuite.sh . && python3 tools/buildcheck.py .   # both must be green before touching anything
```

The PAT lives at `/home/claude/.ghtok` (mode 600). **Rotation is now URGENT,
not just pending:** on 2026-09-04 the token was pasted into a chat window to
start a session, so it exists in a transcript. It still works and it is still
the deploy path — revoking mid-session strands a release — but it should be
rotated at the end of any session that uses it.

Writes to GitHub DO work from a container session with network access. Probe
it cheaply before trusting it (`POST /git/blobs` with junk content creates a
dangling blob and changes nothing); an earlier session lost hours to a proxy
that refused writes, and built a whole device-bundle workaround that is not
needed here.

## 1. What this is

A minimalist fitness PWA at `tahros.github.io/showup`, repo `tahros/showup`,
branch `main`, deployed by GitHub Pages. Vanilla JS, no framework, Supabase
backend, IBM Plex. Its maker had trained and logged **958 consecutive days**
as of 2026-09-04, and daily-drives it.

The product philosophy is **days > volume**. The app is a blunt, honest mirror
of consistency, not a coach that flatters. Design lineage: Monument Valley —
one subject per frame, calm over complexity, nothing that shouts.

**Show HN launch is targeted at day 1,000 = 2026-10-15.** Day 958 was
2026-09-04, so 1,000 is 42 days later. An earlier revision of this file said
"around 2026-10-05"; that was wrong and `docs/ai-today/status.md` had it right.
Recompute from the ledger rather than trusting either. The launch essay is not
drafted.

## 2. Working agreement (standing)

- **Opinions, not options.** When he asks "what do you think?", answer with a
  recommendation and the reasoning. A menu is a non-answer.
- **Reason before building** on anything design-shaped; show a mock first.
  Annotated screenshots are the spec mechanism, and they are precise — read
  what is circled, not what you assume is meant.
- **One deploy authorization per session**, then ship continuously. Do not ask
  "push?" per release. Still pause for anything destructive or outside the repo.
- **State the version number in every release response** so he can check it
  against Settings' footer.
- **Own mistakes plainly, with named root causes.** No hedging. He pushes back
  hard when results diverge from what was promised, and he is usually right.
- He rejects anything "not pretty" or "not elegant enough". He evaluates by
  feel; trust that over argument.

## 3. The deploy protocol — non-negotiable

```bash
python3 tools/bump.py . 3.3.OLD 3.3.NEW      # 1. version, sw cache, index refs
bash tools/runsuite.sh .                      # 2. 60 suites, EXIT CODES not grep
python3 tools/buildcheck.py .                 # 3. structural + contrast + guards
#  4. re-check HEAD: Codex may have pushed mid-session
python3 tools/deploy.py . "$(cat msg.txt)" <files>    # 5. only named files, never deletes
python3 tools/verifyship.py "file=regex" ...          # 6. byte-verify vs .lastship
#  7. poll api.github.com/repos/tahros/showup/pages/builds/latest to `built`
```

**When a release touches `supabase/functions/**`, the Edge Function deploys
through a SEPARATE workflow.** Check its conclusion too:
`actions/runs?per_page=2`. v3.3.432 shipped rules to the client whose prompt
never reached the model because that workflow failed and nobody looked.

Other hard-won details: Pages throttles ~10 builds/hour and silently drops the
excess — cure is a timestamp nudge commit to `.nojekyll`. `deploy.py` bases its
tree on live HEAD at push time. `cp -r stageN stageN+1` nests silently if the
destination exists.

## 4. How to write code here

**Every change gets an assertion, and every assertion gets probed.** Revert the
mechanism, confirm the test goes red, restore. A test that cannot fail is worse
than no test: it is a false promise, and this session found four of them.

**Assert the EFFECT, not the mechanism.** When the effect is unreachable in the
harness — jsdom computes no layout and no stacking — find the nearest fact that
is reachable. A full-screen timer trapped in a stacking context passed every
CSS assertion; the DOM fact (which parent the node has) was testable and caught
it.

**Restate an inherited assertion to the new rule; never loosen it.** If a test
pinned the old behaviour, rewrite it to pin the new behaviour and say why in the
comment. Deleting it is how a regression gets in later.

**Comments carry the reasoning, in the code, at the site.** Every non-obvious
line in this codebase says why it exists and what broke without it. Keep that
up — it is why a cold session can move fast.

## 5. Named failure patterns — all of these have bitten

1. **Hollow assertions.** Testing the expression rather than the effect; the
   element you reasoned about rather than the one that governs; an unanchored
   regex matching a sibling; a check with an escape hatch that passes when the
   fixture renders nothing.
2. **`\s` / `\d` inside a JS template literal** collapses to bare `s`/`d`.
   Hit five times. Double the backslashes.
3. **Dead constraints outliving their premise** — a width cap from a two-line
   header, `align-items:flex-start` in a one-line header.
4. **Date-fragile fixtures.** "Green on the 15th and red on the 1st is not a
   gate, it's a calendar."
5. **A rule with no enforcer is a wish.** The prompt forbade consecutive-day
   parts twice; nothing checked; the model broke it and wrote a justification.
6. **A backtick inside a template-literal prompt closes the string.** Guarded
   in buildcheck now.
7. **Fixing adjacent things instead of instrumenting.** Three releases fixed
   three real bugs while the maker's screen never changed. Ask what the screen
   actually shows; grep for its words.
8. **Deploys that half-land.** Pages and the function are separate workflows.
9. **One clock for many facts.** Settings were one blob under one timestamp,
   so any device changing any setting overwrote every setting everywhere;
   name and sex vanished whenever another device folded a plan. Bodyweight
   had gone the same way in v3.3.44. Fixed in v3.3.439 with per-key clocks.
   If two facts can be edited independently, they need independent clocks.

## 6. Where the app is now

Shipped this session (v3.3.412 → v3.3.434), roughly in order: closed-day
behaviour, the barbell weight law (5 lb → 10 lb step, 45 lb bar in lb),
guardrail 16 (an unreasoned repeat is stepped up, not flagged), the writer's
504 (function abort now scales with scope), one plan-header grammar with the
app owning copy/edit/Write, plank holds parsing (`BW x 60 sec x 3`), the new
brand icon and favicon, the century ceremony with a preview in Settings, the
landscape rest timer, one-door day closing, one fold control, the **writer
doctrine** (phase 1), and back-goes-back.

**v3.3.435–437 (2026-09-04), after the above:**

- **`payload.best` was the OLDEST load, not the best** — a real bug live since
  v3.3.401. `best[]` starts empty and `x > undefined` is false, so the max loop
  assigned nothing and the fallback filled each exercise with its first row in
  the window. The writer's whole load ceiling sat under the real top on any
  lift that had progressed. The client clamp uses `writerBest()` and only
  clamps DOWN, so nothing caught it. **Check the writer's loads feel right now
  — this may have been suppressing pushes for 34 releases.**
- The test that hid it was green six days in seven: its fixture's oldest
  Deadlift row was a 100 kg day *unless the 56th day back fell on a Sunday*.
  Pattern 4 exactly. It is date-stable now.
- **Rest is offered alongside a plan again** (v3.3.436), reversing v3.3.374.
  Its premise — "writing a plan means you decided not to rest" — died when the
  writer began writing days ahead and the rail began waking last night's plan.
- **The day exhales** (v3.3.437). Declaring rest folds the plan to `kept`,
  greens today's header square, stands the whole Train-next rail down in
  favour of one `Tomorrow · <part>` line with an optional carry, shortens the
  greeting to `Rest.`, and removes the leaf everywhere.
- **Green is a LIVE grade, the mirror of red.** v3.3.379 had refused green as
  a third *record* fill that would have to spread to the heatmap. That still
  holds for the record; green marks only today, only while the flag is up, and
  is gone at midnight. No past square is ever green.
- **A run still clears a declared rest day, and should.** `workoutDates()`
  counts any day with sets as trained with no exercise filter, so a run-only
  day already fills the square and counts the streak. "Rest + run" is not a
  state the app can hold without changing what a trained day is. Proposed,
  examined, withdrawn — do not re-propose without deciding the streak question
  first.

**`docs/WRITER-DOCTRINE.md` is the important one.** It is the first-principles
account of how the app's memory and the model's judgement divide: facts to the
app, judgement to the model, every rule with a named enforcer. Phase 1 shipped;
phase 3 (reasons as structured, verifiable data) has not.

## 7. Open, roughly by urgency

- **Day-1,000 milestone** — the century ceremony is built and previewable, but
  the copy under the number (`one hundred at a time`) is a placeholder awaiting
  his eye, and so is the mark's colour (accent blue vs the ink tile as drawn).
- **Launch essay** — not started. Hard-ish date: early October.
- **PAT rotation** — now urgent; the token is in a chat transcript.
- **Import** — the next major feature. Open question he has not answered:
  arbitrary CSV with column mapping, or target his own Google Sheets shape
  first. `tools/import*.py` and `convert_*.py` exist.
- **Writer doctrine phase 2/3** — the skeleton is sent but the model may still
  choose its own part with a reason; phase 3 would verify the cited fact.
- Canonical exercise IDs with alias mapping (spec produced, not built).
- Dead-CSS sweep (offered repeatedly, never approved).
- First-ever-lift moment.
- Stats: rep-zone distribution, intent-gap surfacing (specs produced).

## 8. Things he has decided — do not relitigate

- No wordmark inside the app. The mark appears on a century and nowhere else.
- The bare chevron is a direction; the chevron in the tile is the brand.
- Red means live only. No confetti, no sound, no escalation at 1,000.
- The square means a day. Never decoration.
- Stats never writes the record. History is the source of truth.
- Ceremony frequency is inversely proportional to occasion frequency.
- No countdown timer, no prescriptions, no scores.
- Polygon streaks: declined, with reasoning recorded.
- He rejects shrug-type exercises and overhead triceps extensions.
