# ShowUp — Design Workstream: "Game feel, Tesla calm"
*Opened 2026-07-18 at Sungjee's direction. Runs parallel to the feature roadmap.*

## The brief, in Sungjee's words
1. The design is static — it should mimic a game: inviting, interactive.
2. Too many explanatory elements — hide, don't show. Regular car → Tesla:
   functionality folded into one confident surface.
3. App success = UX; UX = the literal UI components.

## Governing principles (what "gamified" means HERE)
- **The numbers are the game pieces.** ShowUp never invents points, badges,
  or XP. The real quantities — rank on the fire chart, streak, true kg, the
  2,400 km milestone — already form a game. The workstream makes them FEEL
  like one: motion, weight, consequence. Honest data, juiced.
- **Progressive disclosure over explanation.** Every permanent caption is an
  admission the design failed. Target state: zero always-visible .note lines.
  Meaning lives in the elements; explanation appears on demand (ⓘ tap,
  long-press) and on FIRST encounter only.
- **Gestures are the dashboard.** Swipe-back, tap-the-red-header,
  hold-to-edit already exist. Extend the grammar; every gesture must have a
  discoverable fallback.
- **One authority per element** (v2.19 color law) extends to motion: one
  animation per state change, purposeful, ≤400ms, reduced-motion respected.
- **Constraint unchanged:** vanilla JS, one file, no frameworks, small
  reviewable diffs. Game feel via CSS transforms/transitions, Web Animations
  API, canvas where earned. Optional haptics via navigator.vibrate.

## Phases

### D1 — The Tesla pass (subtraction only, ships first)
- Remove every always-visible explanatory .note; fold each into a per-card ⓘ
  that expands inline. First-ever visit may show notes once, then never.
- Collapse Stats into a dashboard: KPI band up top, cards below, sections
  openable. Readiness explainer text → gone (bars self-explain after ⓘ once).
- Audit every label: if deleting it loses nothing, delete it.
- Gate: Sungjee daily-drives a week without missing any removed text.

### D2 — Juice (game feel on real events)
- Set logged: the new set chip lands with spring; volume number counts up;
  Daily Fire marker GLIDES to its new rank with a ▲ that floats and fades.
- Streak events: flame flicker on increment; milestone crossings (2,400 km)
  get one earned full-screen moment — confetti-free, iron-themed.
- Part tiles: pressed states with depth; live pulsation already exists.
- Optional: subtle haptic on Add set / workout complete.
- Gate: nothing animates that didn't happen; Sungjee vetoes any motion that
  feels like a casino.

### D3 — Touchable data
- Consistency grid: tap a cell → that month's days expand inline.
- Daily Fire: scrub the distribution to see "what would a 12,000 kg day
  rank?"
- Last Time card: tap a weight row → prefills the logger.
- History day detail: swipe between adjacent days.

## Sequencing vs the feature roadmap
Streak-at-risk (v3.2.3) ships first — it is D2-flavored and tiny. Then D1
BEFORE the report card, so the shareable image inherits the calm. Export
(v3.3) is design-neutral and can interleave. D2/D3 land as sessions allow,
each behind the same gate as everything else: real use, real verdicts.


## Influences (2026-07-20, from Sungjee's app-store study: Stoic, Ladder, workout onboarding)

What earns the "premium" feel, distilled:
1. **Extreme type hierarchy** — one element 6-8× larger than everything else;
   ratio, not decoration, creates confidence.
2. **One decision per screen** — full-screen tap targets, single CTA, zero
   competing actions.
3. **One accent with absolute authority** — color only on the thing that
   matters now (our v2.19 law, taken further).
4. **Tactile inputs** — rulers and wheels with giant live readouts, not form
   fields.
5. **Live consequence in the CTA** — "Apply filter (26 matches)": the button
   answers "what happens?" before the press.
6. **Constraints as inline microcopy** — "select up to 3", muted, in place.
7. **Selection = inversion** — chosen state readable from arm's length.
8. **Gestures taught once** on a single dedicated screen, then trusted.
9. **A reassurance line at every anxious decision.**

Adopted into phases:
- D1.5 type-scale pass — SHIPPED v3.3.2.
- D1.5 selection inversion — tried v3.3.4, REVERTED v3.3.5. Sungjee's verdict
  after real use: selection reads better in accent blue. Accent = app voice +
  your selections; red = live. The trial is the process working.
- Onboarding: "How to ShowUp" gestures screen; reassurance lines at sign-in
  and demo.
- D2: live-consequence Add set ("Add set → 7,660 kg · ▲3").
- D3 flagship: buildable-iron ruler picker — tick marks only at weights that
  physically exist per equipment; snapping IS the interface.

Consciously rejected: multi-screen onboarding quizzes (sunk-cost friction —
our wedge is URL → first set in under a minute), invented composite scores
("Life Score" = fake game pieces), and atmosphere-over-legibility theming.
The meta-principle: design the MOMENT, not the screen — every view spends
its whole visual budget on its one action.

### Amendment (2026-07-20, v3.3.7): progressive disclosure is per-surface
Sungjee's verdict: ⓘ dots off the Stats tab, sentences back. Stats is a
READING surface — you're there to study, so explanations belong in view.
Today/Lift are ACTION surfaces mid-workout — dots stay. The D1 target
"zero always-visible notes" is amended to "zero on action surfaces."

### D3 ledger (2026-07-20, v3.3.9)
- Buildable-iron ruler: SHIPPED v3.3.8, RETIRED v3.3.9 after one real
  session — "clunky and distracting." wLaw survives as the invisible law
  behind the stepper. Second trial-and-revert of the workstream; the
  doctrine is judged by use, not by how good it sounded in the study.
- Grid month-expand, fire scrub, Last-Time prefill: SHIPPED v3.3.9.
- History day-swipe: N/A — History is an accordion, no detail view to page.
- D2 closed with the milestone moment (v3.3.9).

### De-AI workstream (2026-07-20, v3.3.11) — trial, revertable
Tell inventory: left accent bars (the canonical AI pattern — we had them on
every h2), uniform card grid, 12–16px friendly radii, single generic accent.
North star: the paper ledger the app grew from. T1 bars removed, T2 Stats
de-carded (chrome = tappable, a semantic), T3 radii sharpened. T4 (History
as literal ledger: mono columns, date stamps, hairlines) PENDING Sungjee's
verdict on T1–T3. Revert tag: v3.3.10-pre-deai.

### De-AI pass: REVERTED (v3.3.12, 2026-07-20)
T1-T3 shipped and were reverted the same session — "awful" on the real
screen. Third revert of the workstream. What it taught: ShowUp's chrome
wasn't decoration standing in for taste. The cards carried grouping the
mono type couldn't hold alone, and the accent bars anchored the tracked
uppercase labels. A critique of generic AI design was correct in general
and wrong for this app. T4 dropped. Doctrine unchanged: judged by use.
