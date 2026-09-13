# ShowUp AI Engine

The build log for the personalized planning loop. One file, kept current.

**Spec:** `ONE-COMPLETE-LEARNING-LOOP.md` — what we are building and why.
**This file:** the session-by-session plan, the standing decisions, and what actually
happened. Update it at the end of every session, before the summary is written.

Started 13 Sep 2026, at v4.5.32 · day 964 · Show HN target day 1,000 (~15 Oct).

---

## The finish line

Not a checklist — one test.

> **Replay the week of 14 Sep 2026 from the real record and the engine must produce
> the maker's own routine: same six days, same roles in the same order, every load
> within one step, both chest shapes present, no core-only day.**

That routine is recorded in `#gold-routine` below. Until the engine reproduces it
from the record alone, the loop is not done. Everything else in the spec's §9 is a
correctness check; this is the quality bar.

---

## The loop, as drawn

```
APP · AI layer     ┌─────────── LEARN → PLAN ───────────┐   (hidden)
                   │  goals · preferences · results     │
                   ▼            ▲         ▲          ▲
APP · on screen  YOUR PLAN ↔ PLAN FEEDBACK │  LOG ──► WORKOUT FEEDBACK
                                │          └───┘
GYM · off screen                └────────► WORKOUT ↕ LOG
```

Three things this settles, and one it still leaves open.

**The AI layer is one thing, and it is hidden.** LEARN and PLAN are not two steps the
user waits through; they are the same background pass. Nothing on screen should ever
say "learning". What the user sees is a plan that got better and one line saying why.

**Three separate signals reach it, and they are not interchangeable.**
*Plan feedback* is intent before the fact — edits, swaps, rejections. *Log* is
evidence, and it needs no question asked: planning 165×8,8,8,8 and logging 8,8,6,5
is feedback with zero friction, which is why the arrow from LOG goes straight up.
*Workout feedback* is explanation after the fact, and it is the only one that is
optional. Collapsing these into one "feedback" input is the mistake that lets one bad
Tuesday rewrite a program.

**Plan feedback is a loop, not a step.** YOUR PLAN ↔ PLAN FEEDBACK runs both ways:
edit, see the revised plan, edit again, then accept — or reject outright. Reject is a
signal the spec does not currently model; a rejected plan says something a hundred
small edits do not.

**Still missing: LOG → PLAN inside the week.** Every arrow out of LOG goes up to the
AI layer for *next* time. If Tuesday is skipped, Wednesday through Saturday should
reflow now — back moves, the second chest day holds. Without it a plan is written on
Sunday and decays all week, and the most common real-world event (a missed day) is
handled only by hindsight. Added as S16b.

---

## Standing rules

Decided before Session 1, and not re-litigated without writing down why.

1. **Structure is deterministic; the model writes prose.** The template (cadence,
   roles, which exercise fills a role) and the progression (step trigger, step size,
   rep range) are computed on the device from the record. Claude names days, writes
   the reason line, and reads notes like "shoulder's sore". The model does not author
   the week. This is the direct fix for the core-only Wednesday.
2. **Explicit beats inferred, always, and corrections are never re-derived over.**
   A stored correction is not re-computed from data that would suggest otherwise.
3. **Facts, explanations and inferences are three different records.** Logged reps
   are facts. "Short on time" is feedback. "Capacity is trending down" is an
   inference, and inferences are never stored as facts.
4. **A missing log is unknown.** Never "failed", never "skipped".
5. **Temporary expires.** A circumstance has a scope and a lifetime, or it is not a
   circumstance.
6. **Every number can answer "why".** If a plan says 225 and not 215, one line says
   which rule and which evidence. Learning that cannot be inspected will not be
   trusted, and should not be.
7. **Logging never waits on the network.** No AI call blocks a set being saved.
8. **The deploy protocol does not change.** Gate, probe by breaking it, bump, HEAD
   guard, deploy, verify, poll Pages. Every session.

---

## Prerequisites — Session 0

These are small, already-owned, and everything after depends on them. Doing them
first is cheaper than retrofitting.

| # | Item | Why it is first |
| --- | --- | --- |
| 0.1 | **Load `js/exid.js`** (resolve-only, no migration) | Canonical exercise identity already exists, suite green, 127/131 names — and is not loaded by `index.html` or cached by `sw.js`. Plan↔actual linkage needs stable identity across 38 exercises and 981 days. |
| 0.2 | **Decide the sync rule for new records** | The cloud merge takes **whole days by `upd`**, last-write-wins. Plan revisions and planned sets can live inside a day and inherit that safely. Feedback events and memory items cannot — they must survive a day being overwritten. Append-only, own ids, own merge. Decided now, not at Stage 4. |
| 0.3 | **Rule for Supabase migrations** | "Deploy to production" is ON, pointed at `main`; the protocol pushes to `main` many times a session. No `supabase/migrations/` exists yet, so nothing fires. The day one does, every ordinary push becomes a production DB migration with no review. Write the rule before that day. |
| 0.4 | **Land the acceptance test harness** | Replay the real record, build the payload, score against the gold routine. Without it, "better" is an opinion. |

---

## The sessions

Each session ends shipped and gated, or it did not happen. "Ships" is what the maker
can see; "Builds" is the machinery underneath.

### Stage 1 — Plan-to-workout linkage

**S1 · Identity and the acceptance harness**
Ships: nothing visible. Builds: `exid` loaded resolve-only; the replay harness that
reads a backup, rebuilds state, and diffs a generated week against the gold routine.
Done when: the harness runs green on today's engine and reports its current score
(expected: poor — that is the baseline).

**S2 · Planned sets live in the day**
Ships: nothing visible yet. Builds: accepted plan revision + planned sets stored in
the day record, with stable target ids derived from `(date, exid, index)` — no
migration, no new table. Older plans retained.
Done when: a plan survives reload, a second accept creates a revision without
destroying the first, and 981 days of history are byte-identical after.

**S3 · Planned vs actual, on screen**
Ships: during training, planned and logged side by side; extra sets marked as
unplanned. Builds: link on log, preserve through delete/undo. **The deviation itself
is the signal** — LOG feeds the AI layer directly, with no question asked.
Done when: following, changing and missing a target are three distinguishable states
in the record — the distinction the whole loop rests on.

### Stage 2 — Meaningful edits

**S4 · Feedback events**
Ships: nothing new visible. Builds: every edit (swap, remove, set count, load)
recorded as a before/after event with optional reason and explicit scope.
Done when: an edit is replayable from the event alone.

**S5 · "Just this workout" / "Remember this" · and reject**
Ships: the scope prompt, only where it changes a future decision; and an explicit
**reject** on a proposed plan — a rejection says something a hundred small edits do
not, and the spec does not yet model it.
Builds: scoped write — one-off vs durable correction. Durable corrections are the
oldest unbuilt item in the project (rep-range corrections from the day-963 handoff);
this is where they land.
Done when: correcting a rep range holds, and is never re-derived over.

### Stage 3 — Explanations

**S6 · One optional question**
Ships: after a workout, at most one contextual question, skippable, never blocking
completion or sharing.
Builds: explanation attached to workout/exercise/set with scope and source.
Done when: skipping costs nothing and no reason is ever invented.

**S7 · Plan–result comparison**
Ships: a short honest read of what differed.
Builds: observation separated from explanation; missing logs stay unknown.
Done when: the comparison never asserts a cause the user did not give.

### Stage 4 — Personal memory

**S8 · The store**
Builds: memory items with value, scope, explicit-vs-inferred, evidence ids,
confidence, expiry. Append-only; own merge (0.2).
**S9 · Expiry and conflict**
Builds: circumstances expire on schedule; conflicts surface rather than resolve
silently.
**S10 · "What ShowUp remembers"**
Ships: the Settings surface — inspect, correct, forget, without deleting workout
facts.
**S11 · Sync under memory**
Builds: two devices, offline edits, duplicate events, no loss. The item most likely
to run long.

### Stage 5 — The next plan

**S12 · Template extraction**
Ships: your cadence and session roles, shown and editable.
Builds: extracted from the record — Mon Shoulder · Tue Back+Biceps · Wed Chest A ·
Thu Legs · Fri Chest B · Sat Arms is already in the data, six of the last eight weeks.
**S13 · Progression, deterministic**
Builds: step trigger, step size, rep range per exercise; corrections respected.
Decide once: top-set trigger (the gold routine's rule) vs all-sets (the verdict
engine's). They disagree on real sessions.
**S14 · Context builder + validator**
Builds: bounded packet, schema and catalog checks, unit handling, policy limits.
**S15 · Claude writes the prose, not the week**
Ships: "Why this plan", one line per meaningful change.
**S16 · Score against gold**
Done when: the finish-line test passes.

### Stage 6 — Dependability

**S16b · The week reflows**
Ships: a missed or moved day re-flows the rest of the week — back moves, the second
chest day holds. Builds: LOG → PLAN inside the week, the arrow the diagram does not
have yet. Without it the plan decays from Monday.

**S17 · States**: generating, retry, unavailable. No draft lost, no logging blocked.
**S18 · Evaluation harness**: historical replay, invalid output, latency, cost.
**S19 · Rollout**: feature flag, compare against the existing planner.
**S20 · Merge the Lab**: the divergence closes. Two agents and a branch is three
places one decision can be recorded differently — the failure this codebase names
most often.

**Estimate: 16–26 sessions** (S16b added from the loop diagram). Every estimate in this project has run about a third
short. S11, S13 and S16 are the likely overruns.

---

## <a id="gold-routine"></a>The gold routine — 14 Sep 2026

The maker's own week, written by hand. The engine's target output.

```
MON 9/14 — SHOULDER + CORE · 20 sets
  Dumbbell Shoulder Press  35×10 8 · 55×10 10 8 8
  Lateral Raise            40×12 10 10 10
  Rear Deltoids            30×12 12 12 12
  Face Pull                25×15 12 12
  Hanging Leg Raise        BW×12 12 12
TUE 9/15 — BACK + BICEPS · 23 sets
  Deadlift                 135×5 · 225×5 5 5 5
  Bent-Over Row            195×8 8 8 8
  Pull Up                  BW+25×6 6 5 5
  Lat Pulldown             125×8 8 8 6
  Single-Arm Dumbbell Row  55×8 8 8
  EZ Bar Curl              60×10 10 10
WED 9/16 — CHEST A + CORE · 17 sets
  Incline Barbell Bench    95×10 · 115×8 · 165×8 8 8 8 · 175×6
  Incline Dumbbell Bench   60×8 8 8 6
  Cable Fly Up             35×12 10 10
  Decline Sit Up           +10×12 12 10
THU 9/17 — LEGS · 14 sets
  Squat                    135×8 · 225×8 8 8 8
  Romanian Deadlift        175×8 8 8
  Dumbbell Lunge           50×8 8 8
  Standing Calf Raise      45×15 15 15
FRI 9/18 — CHEST B + LATERALS + CORE · 19 sets
  Barbell Bench Press      95×10 · 135×8 · 145×8 8 8 8
  Dip                      BW+45×10 8 8 8
  Cable Fly Up             35×12 12 10
  Lateral Raise            35×12 12 12
  Hanging Leg Raise        BW×12 12 12
SAT 9/19 — ARMS + REAR DELTS + CORE · 21 sets
  EZ Bar Curl              60×10 10 10 10
  Skull Crusher            55×12 10 10 10
  Dumbbell Curl            30×10 10 10
  Triceps Pushdown         45×12 10 10 8
  Rear Deltoids            30×15 12 12
  Decline Sit Up           +10×12 12 10
WEEK: 114 sets
```

Every line is derivable from the record: 22 of 22 exercises are a step, a hold or a
rep-up from the last logged session. Nothing here needed judgement — which is why it
is a specification and not a preference.

---

## What the record actually says

From the 13 Sep 2026 backup — 981 days, 16,119 sets, 38 exercises, since Dec 2021.

- **Cadence is stable.** Mon Shoulder · Tue Back(+Biceps) · Wed Chest · Thu Legs ·
  Fri Chest holds in six of the last eight weeks. The planner does not need to
  discover it; it is in the data.
- **The split is not seven equal parts.** Last 8 weeks: Shoulder 169 sets, Chest 169,
  Back 157, Legs 87, Sixpack 40, Biceps 38, Triceps 16. Arms ride along with push and
  pull days. The rotation ranking treats all parts as peers, which is how Triceps
  ("15 days overdue") won a whole Saturday.
- **Recency beats totals.** All-time top exercise is Incline *Smith Machine* Bench
  Press at 3,604 sets — not trained recently. Anything weighting history equally will
  keep proposing it.

---

## Known failure modes of the current engine

Diagnosed 13 Sep from the real payload. Each is a test case, not a memory.

1. **The skeleton is empty.** For a week write, `resting: []` and an identical
   `due:` for all six days — the prompt claims the calendar is fixed while handing
   the model a blank one.
2. **No size guardrail.** Fourteen client-side checks cover dates, names, loads and
   regressions. None checks session size, so a two-exercise core-only day passes.
3. **Chest twice a week is in the record and not in the plan** — and with one chest
   day, the flat bench has nowhere to go, even though coverage marks flat chest a gap
   the prompt instructs the model to fill.

---

## Session log

| # | Date | Ships | Result |
| --- | --- | --- | --- |
| 0 | 13 Sep 2026 | This file; the plan agreed | — |

_Append one row per session. Record what shipped, what broke, and what the gold-routine
score was if the harness ran. A session that did not ship says so._
