# The Writer Doctrine
*How ShowUp's recommendations combine the app's memory with the model's judgement — and never again let one override the other.*

Written 2026-09-03, after the Friday plan.

**Status: phase 1 shipped in v3.3.432** — rules 1 and 2 are laws with enforcers, the app owns the calendar via `payload.skeleton`, the repair loop runs once, and the read-back separates the app's voice from the writer's. Phase 3 (reasons as structured, verifiable data) is not built.

---

## 1. What happened

Two systems wrote a plan for the same two days.

**The app's writer** put Squat on Friday — the morning after Deadlift `205 × 8,8,8,8` and RDL `165 × 8,6,6` — and wrote three exercises for the day. It justified this: *"Friday completes your leg day contract."*

**Claude, asked cold,** put Chest on Friday and Squat on Saturday, wrote six exercises for Friday, and regressed the Squat to 185 (your last was 195), jumped Skull Crusher 40 → 55, and EZ Bar Curl 50 → 60.

Each system made errors the other didn't. That is not a coincidence, and it is the whole finding.

## 2. The diagnosis

### 2.1 Two kinds of decision

Every line of a workout plan is one of two kinds:

- **A fact about the record.** What you lifted last, what your best is, which parts you trained yesterday, how many exercises your sessions usually contain, which heads have had no work in eight weeks. These are *computable from the ledger*. There is one right answer.
- **A judgement.** Which accessory follows the main lift, whether today calls for volume or intensity, what to name the day, whether a swap is worth it. These need taste. There are several defensible answers.

The model is good at judgement and unreliable at facts — it *reads* the record, so it can misread it (185 below 195). The app is perfect at facts and has no judgement at all. The app made the scheduling error; the model made the load errors. **Each system failed at the thing the other one is for.**

### 2.2 A rule with no enforcer is a wish

The prompt already said, twice: *"no major part on consecutive days."* The model broke it and wrote a persuasive sentence about why. Nothing in `writerCheck` looked.

Guardrails 14, 14b and 16 enforce progression. Nothing enforces recovery spacing. Nothing enforces session size. Those three rules lived in the same prompt with equal weight; only the ones with code behind them held.

**Every rule in the prompt is therefore one of two things: a law (an enforcer exists and acts) or a wish (the model is asked nicely). Today the app cannot tell which is which. That is the root cause.**

### 2.3 Narrative is not reason

*"Completes your leg day contract"* sounds like reasoning. It cites no fact. Compare the app's own guardrail note: *"repeated your last 50 lb for 30 reps with no reason — stepped up to 55."* That one names a number from the ledger, and can be checked.

The read-back currently prints both kinds of sentence in the same voice. So a model's rationalisation reads with the same authority as the app's verified correction, and you had no way to know the Friday call was the weaker kind.

## 3. Principles

**P1 — Facts to the app, judgement to the model.** Anything computable from the ledger is decided or verified by the app. The model is never the last word on a number, a date, or a count.

**P2 — Every rule has a named enforcer, or it is not a rule.** Prompt text is documentation of what the guardrail enforces, not a substitute for it. A rule with no enforcer is listed as a wish and treated as advice in the read-back.

**P3 — A reason cites a fact.** A departure from a default (holding a load, swapping a day, adding a new movement) is accepted only if the stated reason names something in the payload that the app can check. "Knee sore" names a fact you supplied. "Completes the contract" names nothing.

**P4 — Correct the mechanical, repair the compositional, refuse only the empty.** A wrong load is corrected in place (already the rule since v3.3.416). A wrong *day* — right exercises, wrong part, or too few exercises — cannot be corrected arithmetically; it is sent back to the model once, with the violation named, for repair. Only a day with nothing readable is refused outright (v3.3.422).

**P5 — The past is the ledger; the future is the saved plans; both are constraints.** Recovery spacing looks backward at logged days *and* forward at saved sessions. A rule that only looks one way will be broken by the other.

**P6 — The app owns the calendar; the model owns the session.** Which part trains on which day is a scheduling problem the app already solves for Train Next, with rules you trust. The model's value is in filling a day well, not in choosing it. It may *propose* a swap, with a reason under P3; the app verifies the swap against the same rules before accepting it.

**P7 — The read-back says who decided.** Every note is either *checked* (the app verified or corrected it against the ledger) or *the writer says* (a judgement). Same list, two voices, never blended.

## 4. The division of labour, redrawn

```
   ledger + saved plans
          │
          ▼
   ┌──────────────┐   skeleton: parts per day,
   │  APP: schedule│──► session floor/ceiling,   ──┐
   │  (rules 1–4)  │   due heads, coverage gaps    │
   └──────────────┘                                 ▼
                                          ┌──────────────────┐
                                          │  MODEL: compose   │
                                          │  exercises, order,│
                                          │  sets, reasons    │
                                          └────────┬─────────┘
                                                   ▼
   ┌──────────────┐   loads corrected (14/14b/16)   │
   │  APP: verify  │◄──────────────────────────────┘
   │  (rules 5–9)  │──► compositional violation? ──► MODEL: repair (once)
   └──────┬───────┘
          ▼
   read-back: checked · the writer says
```

Today the model does both boxes on the left and the app only the loads in the right. The change is that scheduling moves to the app, and verification grows to cover everything the app can compute.

## 5. The rules

Each rule: what it protects, whether it is a fact or a judgement, its enforcer, what happens on violation, and the test that would have caught Friday.

| # | Rule | Kind | Enforcer | On violation | Would have caught |
|---|---|---|---|---|---|
| 1 | **No major part on consecutive days.** Core exempt. Looks back at the ledger and forward at saved plans. | fact | new guardrail | repair (P4) | **Friday Squat after Thursday Deadlift** |
| 2 | **Session size within the person's own range.** Floor = their 8-week minimum, ceiling = their maximum. Computed, not guessed. | fact | new guardrail | repair | **Friday's 3 exercises** (floor 4, median 5) |
| 3 | **Due parts first.** A week covers parts in ranking order; a part twice only if it is a declared focus. | fact | app schedules (P6) | n/a — app decides | Chest absent from a 2-day week |
| 4 | **Coverage gaps are offered, not forced.** A head at zero for 8 weeks is *surfaced* to the model as a candidate; the model decides whether it fits. | judgement, fact-fed | payload | read-back: *the writer says* | Calves — app got this right |
| 5 | **Loads step on the real grid.** Next face above; never below last without reason; never above best + one step. | fact | guardrails 5, 14, 14b, 16 — exist | correct | **Claude's 185 Squat, 55 Skull Crusher** |
| 6 | **A hold needs a reason that names the exercise.** | fact | v3.3.415 — exists | correct | — |
| 7 | **Names from the catalog, spelled exactly.** | fact | guardrail — exists | note | — |
| 8 | **New movements: at most two, into an empty head or on request.** | fact | guardrails 7, 15 — exist | note | — |
| 9 | **A reason cites a payload fact.** Structured: `{claim, fact}` where `fact` is a key the app can look up. Unverifiable reasons are shown as *the writer says*. | fact about the reason | new check | downgrade voice (P7) | **"completes your leg day contract"** |
| 10 | **Order and pairing within a day.** Main lift first, accessories after, core last. | judgement | prompt + `recent_sessions` | read-back | — |

Rules 3 and 6–8 already hold. **Rules 1, 2 and 9 are the gap** — and rule 3 moves from the model to the app.

## 6. The repair loop

When rule 1 or 2 fails, the day is not refused and not silently rewritten. The app sends **one** follow-up to the same writer:

> *Friday violates: Legs trained Thursday (Deadlift, RDL). Session has 3 exercises; your range is 4–7. Rewrite Friday only. Do not change Saturday.*

If the repair also fails, the day is dropped from the plan and the read-back says so. One retry, not a negotiation — the same discipline as one-shot ceremonies.

Cost: one extra model call on perhaps one plan in five. Benefit: the model's composition skill is used to fix its own composition error, instead of the app inventing exercises it has no taste for.

## 7. Friday, replayed under the doctrine

1. **App schedules.** Thursday was Legs (ledger). Rule 1 excludes Legs from Friday. Ranking: Chest last trained Sep 2, Shoulder Aug 31, Arms Aug 29. Skeleton: **Fri = Chest, Sat = Legs**, Arms folded into Saturday as the ledger's recent weeks do. Session range 4–7.
2. **Model composes.** Chest B for Friday; Squat + Arms for Saturday. Six and eight exercises. It proposes Squat 185.
3. **App verifies.** Rule 5: last Squat 195 → 185 is backward with no reason → corrected to 205. Skull Crusher 55 → more than one step over 40 → clamped to 45. Rule 2: both days in range. Rule 1: clean.
4. **Read-back.** *Checked:* Squat 185 → 205 (under your last 195). Skull Crusher 55 → 45 (one step over 40). *The writer says:* "Chest B on Friday; Squat Saturday gives 48 h after Thursday's deadlift."

That plan is Claude's schedule with the app's numbers — the best of each, by construction rather than by luck.

## 8. Build sequence

**Phase 1 — laws for what exists.** Rules 1 and 2 as guardrails with the repair loop. Rule 9's voice split in the read-back. No change to who schedules. This alone would have caught both Friday errors.

**Phase 2 — the app takes the calendar.** Rule 3 moves into the payload as a skeleton; the model receives parts-per-day and may propose one swap under P3. `recent_weeks` continues to inform the skeleton.

**Phase 3 — reasons as data.** The response's `reason` becomes structured; the app verifies each cited fact. Unverifiable claims are printed in the writer's voice, never the app's.

Each phase is a release, tested by replaying Friday's payload and asserting the plan that comes out.

## 9. What I would not change

- The model still composes sessions. Its Friday *contents* were fine; the count and the part were the errors.
- Guardrails 14/14b/16 stay as they are. They were the part that worked.
- No countdowns, no prescriptions, no scores. A recovery rule is spacing, not a verdict.

## 10. Decisions for you

1. **Phase 2 — should the app own the calendar?** I recommend yes. It removes an entire class of error and the model keeps a voice through proposed swaps. The cost is that a genuinely clever scheduling idea from the model needs a checkable reason to survive.
2. **Session floor: your minimum, or your median minus one?** Minimum (4) is the honest reading of your record. Median minus one is the same number today but would drift if you ever have a short week.
3. **Recovery distance for the same part: one day, or two?** The prompt says consecutive. Your own ledger shows Legs on Aug 22 and 27, Aug 27 and Sep 3 — you never train the same major part within 48 h. Two days matches you; one day matches the prompt. I'd take two.
