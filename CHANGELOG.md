# ShowUp — changelog

## v3.3.36 (2026-07-21) — The month gets shorter
Gym note: the History month is too tall. Calendar cells go from square to
1.45:1 landscape — a 6-row month drops roughly a third of its height and
hands that screen space back to the sessions list underneath. The grid
still reads: 7 columns, same gaps, same states. Cells stay below the 44px
touch ideal, as they already did — the dense-grid exception from v3.3.27
still applies, and a trained day is a generous target at this width.


## v3.3.35 (2026-07-21) — Both Continues pulse
Two screenshots side by side: Today's "Continue Shoulder →" pulses (the
v3.3.13 red pulse), the part view's new "Continue →" (v3.3.33) doesn't.
Same intent, same colour, different heartbeat.

Fixed by widening the existing rule rather than writing a second one:
`.chip.on.livego,.btn.livego` now share the fill AND the livepulse
animation, and the reduced-motion guard covers both. One keyframes block,
one behaviour — a lookalike copy would have been free to drift.

Cascade trap avoided: v3.3.33's standalone `.btn.livego{background;color}`
sat LATER in the file at equal specificity, so leaving it would have reset
`animation` to none and silently killed the pulse it was meant to enable.
Collapsed into the shared rule. Sheen still excludes .livego — red gets
its own signal animation, never decorative shimmer.


## v3.3.34 (2026-07-21) — The Today hero follows the lift you're doing
Two asks off three mid-session screenshots.

**Today's hero swaps while live.** Daily Fire's percentile is demotivating
mid-workout by construction — the day's running total starts every session
at the bottom of its own 921-day distribution, so it reads "bigger than 11%"
while you're actually having a good session. So while a session is live,
Today shows the v3.3.18 live chart for the exercise you're on: last 15
sessions in gray, today red and breathing, dashed all-time-best, and the
line that actually motivates — "beats 14 of your last 15". Daily Fire
returns the moment the day is sealed, when a whole-day percentile is the
honest summary.

The live lift = the most recently logged, not-yet-sealed, non-Run exercise
today. Runs are skipped deliberately: logging a run mid-lift-session would
otherwise hijack the hero, and the Run view owns its own charts.
liveBars() took an optional heading param — default unchanged, so the Lift
view still says "Today · live" while Today says "Dumbbell Press · live".

**The part meter goes red while live.** "Today vs your usual SHOULDER
session" is a live bar, so it follows the rule the header and fire needle
already follow: red while in motion, accent once sealed.

Known gap: the grow animation (lbGrow) keys on lift.ex and won't fire for
the Today copy, so the bar appears at full height rather than growing. The
CSS breathe still runs. Wiring growth to Today needs shared-state work that
didn't belong in this release.

Test note worth recording: the first run of test-todayhero.js "failed"
three assertions that were fixture poverty, not bugs — Daily Fire silently
skips under 30 lift days and the usual-meter needs history, exactly as the
handoff warned. The corrected fixture builds 40 real-shaped days with runs.
The second correction was mine: isLive() is "today has sets and the day
isn't sealed", NOT the rest timer — lastSetAt was the wrong lever.


## v3.3.33 (2026-07-21) — An open part offers both exits
Mid-session screenshot: the part view offered only "Complete Shoulder".
Now it offers the pair — Continue and Complete, side by side, whenever
the part is open.

- **Continue** reuses the data-go router, so it resolves to the exercise
  you're mid-way through exactly as v3.3.31's Today button does. One code
  path, one behavior, wherever you tap Continue.
- **Complete** keeps id donePartBtn and its existing handler untouched.

Two judgment calls. Continue keeps the fill and Complete takes an outline:
two filled blues side by side are indistinguishable once a session goes
non-live, and the hierarchy matches usage — Continue is tapped many times
a session, Complete once. Continue goes red only while isLive(), matching
Today's Continue exactly; an open-but-not-live part shows it in accent.

Doctrine repair caught in verification: .btn.livego would have inherited
the sheen system's .btn:not(.ghost) rule, putting decorative shimmer on a
red live control. All three sheen selector sites now exclude .livego —
red stays matte, everywhere, permanently. Ten-case behavioral test added
(test-exitpair.js) covering both states, the seal collapse, and the
sheen exemption.


## v3.3.32 (2026-07-21) — The logged block sinks into the page
Mid-session screenshot: "the logged box could be gray (close to white)."
Done — .zone.logged takes var(--ground) and drops its shadow, so finished
work reads as a well cut into the page rather than a card sitting on it.
This is the existing "logged = done = quiet" rule (documented at .settile)
finally applied at container level instead of only to the tiles.

Two notes on execution. The class is new: bare .zone was ambiguous —
the Suggested zone also renders bare when nothing is logged yet, so a
CSS-only :not() selector would have tinted Suggested on an empty day.
One word in lift.js removes the ambiguity. And the tiles deliberately
stay --surface2, which keeps them stepping off the tray in both themes
(light: tiles darker than tray; dark: lighter) — though the light-theme
delta halves (#FFF→#E8EAF0 becomes #F2F3F6→#E8EAF0). If that reads muddy
under gym lights, the fix is inverting the tiles to --surface: a recessed
tray holding white chips. Held back deliberately — it would make finished
sets louder, against the quiet rule.


## v3.3.31 (2026-07-21) — Continue means continue
Mid-workout screenshot (day 919 in progress): tapping "Continue Shoulder"
landed on the part view; Sungjee wants the exercise he's between sets of —
Dumbbell Press. The data-go router now resolves an OPEN part to its
last-logged exercise today and lands there directly; back to the part list
stays one tap away. Unchanged on purpose: Start and the add-on + (nothing
logged yet — the part view is where you choose), sealed parts, and Run
(the Run view owns itself). The lift object is rebuilt fresh on this path,
so no stale editor state rides along. First behavioral-test release since
the container reset: jsdom boot + injected day fixture + synthetic clicks,
four routing cases asserted (open→exercise, sealed→part, untouched→part,
Run→part).


## v3.3.30 (2026-07-21) — The month calendar shimmers
Annotated screenshot: the History calendar's trained days, circled. The
v3.3.27 exclusion called calendar cells "micro" — wrong at rendered size,
as the screenshot proved (they're larger than the strip squares the whole
sheen system started from). Corrected as a container sweep on .cal —
one band crossing the month, lighting the blue trained cells as it passes,
near-invisible on the gray rest days. Per-cell animation was rejected:
identical selectors share a phase, and thirteen cells flashing in unison
is a slot machine. Same inset-pseudo technique as the strip and heatmap;
no overflow clipping, so today's chalk outline (which draws outside its
cell) survives. The absolutely-positioned pseudo stays out of the grid
flow — no phantom eighth column.


## v3.3.29 (2026-07-21) — The selected part shimmers
Gym report: no sheen on the selected body part. Root cause was a plain
omission — the part-tile state table (documented at css line 317) says
selected = BLUE fill (.partcard.sel), and that surface never joined the
sheen system. It has now, as .partcard.sel:not(.liveP) — the :not matters
because the same tile in red mode (live session) is a signal, and signals
don't get decorated. The suggested tile (.hot, dashed border, e.g. the
Train Next pick before you tap it) stays matte deliberately: it's a border
treatment on gray, not a blue surface — if it should glow too, that's a
one-line tint change to the hot state, on request.


## v3.3.28 (2026-07-21) — Sheen reaches Lift, Stats, History
Verdict-driven follow-up: the other tabs showed no shimmer because their
blue lives in different forms. Three additions:
- **Selected chips, app-wide.** The [data-go] scoping widens to all
  .chip.on (livego still excluded) — this lights Lift's equipment and
  part selectors. Safe because selection is single-select in practice;
  if a multi-.on surface ever appears, this is the line to re-scope.
- **Stats heatmap.** Sweep on .heatwrap — the fixed outer frame, NOT .heat
  itself, which is the scroll container (a pseudo pinned there would
  scroll away with the columns). Overlay blend, strip-style.
- **History month chips.** .mchip.on joins with its own cycle.
Corrected en route: .kpi.accent was considered and rejected — only its
number is accent-colored; the card is gray surface, and text doesn't
shimmer. Known gap, named honestly: the Stats bar charts are SVG rects,
and CSS pseudo-elements cannot attach to SVG children — those bars stay
matte until a release adds an SVG-native sweep (gradient + SMIL or a JS
overlay). Repchips also stay matte: 13% tint, dozens per screen.

## v3.3.27 (2026-07-21) — Sheen everywhere it earns its light; rhythm tightened
Gym verdict on v3.3.26: sheen fantastic, dwell too long. Cycle shortened —
sweep now occupies 70% of a faster loop (strip 6.5s→4.2s; the pause between
passes roughly halves). Request: sheen on ALL blue surfaces. Implemented as
a consolidated system on every accent surface of meaningful size: primary
buttons (.btn, not ghost), the nudge CTA, the logger save bar, the
onboarding Start, the current-year progress fill, plus the original strip
and Start chip. Four desynchronized cycle groups (4.2/4.8/5/5.4s, offset
delays) so no two surfaces flash together — synchronized shimmer reads as
a system event, desynchronized reads as material.

Excluded, deliberately, from "all": anything red (live and at-risk carry
signals, and signals don't get decorated), plain selected chips (state,
not invitation — a Lift screen with five chips shimmering is a slot
machine), and micro surfaces (calendar cells, h2 kicker bars, nav bar,
fire needle) where motion at that size is noise, not light. One keyframes,
one reduced-motion guard covering all seven selectors.

## v3.3.26 (2026-07-21) — The screenshot four: sheen, sheen, info, nav bar
Annotated gym screenshot, four items, plus one straggler it flushed out.
1. **Rhythm strip sheen.** A subtle white band sweeps the 21-day strip left
   to right every 6.5s. Implemented as a background-position sweep on an
   inset:0 pseudo — NOT overflow clipping, which would have amputated
   today's chalk outline (it draws outside the strip box). Overlay blend
   makes it read on the blue trained squares and near-vanish on empties.
2. **Start CTA sheen.** Same effect on `.chip.on[data-go]` at a slower,
   offset cycle so the two never flash in sync. Scoped `:not(.livego)` —
   the red Continue button carries the live signal and gets no decorative
   motion mixed into it. Both sheens die under prefers-reduced-motion.
3. **ⓘ writes itself out.** The 20px glyph dot becomes a pill that says
   INFO — mono micro-caps, label tracking, same chalk-inverse. Both
   generators updated (header tip portal + lift infoBtn); aria unchanged.
4. **Nav active bar.** The current tab gets a 24×3px accent bar under its
   label — selection no longer carried by text color alone.
Straggler: the rhythm card's "% of year" was inline-styled 22px in
header.js — a size T3 retired but couldn't see (JS was out of scope then).
Now 20, on the ladder.

## v3.3.25 (2026-07-21) — T4: bold means data now
37 declarations of 700 meant bold meant nothing. Every bold site got a
verdict: is this a number you produced, or chrome? Fifteen chrome sites
demote to 600 — CTAs (.btn, .btn.done, .nudgego, .ll-bar.save), the ⓘ dot,
the record chip's text (its punch is the red, not the weight), labels
(.lasthead, h2 .hi), selection states already carried by inversion
(.cal .cd.on, .wdl.hiw), overlay text, and the exercise title. Twenty-two
data sites keep 700/800: weights, reps, totals, timers, KPIs, the milestone
number, the numeric pickers (.barinput, .repgrid buttons — the number IS
the button), records, and the streak at-risk alarm.

One deliberate exception: .h-date stays 700. In an app whose thesis is
days > volume, the date is not chrome — it is the datum. The masthead
keeps its weight.

Bold now answers one question: did you lift this?

## v3.3.24 (2026-07-21) — T3 scale collapse; frost turned up per gym verdict
Gym verdict on v3.3.21's chrome: right idea, too subtle. Header and nav go
82% → 70% opaque with blur stepped 14 → 16px so the content ghosting through
stays legible. header.live holds at 92% solid — live never whispers.

T3: the type scale collapses 26 sizes → 17. Every half-pixel size is dead
(9.5/10.5/11.5/12.5 — the tells of drift, each merged to its neighbor), and
the near-duplicate clusters fold: 16/17→17 — UP only, because 16px is iOS
Safari's zoom-on-focus floor for inputs and the logger input sat exactly on
it; 21/22→20 (exhead demotes slightly, deliberate); 26→24. 32px retired
itself when the Fire number joined the hero tier in v3.3.23. Observed, not
touched: the tip bubble hardcodes #16181D from the pre-OLED palette — it
still reads correctly as an elevated bubble and is inverted by design, but
it's the one hex in the file that answers to no variable. The nine-step
ladder remains the target; next pass folds 8/9, 13/14, and 18/19 if this
one survives the gym.

## v3.3.23 (2026-07-21) — Type system: three tracking registers, one hero tier
The creative-director review found 26 font sizes, 16 letter-spacing values in
two units, and 37 declarations of bold — sediment, not a system. This release
takes the two approved cuts (T1+T2); the scale collapse (T3) waits its turn.

- **T1 — tracking tokenized.** Sixteen values become three registers:
  `--track-num:-.02em` (heroes and display titles, 7 sites),
  `--track-label:.08em` (working micro-caps: column headers, KPI labels,
  nav, header sub, 8 sites), `--track-wide:.16em` (ceremonial kickers: h2
  section labels, part labels, milestone unit, 4 sites). Every px-unit
  tracking is dead (.8px/.4px/-.5px). The rest-timer's .02em removed —
  mono digits need no tracking. Planned as TWO tokens; the file overruled
  the plan: h2's wide tracking is the identity the accent bars anchor
  (de-AI lesson), so the wide register earned its token rather than being
  flattened into the label one.
- **T2 — one hero tier.** The Daily Fire number — the most important number
  in the app — sat at 32px while Rhythm and the first KPI shouted at 38px.
  The lead now matches the supporting cast: 38px, token tracking, weight
  unchanged.
No layout, color, or markup changes; jsdom boot byte-identical.

## v3.3.22 (2026-07-21) — OLED trial: the ground drops three stops
Dark theme only; light theme untouched. `--ground` #17181D → #0C0E13, with
surfaces and lines stepping down in formation (#171A21 / #232733 / #343947)
so relative elevation reads the same — everything just sits deeper. Went to
#0C0E13 rather than the spec's #080A0F to keep the slight blue cast that is
the app's temperature. Trial release under the standard rule: one workout
under gym lights decides; revert is the one palette line.

Also unified while in the neighborhood: index.html carried TWO theme-color
metas (#121317 and #17181D — the first stale since some forgotten era) and
the manifest still said #121317. All three now agree on #0C0E13, so the
status bar finally matches the ground it sits on. Frosted chrome from
v3.3.21 follows automatically — its colors are mixed from the vars.

## v3.3.21 (2026-07-21) — Safe juice: frosted chrome, live glow
First release cut from the visual-upgrade spec, filtered through the design
doctrine. Adopted: backdrop blur on header/nav and an ambient glow under the
live header. Rejected from the spec (recorded here so it stays rejected):
`!important` frosted header (would have silenced the red live header), gold +
green as new color authorities (violates one-authority law), the IBM Plex →
Space Grotesk swap (drops the load-bearing mono), blanket 44px targets and
uniform 14px radii (fight surfaces that are deliberately dense/varied). The
spec's press-feedback item was already shipped — the D2 juice block has had
scale(.955) on every tappable since v3.3.x.
- **Frosted chrome, gated.** Header and nav go 82% translucent with
  blur(14px) saturate(160%) — but only inside an `@supports` block, so any
  browser without backdrop-filter keeps the solid readable fallback. Colors
  are `color-mix`ed from `--ground`/`--surface`, so the coming OLED
  ground-darkening carries through with zero extra work.
- **Live never whispers.** `header.live` stays 92% solid red under blur and
  gains a soft downward glow (`--live` at 45%, static shadow — no new
  animation, reduced-motion unaffected).

## v3.3.20 (2026-07-20) — Re-seal, corrected: runs live in donePart
v3.3.19's re-seal asked "is every remaining EXERCISE in doneEx?" — but runs
are sealed at the PART level (donePart), so any day containing a run could
never re-seal: Sungjee's red bar stayed up, correctly reported within the
hour. The predicate is now coverage-based: a remaining set counts as
completed if its exercise is done OR its part is done — the same dual
convention the completion cascade itself writes. Verified against his exact
day: Run (part-sealed) + Squat (exercise-sealed) → add a set → delete it →
day re-seals, red bar stands down, run still counted.

## v3.3.19 (2026-07-20) — The mystery blob, and days that walk backward
- **The white blur behind the Dynamic Island, identified.** It was the
  pull-to-refresh spinner: its "hidden" position was a flat -58px from a
  top anchor that INCLUDES the safe-area inset (~59px on modern iPhones) —
  net effect, a white 36px circle with a soft shadow resting ~7px from the
  screen edge, peeking out around the island. The offset predates notches.
  Now it hides by its own height PLUS the inset (CSS + the drag math both),
  so hidden means hidden on every iPhone.
- **Deleting a set walks the day's state back.** Adding a set to a sealed
  day reopens it (correct) — but deleting that set left the day stuck
  live-red with nothing actually open. Now removal re-runs the completion
  logic: if everything that remains was already completed, the day re-seals
  and the red bar stands down; if nothing remains, the day is blank again.
  Applies to single-set delete and "Clear today's N" both. Verified through
  the full cycle: sealed → add (live) → delete (sealed) → delete last
  (blank).

## v3.3.18 (2026-07-20) — The live chart Sungjee actually asked for
v3.3.13's per-set bars were rejected on sight: six identical rectangles
say nothing. His spec, drawn from his own Google Sheet dashboard: show
TODAY RISING against this exercise's history.

The new chart speaks the Daily Fire's grammar — gray bars are your past,
red is you, now: your last 15 sessions of this exercise as gray bars, and
today as a red bar at the right edge that GROWS with a 380ms rise every
time a set lands, breathing gently (1.8s) while the session is live. The
dashed line is your all-time best session for this lift — cross it and
the label concedes: "best — beaten ✓". Footer keeps honest score: "6 sets
· beats 12 of your last 15 Squat sessions". Sealed day: Progression
returns.

Found and fixed while building it: the post-save animation hooks (count-up,
fire-state capture) have run BEFORE the innerHTML swap since v3.3.6 —
animating nodes that were about to be discarded. The count-up has jumped,
never counted, this whole time; the chip spring carried the moment. Now:
FROM-values are captured off the still-mounted old render, animations run
after the swap, on nodes that exist. Verified live: bar rises 1,200→1,500
on the mounted node, count-up tweens the mounted number.

## v3.3.17 (2026-07-20) — The calendar answers the tap it always invited
Sungjee, on the History calendar: "thought these were supposed to be
tappable — no?" No argument: v3.3.13 made dates ELSEWHERE jump to History
while the calendar itself — the most obvious tap targets on the screen —
stayed inert. Now a trained day opens its session in the list below and
scrolls to it; opening one closes the others. Rest days stay inert: there
is nothing to open, and that's the point.

## v3.3.16 (2026-07-20) — The bubble wins for good: portaled to <body>
v3.3.13's fix (position:fixed in place) lost to a deeper opponent than
z-index: every #view card enters with the `rise` animation, fill-mode:both
— and a FILLED transform animation keeps a stacking context alive forever.
A bubble rendered inside any card can therefore be painted over by every
later card, no matter its z-index. Sungjee's screenshot — a black strip
squeezed between the Run and Legs cards — is that spec behavior, verbatim.

The fix removes the fight: one #tipFloat node lives directly on <body>,
filled from the tapped dot's content, positioned at the dot, flipping above
when the nav would clip. No ancestor but body — nothing left to trap it,
nothing left to clip it. Any outside tap closes it; the same dot toggles
it; every re-render sweeps a stale one away. Full cycle verified.

## v3.3.15 (2026-07-20) — The fire needle obeys the red law
Sungjee asked when the Daily Fire card appears and disappears, and whether
it should survive workout completion. Answers, now encoded:

- It appears with the first set of the day and stays the whole day — it's
  the day's receipt, and the day is this app's atomic unit. It leaves the
  next morning with the new blank day. Unchanged, and defended: hiding the
  receipt at the moment of achievement would repeat the mistake v3.3.14
  fixed.
- But his confusion caught a real violation: the needle stayed LIVE-RED on
  a completed day. Red means "in motion" — that's the law — so a red needle
  on a sealed day whispered "still going," which is exactly why he went
  looking for the Complete button. Now: red needle while the session is
  live, accent-blue once the day is sealed. Same card, same number, honest
  color. State is legible at a glance.

## v3.3.14 (2026-07-20) — Completion gets a voice
Sungjee: "I'm missing Complete today's workout — where did it go?" Answer:
it did its job and left. Completing the last open exercise auto-completes
the whole workout (a cascade that has existed since red mode), and the
button is gated on the session being live — so it vanished the moment the
day was done. The toast announced it; toasts are missable mid-gym.

The real gap: completion only spoke through ABSENCE, and absence here means
rest, not achievement. Now a finished day says so where the button stood:
"✓ Workout complete · 5 sets — logging another set reopens it." One quiet
mono line, no card, no ceremony. And the promise it makes is verified:
logging any new set clears doneAll and brings the live session — and the
button — back.

## v3.3.13 (2026-07-20) — The workout-feedback seven
1. **Speech bubbles float free.** ⓘ bubbles now portal to position:fixed at
   the dot — no card, transform, or stacking context can ever clip one.
2. **Live Continue button is finally red — and breathes.** The .livego class
   existed since red-mode, but .chip.on outranked it in specificity: the law
   said red, the cascade said blue. Now red wins, with a slow 1.8s pulse
   (none under reduced-motion). Red = live, everywhere, including the way in.
3. **Fonts: the actual bug found.** Buttons never inherit font-family — every
   circled "FONT off" element (Share/Close, year pills, month cells) was a
   <button> silently using the system face. One rule fixes the class:
   button,input,select,textarea{font-family:inherit}. The report canvas gets
   its own fix: canvases can't see CSS fonts, so if Plex isn't loaded yet it
   drew in a substitute — now it redraws the moment the real fonts land.
4. **Blue dates are tappable** (Sungjee asked "what do you think?" — yes:
   blue already means interactive here, dates shouldn't be the exception).
   "+0% vs Tue, 7/14" and the LAST TIME date both jump to that exact day in
   History, opened and scrolled into view.
5. **Mid-workout, the chart answers today.** While the session is live, the
   exercise view's Progression yields to TODAY · LIVE: one bar per set,
   height = weight, reps under each bar, all-time best as a dashed line —
   a PR set turns its bar red. Complete the session and Progression returns.
6. **YoY charts: tap a year to isolate it.** Both the consistency chart and
   the run cumulative chart — tap a legend year, every other line fades to
   14%; tap again to restore.
7. **The changelog remembers its dates.** Every version header now carries
   its ship date, recovered from git commit history. Pre-repo entries (the
   single-file era) are honestly undated — those dates were never recorded.

## v3.3.12 (2026-07-19) — De-AI pass reverted in full
Sungjee's verdict on T1-T3, on the real screen: awful. Reverted whole —
css/app.css restored byte-for-byte from the pre-change copy (md5 match),
and the one body-attribute line removed from app.js. Accent bars back,
Stats cards back, 14/12/10px radii back. DOM hashes identical across all
8 harness screens before and after, so nothing else was touched.

Third trial-and-revert of the design workstream (selection inversion,
buildable-iron ruler, now the de-AI pass). Recorded, not mourned: the
thread's critique was about generic AI output, and ShowUp's chrome turned
out to be doing real work — a card meant something, the bars gave the mono
labels an anchor. T4 (History as literal ledger) is dropped with the rest.

## v3.3.11 (2026-07-19) — De-AI pass, T1–T3 (trial; revert tag: v3.3.10-pre-deai)
Prompted by a thread Sungjee agreed with: the left-accent-bar box is the
signature tell of AI-generated design — and every h2 in ShowUp wore one.
North star for this pass: ShowUp is a 918-day paper training log that
became software. Ledgers have rules and stamped numbers, not boxes.

- **T1 — accent bars removed.** The mono uppercase tracked labels carry
  hierarchy alone; the bar was decoration.
- **T2 — Stats de-carded.** Reading surface = ledger page: content sits on
  the ground under hairline top rules, full-bleed. Box chrome now survives
  only on action surfaces, where a card MEANS tappable.
- **T3 — radii sharpened.** 27 declarations: 14/13→8, 12/11→7, 10/9→6.
  Pills and small radii untouched. Friendly-app soft → instrument.

**REVERT (guaranteed):** this release is css/app.css + one body-attribute
line in app.js. Tag `v3.3.10-pre-deai` marks the exact prior state; a
pristine copy also sits at work/refactor/css_pre_deai.css. Restoring the
old css (+ version bump) undoes everything — DOM hashes were verified
identical across all 8 harness screens, so there is nothing else to undo.
Judged by use, like the inversion and the ruler before it.

## v3.3.10 (2026-07-19) — Never-tried list: alphabetical
Sungjee, signed out, saw the fresh-account Chest list in raw seed order —
"seems random," and it is: seed order is MY data-file order, meaningless to
anyone else. Never-tried exercises now sort alphabetically. Considered and
rejected: equipment grouping (headers-within-headers for a list a stranger
scans once). The deeper fix — a curated starter order for brand-new
accounts — belongs to the Phase-0 onboarding work, noted in ROADMAP.

## v3.3.9 (2026-07-19) — Ruler retired · the milestone moment · D3 complete
- **Ruler removed** (Sungjee: clunky and distracting). The D3 flagship is
  retired after one real session — recorded in DESIGN.md next to the
  inversion trial. What SURVIVES it: wLaw(ex), the single source of truth
  for buildable weights, still governs the ± stepper invisibly. The law
  outlived the instrument.
- **The milestone moment** (D2 closes): when a lifetime hundred falls, the
  toast is replaced by one earned full-screen beat — the number huge in
  mono, LIFETIME KILOMETERS beneath it, a thin rule, "crossed Mon, 7/20 ·
  day 923 of showing up," tap anywhere to return. One 380ms entrance, none
  under reduced-motion, no confetti. Fires once per hundred (guard
  verified). The 2,400 crossing — ~19 km out — will be its first real fire.
- **D3, the rest**:
  - Tap any month in the consistency grid → it opens in place: the month's
    line (days · kg · km · best streak, from the report-card engine) and a
    dot per day. Tap again to close.
  - Scrub the Daily Fire chart → "1,496 kg would be #17 of 34" — read-only
    what-if against your whole history; the real line returns the moment
    you lift your finger.
  - Tap a Last Time weight row → that weight loads into the logger, flash
    and plate line included.
  - History day-swipe: N/A by structure (History is an accordion, not a
    paged detail view) — recorded in DESIGN.md rather than forced.

## v3.3.8 (2026-07-19) — D3 flagship: the buildable-iron ruler
The weight picker from the apps Sungjee studied, made honest. Under the
stepper in the Log-a-set zone: a draggable ruler beneath a fixed accent
pointer. Drag to scrub weight; release and it snaps. The difference from
every app that inspired it: EVERY TICK IS A WEIGHT THAT PHYSICALLY EXISTS
for this exercise's equipment. Barbell/Smith ticks are bar + plate pairs
(20, 25, 30… anchored at YOUR bar); machine ticks are the stack. There is
no tick at 72.5 because there is no 72.5. Snapping isn't a correction —
the impossible weights simply aren't on the ruler.

- One source of truth: wLaw(ex) now feeds BOTH the ruler and the ± stepper,
  so they can never disagree about what iron exists.
- While dragging: the weight readout, plate line and the Add-set consequence
  all update live — scrub and watch per-side plates change.
- The ± stepper and typing remain (gestures always have fallbacks); typed
  odd values are still respected as your truth.
- No ruler on Run or bodyweight moves — you can't drag gravity.

Verified: bar-anchored labels all buildable, three-tick drag lands exactly,
non-conforming release snaps, Run/body excluded, stepper unchanged.

## v3.3.7 (2026-07-19) — Four fixes from Sungjee's gym screenshots (two are mine to own)
- **The stepper finally obeys the iron.** "26.3 kg per side" was impossible
  weight — and the investigation's answer to "why has this NOT been fixed":
  the buildable-iron law (v3.2.1) was only ever implemented in SUGGESTIONS
  (snapSug); the ± stepper itself always moved a flat 2.5 kg for every
  equipment type. The rule existed; the stepper was never taught it. Now:
  barbell/smith move in 5 kg (10 lb) totals anchored at the bar — plates
  load in pairs — and a non-conforming value snaps to the next buildable
  total in the pressed direction (72.5 + → 75, − → 70), clamped at the
  empty bar. Typed values are still respected as-is; machines/dumbbells
  keep their old step untouched.
- **Add set button un-broken** (my v3.3.5 regression): switching it to
  auto-width let the reps input's implicit min-width:auto force flex
  overflow — the input collapsed and the button bled past the card. Fixed
  basis (142px, room for the consequence line) + min-width:0 on the input.
- **Stats tab: sentences, not dots** (Sungjee's verdict): the four ⓘ on
  Stats (grid, drift, weekday, year-%) are plain visible notes again. The
  dots on Today and in the Run view stay. Recorded in DESIGN.md: progressive
  disclosure judged per-surface, not globally — reading-surfaces read.
- **Type meets in the middle**: header date 21 → 19px; exercise title in
  the red header 15 → 17px.

## v3.3.6 (2026-07-19) — D2 juice: the set-logged moment (glide + count-up)
The two missing pieces of game feel on the app's most important event,
per DESIGN.md D2 — honest events only, one motion each, ≤400ms:

- **The fire marker glides.** After logging, when Today re-renders, the red
  line doesn't teleport to its new rank — it slides there, 380ms ease-out,
  from exactly where it stood. Your set visibly MOVES the line. The fresh
  ▲rank chip floats in alongside it (400ms).
- **The volume counts up.** The exercise footer's total no longer jumps:
  it counts from the old total to the new one over 350ms, cubic ease-out.
  The number you just earned arrives like a number being earned.
- The set-chip spring already existed (savedpr/springin) and now completes
  the trio: chip lands, total counts, marker glides.

All three respect prefers-reduced-motion (instant, no animation). One
pre-existing edge documented: climbing from rank zero leaves ▲ silent (the
prev&& guard treats rank 0 as no-previous) — unreachable in real sessions,
left untouched per the no-rewrites rule.

## v3.3.5 (2026-07-19) — Blue selection restored · onboarding polish · the button that answers first
Three requests in one release:

- **Selection back to blue** (Sungjee's verdict): the v3.3.4 chalk-inversion
  experiment is reverted — selected part cards, chips and month chips wear
  accent blue again. Recorded in DESIGN.md: tried, judged in real use,
  rejected. That's the workstream working as designed.
- **Onboarding, finished**: a reassurance line on the first screen ("your
  training stays yours — export anytime; the demo never syncs"), and a new
  final step, "How to ShowUp" — the three gestures taught once (swipe right
  to go back, hold a set to edit, tap the red header to jump to your active
  exercise), then trusted forever. Closes the deferred first-visit-education
  item and Influences items 8 and 9.
- **D2 begins — live consequence on Add set** (Influences item 5): type reps
  and the button itself answers before you press: "Add set → 7,660 kg ▲3" —
  today's total volume after this set, and how many past days it overtakes
  on the fire chart. Empty input, plain button. The numbers are the game
  pieces; the CTA now plays them.

Verified: full four-step onboarding walk, preview math against the day's
canonical volume, harness clean with only the exercise screen changed.

## v3.3.4 (2026-07-19) — Selection inversion (design workstream, Influences item 7)
Selected states — part cards on Lift, filter chips, month chips on History —
now invert: chalk fill, ground ink, instead of accent fill. Readable at
arm's length mid-set, and semantically cleaner under the one-authority law:
ACCENT is now exclusively the app's voice (due, suggested, hot), LIVE RED
is exclusively the session, and INVERSION is exclusively your choice. Live
red still outranks selection on a live part card, unchanged. Because both
sides of the inversion are palette variables, it renders correctly in dark
and light themes with no extra rules. CSS-only; DOM byte-identical.

## v3.3.3 (2026-07-19) — Dark-mode black-text fix (forensic) + quieter date
Sungjee's screenshot: core-record names rendering near-black on the dark
theme. Pixel-sampled the screenshot rather than guessing: background was
exactly --ground, other-tier names exactly --muted, but the affected names
were TRUE BLACK (0,0,0) — a color that exists nowhere in either palette.
True black is the browser's DEFAULT ink, which means those glyphs were
being re-inked outside our stylesheet: iOS Safari's per-site "force dark"
(or a darkener extension) misclassifying bold table text on a site that
never declared its color scheme.

Three-layer fix:
- `color-scheme: dark` declared on :root (light theme declares light) plus
  the matching <meta> — forced-dark features now know the site is already
  dark and stand down. Root cause.
- body itself now carries color:var(--chalk) — no element can ever fall
  through to UA black again, whatever misclassifies. Seatbelt.
- The affected rows get explicit ink — darkeners skip already-colored
  text. Belt and braces.

Also per Sungjee's verdict on v3.3.2: the header date was too loud —
dialed from 24px/800 to 21px/700. The hierarchy stays; the shout goes.
DOM byte-identical per the harness.

## v3.3.2 (2026-07-19) — Type-scale courage (design workstream, from the influences study)
Studied Sungjee's screenshots of Stoic, Ladder and a workout-onboarding app;
the distilled lessons now live in DESIGN.md ("Influences"). First lesson
applied — extreme typographic hierarchy, one hero per screen:

- Today's date: 19 → 24px, weight 800, tighter tracking — the screen's anchor.
- Daily Fire volume: 20 → 32px — the mid-session hero earns display size.
- Streak number and lead KPI: 30 → 38px.
- Section labels (TRAIN NEXT, READINESS…): 12 → 10.5px, wider tracking,
  25% quieter — labels recede so numbers can lead. The whole point of the
  ratio: when the hero is big, everything else can whisper.

CSS-only: the snapshot harness confirms the DOM is byte-identical, so this
release carries zero behavioural risk by construction.

## v3.3.1 (2026-07-19) — "Bars & bodyweight" (Sungjee: bodyweight isn't a bar)
The settings section holding barbell, Smith bar AND bodyweight was titled
"Bar weights", which is wrong about a third of its contents — bodyweight
isn't bar math, it's what Pull Up, Dip and other bodyweight lifts count as.
Section renamed to "Bars & bodyweight", the button reduced to "Save" (the
heading already says what's being saved), and the explainer gained one line
naming what bodyweight is actually for.

Harness note: the version string renders in the Stats sync line as well as
the Settings footer, so version-only bumps kept flagging Stats as changed.
The normaliser now masks any vN.N.N anywhere, proven by hashing identical
code under two different version numbers. Third fix to this tool today —
each one was the tool being right and my explanation being wrong.

## v3.3.0 (2026-07-19) — Data out (Wave 1, final feature before hand-off)
Settings gains "Your data": four buttons that make leaving easy.

- **CSV ↓** — every set ever, one row per set: date, part, exercise,
  weight_kg, reps, set_no, mins, secs, distance_km. Weights in kg and
  distance in km — the stored truth — regardless of display unit. Proper
  quoting for names containing commas/quotes. Shares as a file where the
  share sheet supports it, downloads otherwise.
- **Copy for Sheets** — the same table as tab-separated text on the
  clipboard: open a blank Google Sheet, paste, done. This replaces the
  planned Sheets-API export deliberately: writing to a user's Sheet would
  require new Google OAuth scopes, and minimal permissions beats one fewer
  paste. ROADMAP updated to match.
- **Backup ↓** — the entire document (days + settings) as JSON, stamped
  with version and export time.
- **Restore…** — picks a backup file, shows exactly what will happen
  ("this device: N days → backup: M days"), keeps a local safety copy of
  current data first, preserves this device's database config, and stamps
  every restored day as newest so the restore wins last-write-wins sync
  everywhere. Blocked in demo mode. Invalid files get a calm toast, not a
  broken state.

Verified: row/escaping correctness incl. hostile exercise names, share/
download fallback chain without modern APIs, clipboard fallback chain,
and a full restore round-trip (replace + safety copy + upd re-stamp).

## v3.2.7 (2026-07-19) — The bubble stays readable
Sungjee's screenshot: the speech bubble opened at the bottom of Readiness and
was clipped by the nav bar, cutting the sentence in half. Two causes, both
fixed: the bubble sat at z-index 15 while the nav sits at 30 (so it rendered
UNDERNEATH it), and it always opened downward regardless of room.

- z-index raised above the nav.
- On open it measures itself: if the nav would clip it, it flips ABOVE the
  dot (arrow flips too); if it would run off the right edge, it aligns to the
  edge instead. Falls back to the old placement when there's no layout to
  measure, so nothing breaks in tests or odd browsers.
- Type up from 11px to 12.5px with more line-height and padding, and a
  slightly wider max — mono at 11px was tight for two-line explanations.

## v3.2.6 (2026-07-19) — Info-dots use the black speech bubble
Sungjee's screenshot: the D1 explainers expanded as plain grey text inside
the card, not as the dark bubble the SUGGESTED ⓘ already used. Same
mechanism, wrong dress. All ten dots now render `.tipbubble` — the existing
dark floating card with its little arrow — anchored to the dot instead of
reflowing the card. Two consequences: tapping ⓘ no longer pushes the layout
around (the bubble floats above it), and only one bubble is open at a time,
so a second tap elsewhere closes the first. One explanation surface for the
whole app, per the one-authority rule.

Verification note: the snapshot harness was reporting phantom diffs on
screens with no changes — the header's live rest timer ticks during a run,
so hashes drifted between captures taken minutes apart. The clock is now
normalised out of the hash. With that fixed, exactly the expected screens
changed (Today, Stats, Settings-version) and Lift/History were untouched —
which is the point of having the harness at all.

## v3.2.5 (2026-07-19) — Refactor: one file becomes a shell + 12 modules (no behaviour change)
Sungjee's request: split index.html so future work reads a small file instead
of 220 KB, without a framework, build step, or any redesign.

- `index.html` is now a 2.6 KB shell (meta, DOM skeleton, one inline pre-paint
  theme script, ordered asset tags). Styles → `css/app.css`. Logic → eleven
  `js/*.js` files: core, derive, util, header, report, today, lift, stats,
  history, settings, app.
- **Classic scripts, not ES modules** — ordered `<script src>` shares one
  global scope, which is semantically identical to the old single block. The
  split was therefore a pure move: no export/import rewiring, no logic edits.
  Cut points were contiguous line ranges on existing section boundaries.
- **Atomic deploys preserved.** Every asset URL carries `?v=3.2.5`, so a new
  index.html cannot pair with a stale cached file — the one real risk of
  multi-file PWAs. `sw.js` SHELL lists all 12 assets; cache bumped.
- **New build checks** (`buildcheck.py`): every referenced asset must exist,
  carry the current version stamp, and appear in the service-worker SHELL;
  CSS vars must be defined; the shell must stay under 8 KB with no inline
  styles.
- **Verification:** a snapshot harness renders eight screens (Today, Lift,
  part view, exercise view, Stats, report-card month nav, History, Settings)
  plus ten behavioural probes, and hashes the DOM. Baseline captured before
  any edit; every stage had to reproduce the hashes exactly. Final state is
  byte-identical to v3.2.4 against a version-matched baseline. Safety tag
  `v3.2.4-last-onefile` marks the pre-refactor commit.
- New `ARCHITECTURE.md` maps features to files.

## v3.2.4 (2026-07-19) — Monthly report card (Wave 1; per the ROADMAP spec)
Stats gains a Report Card: any month rendered as a 1080×1350 shareable
image — day heat-strip across the top (trained = accent, rest = outline,
future = dashed), four big numbers (days trained in the warm record tone,
kg lifted, distance run, best streak), and a footer with the all-time count
("N days of showing up") and the app URL. ‹ › flips months; Share opens a
preview overlay → native share sheet (file share), with a PNG download
fallback. Empty months disable the button rather than sharing a blank.

Correctness the hard way: the first build recomputed volume from assumed
row shapes and produced NaN — the derived session rows store reps as an
ARRAY and an effective weight with bar/bodyweight math baked in. Rewritten
to the exact fireDist/dailyFireHTML formulas and cross-checked equal to the
canon in tests, so the card can never disagree with the fire chart. Canvas
drawing uses arcTo paths (no roundRect dependency) and degrades to a toast
where 2D canvas is unavailable. Inherits the D1 aesthetic: the image has no
explanatory text at all.

## v3.2.3-d1 (2026-07-19) — The Tesla pass, part one: explanations behind the dot
First D1 release of the design workstream (DESIGN.md). Pure subtraction:
every always-visible MECHANICS explainer — ten of them — folded into an ⓘ
dot sitting exactly where the sentence used to be. Tap: the old note expands
in place; tap again: gone. Converted: Daily Fire, Readiness, Logged-today
(hold-to-edit hint), goal tick, cumulative-km chart, pace chart, year-%
chart, weekday chart, consistency grid, drift view.

Deliberately KEPT visible: data lines ("Last 4 weeks: 137 km over 27 runs",
goal projection) because they're content not explanation, and all Settings
prose because Settings is the manual. Reused the existing SUGGESTED ⓘ
pattern — one mechanism, not two.

Deferred within D1: Stats dashboard compression (kept this diff
subtraction-only) and first-visit-shows-once. Gate: a week of real use
without missing any removed sentence.

## v3.2.3 (2026-07-19) — Streak-at-risk (Wave 1, item 1; per the ROADMAP spec)
After 18:00, with today unwritten and a streak alive: the header flame and
count warm to the record tone, the dashed today-square warms to match, and
the rhythm board's line becomes "Nd streak · ends at midnight." That is the
entire intervention — no banners, no guilt copy, and consistent with
rest-is-absence it never claims today IS anything. Verified across four
states: at-risk evening, calm daytime, no-streak evening (nothing warms),
and trained-today (impossible to trigger). Threshold exposed as RISK_HOUR
for testability.

## v3.1.15 (2026-07-18) — Closing the last exercise ends the session, instantly
Sungjee closed every exercise (all ✓) and the header stayed red for an hour.
Root cause: multi-exercise parts deliberately stay open when an exercise is
✕-closed ("maybe more exercises coming") — so closing the LAST one left every
checkmark lit but doneAll unset, and only the separate Complete-workout
button could end live mode.

The grace now yields when it has nothing left to protect: if the ✕ just
closed the final open exercise of the day, all parts complete and doneAll
sets — red ends on the spot, the ✓ appears in the header, and the
"Workout complete" toast fires. Closing one-of-two still keeps the part
open as designed, and reopening a part re-lights live mode. Full cycle
verified: open → close one (live) → close last (instant off) → reopen (red
returns).

## v3.1.14 (2026-07-18) — Live-mode color corrections (Sungjee's annotations)
- The red header's subtitle ("CHEST · 1 SET LOGGED") now renders white as it
  always should have. Root cause was juicier than a CSS tweak: the exercise
  header branch returned before the line that clears the ✓ donetoday class,
  so a stale blue checkmark from the last idle render haunted the red header.
  Cleared on entry; live subtitle white incl. any ✓ pseudo-element.
- "Continue <part> →" wears the live red during a live session — the one
  element still speaking blue inside a red workout. When the session has
  gone cold, it stays accent blue (resuming from idle is an accent action).

## v3.1.13 (2026-07-18) — Stats decluttered: two charts that answer questions
Sungjee's verdict on the stacked monthly chart ("I HATE scrolling a chart")
and the radar ("doesn't further my understanding nor prompt any action"):
both deleted outright. Replaced by two scroll-free views, one question each:

- **Showing up, every month** — a year × month grid, days-trained per cell,
  darker = more, dashed outline on the month still being written. Five years
  of history on one phone screen, scroll-free by construction. (This is also
  the image the future monthly report card will reuse.)
- **Last 30 days, vs your usual** — sessions per part against YOUR OWN
  12-month rhythm, worst drift sorted first: "Back 1 · usually 4 ↓". The
  tick on each bar is your usual; on-pace parts stay quiet; parts with no
  established rhythm and no recent activity are hidden entirely. The baseline
  is you, not an implied ideal — so the only output is the thing quietly
  slipping before you noticed.

Bug caught in testing: partDays is an array of dates, not a count — the
first drift build divided an array by 365 and NaN silently disabled every
threshold. One .length restored the math; scenario tests (slipping / steady
/ ancient) all pass.

## v3.1.12 (2026-07-18) — Tap the red header to return to your session
In live mode the header IS the session — tapping it now jumps straight to
the active exercise: the most recent set today whose part is still open
(completed parts are skipped, so after closing Chest a tap lands on Back).
Buttons inside the header — back, gear, demo bar — keep their own behavior;
tapping the header while already on that exercise does nothing. Cursor
affordance added in live mode.

## v3.1.11 (2026-07-18) — Plate hint on two lines
"20 kg bar + 15 kg per side" wrapped mid-thought. Now: bar on line one,
per-side on line two, no plus sign. Reads at a glance from the rack.

## v3.1.10 (2026-07-18) — Plate diagram updates as you type
The bar-loading hint ("20 kg bar + 15 kg per side") recomputed on +/− taps
and chips but not on manual weight entry — type 60 and it kept showing 50's
breakdown. One input listener later, the plate math follows every keystroke.

## v3.1.9 (2026-07-18) — The Run view shows its history
The Last Time card (v3.1.2) explicitly excluded Run, leaving the Run screen
a bare input form with 900+ runs invisible behind it. Now: RECENT RUNS —
the last 8, newest first, each as date · distance · time · computed pace
(Fri 7/17 · 3.93 km · 30'31" · 7'46"/km), footer with this-month and
lifetime totals. Rows without a recorded time render distance-only. Same
visual language as Last Time on lifts.

## v3.1.8 (2026-07-18) — Demo bar bleeds both edges
v3.1.7's header-resident bar came up 36px short on the right: a flex item's
outer size is basis + margins, so flex-basis:100% with -18px side margins
paints past the left edge but stops short of the right. Basis now pre-pays
the margins (flex:0 0 calc(100% + 36px)) — full-width red, both edges.

## v3.1.7 (2026-07-18) — Demo bar joins the header (gap fixed)
The v3.1.6 fix over-corrected: the fixed bar's measured height (safe-area
included) was added as body padding ON TOP of the header's own notch
allowance — safe-area counted twice, producing a big dead gap under the bar.

Rearchitected instead of re-measured: the demo strip now lives INSIDE the
sticky, already-notch-aware header as its first child, bleeding over the
header's top/side padding with a red repaint of the status-bar zone. No fixed
positioning, no JS measurement, no body offsets — the sticky header simply
carries it, always visible, zero gap. Old inline body padding is cleared on
boot for devices coming from v3.1.6.

## v3.1.6 (2026-07-18) — Fresh-slate visuals: three fixes from real-phone testing
Sungjee's sign-out tour caught three visual bugs the DOM tests can't see:

- **Selected + dormant tile was washed out**: .partcard.dead{opacity:.45} was
  declared after .sel and won the cascade — a selected dormant part rendered
  at 45% accent. Selection is now the single authority (.sel.dead{opacity:1}).
- **"dormant" on day zero**: with no history, every part fell into the dormant
  bucket — absurd for a brand-new user. Virgin state (no sessions, no days)
  now renders all parts neutral with a "new" sublabel; verdicts like dormant
  only appear once there's history to judge (demo included).
- **Never-logged exercise rows dropped their .dim class**: the "Never tried"
  section header already says it; per-row dimming fought other styles and
  looked broken. Full tiles, muted subtext.
- **Demo bar respects the iPhone notch**: padding-top includes
  env(safe-area-inset-top), and the bar pushes app content down by its own
  height so it never hides the header (was invisible under the Dynamic
  Island on iPhone 17 Pro).

## v3.1.5 (2026-07-18) — Onboarding actually renders (CSS variable hotfix)
Sungjee signed out on his phone and got a collage: transparent overlay, black
serif logo, the Today hero bleeding through. Root cause: v3.1's CSS referenced
var(--bg)/--fg/--card — names that DON'T EXIST in the theme (real names:
--ground/--chalk/--surface). Buttons survived only because the app styles
<button> globally. jsdom tests assert DOM, not paint, so it sailed through.

Fixed: all 8 bad references renamed; #onb and #demoBar (which live on <body>,
outside the app wrapper's cascade) now carry their own font-family and color.
Added a permanent build check: every var(--x) used in the stylesheet must be
defined in :root or set at runtime — undefined names now fail the build.

Sign back in: the overlay greets you properly, and the cloud restores all
918 days.

## v3.1.4 (2026-07-18) — Last Time: one row per weight, both eras
Sungjee's two screenshots caught a data-shape leak: sheet-era sessions stored
one row per weight (35 kg | 25 20 20 16) while app-era logging writes one row
per set (50 kg | 23, 50 kg | 20, …) — so identical workouts rendered as 3
compact rows or 12 sprawling ones depending on when they were logged.

The card now folds CONSECUTIVE same-weight sets at display time: his Monday
bench session collapses 12 rows → 3 (50 | 23 20 16 16 · 75 | 2 2 2 2 ·
45 | 16 15 20 15), byte-for-byte the same sets and total. Consecutive, not
global — returning to a weight later stays its own line, preserving the
session's narrative order. Bare 0 kg marker rows (sheet-era empty-bar
artifacts) carry no information and are dropped from display. Storage
untouched; this is rendering only.

## v3.1.3 (2026-07-18) — Swipe back from an exercise
Sungjee: inside "Incline Barbell Bench Press", a swipe should mean BACK to
Lift, not a tab hop. Agreed, and generalized: at drill-down depth a decisive
horizontal swipe — EITHER direction — pops back to the part list (your part
stays selected); at tab level swipes switch tabs as before. The edge hint
shows ‹ with your part name while dragging. Swipes beginning on inputs,
chip strips, heatmaps, and charts remain inert, and the back button still
works. You can no longer accidentally tab-hop out of a lift.

## v3.1.2 (2026-07-18) — "Last time" replaces the PR footer
The exercise screen's bottom panel now answers the one mid-workout question:
what did I do last time? Full previous session, nicely laid out — each weight
on its own row with rep chips (16 kg | 15 14 12), a Wed · 3 days ago stamp,
and a sets + total-volume footer. Mid-workout it shows the PREVIOUS session,
never today's own sets. Never-logged exercises get "today writes the first
line." Heaviest/Best-set moved out (they live in Records); suggested-set
chips up top are unchanged.

## v3.1.1 (2026-07-18) — Logout means goodbye (safely)
Spec from Sungjee: sync only ever happens signed-in (already true — every
push/pull is token-gated), and signing out should return the device to a
fresh onboarding.

signOut() is now a full detach: final cloud push FIRST, then wipe the local
copy, backups, and session, then reload into onboarding. If the push can't
be confirmed (offline, expired token), the app asks before discarding —
declining leaves everything intact and you stay signed in. Signing back in
restores the full history from the cloud. Demo data skips the push.

## v3.1 (2026-07-18) — Clean Slate: the hand-off build
ShowUp can now be handed to a stranger. (Ships after v3.2.x — roadmap names,
not chronology.)

- **Onboarding**, three screens, chips only: (1) sign in with Google /
  continue local / explore demo; (2) pick your parts — six-part taxonomy
  preselected, tap to toggle, history always wins over the filter;
  (3) units, bodyweight, bar weight. Skippable; everything editable in
  Settings. Signed-in users with cloud history never see it (the overlay
  waits for the pull verdict).
- **Honest empty states** on Today, Stats, and History — what this tab will
  become, and a "log your first set" path. No boards of zeros.
- **Demo mode**: 70 days of deterministic sample training behind a persistent
  banner. Demo data never syncs (push hard-blocked); signing in wipes it;
  "Use for real" clears back to onboarding.
- **Part filter**: myParts shapes Lift ordering and Train-Next suggestions
  for new users; any part with real history always shows.
- **INSTALL.md rewritten** two-audience: friends get the URL + Google sign-in
  (zero install — multi-user has worked since the strip); self-hosters get
  fork → Pages → supabase-setup.sql → paste config in Settings. No code edits.

Gate (unchanged, and not skippable — it IS the hypothesis): a friend installs
unassisted and logs a real workout.

## v3.2.2 (2026-07-17) — Rest days exist only in the past tense
Sungjee, at the gym door before opening time, was told "REST DAY, SO FAR · 1
rest day in a row" — while the streak flame on the same screen said 🔥 2d.
The app was counting an empty TODAY as an already-decided rest day.

Now an empty today is UNWRITTEN, not rested:
- gap (rest-days-in-a-row) counts completed days only — the walk starts at
  yesterday. Trained yesterday → "2d streak · today unwritten" (agrees with
  the flame). Real rest run → "N rest days in a row · today unwritten".
- "N rest days in the last 21" no longer counts an empty today.
- Year-% divides by elapsed days EXCLUDING an unwritten today — the morning
  no longer dilutes your consistency before you've had the chance to train.
- Header: "Rest day, so far" → "Nothing logged yet".
- Today's calendar square: dashed outline (pending), not rest-empty. It fills
  when you train; it only becomes a rest square at midnight, retroactively.

## v3.2.1 (2026-07-17) — The seed leaves the building
The 918-day embedded seed literal is GONE: **650 KB → 194 KB (71% smaller)**.
SEED0 now carries only static config — catalog, exercise→part map, equipment
types (7.5 KB) — plus empty maps for safety. History lives where v3.0 put it:
doc.days in Supabase + localStorage, derived at boot.

- Fresh installs boot EMPTY (all tabs render, first set logs cleanly — one
  null-guard added to History's year loop) or restore fully from the cloud on
  sign-in. This is the substrate v3.1 Clean Slate builds on.
- Migrated devices are untouched: their days live in storage, not the file.
- Disaster recovery: the full seed is preserved forever in git tag
  **v3.2-last-seed** (and every tag back to v3.0).
- Gate note: shipped ahead of the full gym-week gate at Sungjee's call — with
  the gate's purpose already served by the byte-exact harness, in-app
  verification, and three days of live use; and with SEED0's fallback value
  actually NEGATIVE post-unit-conversion (it held mile/lb-ledger numbers).

Smoke-verified: migrated-device boot, fresh empty boot (all tabs + first set),
fresh device + cloud restore.

## v3.2 (2026-07-17) — Daily Fire + iron-true suggestions
- NEW **Daily Fire** on the Today tab, mid-session: today's total volume drawn as
  a red line climbing the sorted distribution of ALL your past lift days (60-bar
  sparkline of the full 915-day distribution). Headline gives your standing —
  "bigger than 71% of your 915 lift days", or "#12 biggest lift day of 915" once
  you're in the top quartile — and each added set shows a ▲N ranks-gained chip.
  Run-only days get the km variant against all 900 run days. Disappears on rest
  days; distribution recomputes after any pull.
- Nudge suggestions are now IRON, never arithmetic (Sungjee's rule: no decimals,
  ever). Every candidate — history-first included — snaps to buildable loads:
  kg mode barbell/smith = bar + whole 5 kg steps (one 2.5 plate per side, using
  your per-exercise bar setting), dumbbells = whole-kg bells, stacks = 5s;
  lb mode = 10 lb bar steps / 5 lb bells and stacks. Snapped value must strictly
  beat the plateau. The converted 61.2 kg Row plateau now suggests exactly 65.

## v3.0.3 (2026-07-17) — History duplicates fixed
Reported: History showed duplicate entries. Cause: allDays() (the History day
detail source) merged SEED.sessions with DB.days by CONCATENATION — safe before
v3.0 when the two were disjoint (archive ≤ 07-10, app ≥ 07-11), but since v3.0
SEED.sessions is DERIVED FROM DB.days, so every historical day existed in both
sources and every set rendered twice.

Fix: DB.days now REPLACES in the merge — it is the source of truth. A full audit
of every other SEED.sessions consumer (runDays, avgSessionVol, monthly
composition chart, overload-nudge history) confirmed they were already guarded
by d>totals.last or Set-deduped; allDays was the sole offender.

Side benefit: History day details now display the converted true weights.

## v3.0.2 (2026-07-17) — The ledger, decoded: true weights
The sheet's weight column wasn't one unit — it was a five-year ledger with
per-equipment conventions, decoded with Sungjee against his benchmark week
(entries from Mon 2026-07-13 = honest total kg) and calibrated on real data:

| equipment      | sheet convention              | conversion                              | example |
|----------------|-------------------------------|------------------------------------------|---------|
| smith          | already total kg              | UNTOUCHED (calibration exact: 60→60)     | 60 → 60 |
| dumbbell       | lb ledger of kg iron          | ×0.45359, snap 1 kg bells                | 26.45 → 12 |
| barbell        | PER-SIDE lb, 45 lb bar excl.  | (2×side+45)×0.45359, 0.1 kg              | Row 45 → 61.2 |
| machine/cable  | lb stack faces                | ×0.45359, snap 2.5 kg stack              | Fly 100 → 45 |
| Pull Up        | 70 = his kg bodyweight        | stays 70                                 | 70 → 70 |
| Dip            | noise values (25/50)          | all → 70 (full-bodyweight movement)      | 25 → 70 |
| Leg Raises     | meaningless weights           | all → 0 (bodyweight label, no fake volume)| 20 → 0 |
| Chest Squeeze  | lb plate                      | ×0.45359, 1.25 kg grid                   | 25 → 11.25 |

Cut: rows before 2026-07-13. One targeted post-cut fix: Dumbbell Combination
22 → 10 (admitted leftover habit; true bell is 10 kg).

Headlines: lifetime volume corrects to **6,522,091 kg** true (was 8,035,814
mislabeled). Squat PR becomes **120.2 kg** (110/side + bar), Deadlift **138.3**.
All PRs, session meters, and history-first nudge suggestions now operate on
physically true, plate-real numbers.

Safety: pre-conversion snapshot at localStorage['showup:bak:preunits'];
idempotent via synced flag; converted days stamped for cross-device LWW;
runs (v3.0.1) untouched and verified.

## v3.0.1 (2026-07-17) — True kilometers
Sungjee flagged that pre-app data was "logged as lbs and miles." Forensics on
all 7,845 rows said: half right —
- DISTANCES were miles: 901-run median pace of 12.7–14.5 min/unit only makes
  sense in miles (12.7 min/mi = 7'54"/km, matching the app-measured 7'46"/km);
  zero conversion artifacts meant raw treadmill readings.
- WEIGHTS were always kg: Pull Up/Dip read 70 (his kg bodyweight) in every year;
  2026 sheet weights numerically match app-logged kg from the same week.

So: migrateMiles() converts Run distances ×1.609344 for sheet-era days only
(≤ 2026-07-10), leaves every weight untouched, stamps converted days so the
fix syncs to all devices, and is idempotent via a synced flag. Milestone
bookkeeping catches up silently.

The headline: 1,477.6 miles = **2,377.8 km**. The 1,500 km "upcoming"
milestone was crossed in 2023. Verified: totals.vol and every PR bit-identical;
double-boot does not double-convert.

## v3.0 (2026-07-17) — The Foundation: single source of truth
The seed stops being the truth. All stats now derive at boot from raw days;
your Supabase doc.days holds the full 918-day history as ordinary, editable,
syncable data.

- **deriveAll()**: rebuilds every stat map (totals, monthly, PRs, per-exercise
  history, frequencies, rep patterns, last-session data) from raw days at boot,
  in ~tens of ms. The builder was proven BYTE-EXACT against the embedded seed in
  an offline harness across all 918 days / 7,845 rows, then re-verified in-app:
  all ten time-independent maps identical; totals 918 · 1,477.6 km · 8,035,814 kg.
- Reverse-engineered semantics now encoded (and documented in the source):
  partCount counts rows not days; partDays/exFreq are 365-day windows; monthly
  sets are lifts-only; PR excludes Run while repFreq includes it; repFreq ties
  break by first appearance; lastSess skips rep-less sessions; monthly km is a
  raw-float sum with decimal-correct rounding (Python and JS disagree at .x5).
- **Windows now anchor at TODAY** — "last 365 days" finally means the last 365
  days, not 365 days before the July import. totals.last lands on yesterday, so
  every existing live-today code path works unchanged.
- **migrateV3()**: one-time, stamped, non-destructive — bootstrap history merges
  into days wherever a day doesn't already exist; app-logged days are never
  touched. A pre-migration dailyBackup snapshots first.
- Pulls re-derive; pushes drop the duplicate archive payload.
- The embedded seed remains in-file as SEED0 (migration source + fallback) for
  exactly one release: v3.0.1 strips it (~75% file shrink) after a full gym week
  on derived stats, per the roadmap gate.

Rollback: tag v2.19.10 (and v2.19.1) restore the pre-foundation app; data
remains compatible in both directions.

## v2.19.10 (2026-07-17) — Go-To tiers learn recency
Reported: Incline Barbell Bench Press sat in "Sometimes" despite being trained
4 days ago, while Flat Smith Bench held "Go-To" at 1486 days ago / 0× this year.
Two causes, two fixes:
- A 'core' pin (tier override) made Flat Smith unconditionally Go-To forever.
  Pins now expire after 365 days without training the movement.
- The Go-To gate required 3+ sessions in the trailing-year count, which is
  anchored to the imported history — a NEW staple could never qualify. Now a
  repeated recent habit is Go-To on its own: 2+ sessions in the last 60 days,
  whatever the lifetime count says. Switching staples (Smith → Barbell incline)
  is reflected within weeks, not next year. The frequency path remains as a
  second door for long-standing staples.

## v2.19.9 (2026-07-17) — Pulsation returns, as color
Per Sungjee: the v2.19.8 state table stays exactly as agreed, and the active
part gets its pulse back — as COLOR oscillation on the red elements only, never
a whole-tile brightness dim:
- Active, not selected: the red border and 🔥 breathe between two reds (1.8s).
- Active, selected: the red fill itself pulses between --live and a deeper red;
  the white text stays solid and fully legible throughout.
- Off under Reduce Motion, like all motion in the app.

## v2.19.8 (2026-07-17) — The part-tile state table (rules first, then paint)
After several rounds of visual patches collided (pale-pink-with-white-text
tiles), the tile system was rebuilt from an explicit state table, agreed with
Sungjee before implementation:

|                    | selected            | not selected                    |
| ACTIVE (red mode)  | RED fill, white text| white, thin red border, 🔥      |
| COMPLETED today    | BLUE fill, ✅       | white, dimmed 65%, ✅           |
| RECENT             | BLUE fill           | white                           |
| DORMANT            | —                   | gray, dimmed 45%                |

- Fill = what you're viewing; red fill only ever means "viewing the active part".
- Suggested pick = thin DASHED accent border, idle days only, never in red mode.
- All v2.19.4–v2.19.6 tile rules (breathe animation, tinted selection, .55 dim,
  pulsing tile text) are REMOVED, not just overridden — every selector now has
  exactly one authority in the stylesheet, verified by an automated check that
  counts rule occurrences and asserts the winning declaration.

## v2.19.7 (2026-07-17) — Only you complete a body part: the Reopen button
The part board now ALWAYS carries the part-level control:
- Part open → "✓ Complete <part>" (unchanged).
- Part completed → "<part> completed ✓ — Reopen": one tap removes the completion,
  reopens the workout (red mode resumes), un-dims the tile, and stamps the day
  for sync. Individual exercise ✓s are preserved — reopening the part doesn't
  forget which exercises you finished.
No more being stuck when a completion happened that you disagree with (including
ones the pre-v2.19.6 auto-cascade applied). Only you decide when a body part is
done — and now you can un-decide too.

## v2.19.6 (2026-07-17) — Part tiles that tell the truth, calmly
- The ACTIVE part tile is now a steady **red border** — no fill takeover, no
  dimming animation. Selected adds only a faint red tint. Calm and unambiguous.
- The blue "suggested part" highlight (the rotation's pick) is suppressed during
  red mode: no suggestions while you're mid-workout. Idle, it returns unchanged.
- A part no longer dims until YOU complete it. Previously, completing the last
  open exercise auto-completed the part — so finishing Pull Up dimmed all of
  Back while you were still training it. Part-openness is now a part-level
  fact: sets exist and you haven't hit "Complete <part>". The one-tap cascade
  survives exactly where it belongs — single-exercise parts (Complete Run still
  closes everything). "Complete <part>" closes the day only when every trained
  part is explicitly completed. Logging a new set still reopens, as always.

## v2.19.5 (2026-07-17) — Red mode reaches the Today tab
- Today's per-exercise rows now speak the same language as the Lift tab: an OPEN
  exercise is red with a pulsing ● and tinted row; a completed one is gray with
  ✓. One glance at Today tells you exactly where you are mid-workout.
- "Continue <part> →" appears only for parts with something OPEN to continue.
  Completed Run no longer begs for continuation — the Run row itself stays
  tappable if you genuinely want to add another run (which reopens it, as
  always).

## v2.19.4 (2026-07-17) — Red where the work is, bodyweight in Settings, bar edits that reach
- The part you're ACTIVELY working now shows it: selected + live = solid red tile
  with a slow breathing dim (2.2s cycle; off under Reduce Motion). Red mode is
  finally consistent from header to tile to row.
- **Bodyweight** joins the bar weights in Settings. Bodyweight moves (Pull Up,
  Dip…) default their weight to it, and the loadline reads "your bodyweight ·
  70 kg" when it matches — or points you to Settings when unset. Focus-selects
  like every numeric field.
- The in-lift bar editor now offers TWO scopes: "This lift" (per-exercise
  override, as before) or "All barbell / All Smith" — which updates the universal
  setting and clears this exercise's override so the global actually applies.
  No more editing the same bar twice in two places.

## v2.19.3 (2026-07-17) — The nudge understands modality
"Try 72.5 kg" on Pull Up meant "gain 2.5 kg of body mass" — nonsense. The nudge
now knows what kind of movement it's looking at:

- **Bodyweight** (pull ups, dips, etc.): progression is REPS. Plateau at the same
  top reps for 3+ sessions → "Same 12 reps for 14 sessions — one more?" Tapping
  the button prefills the reps box with the target. Dismissal is keyed to that
  rep count, so it only returns when your reps actually move.
- **Free weight / Smith**: plate-honest weight steps (+5 kg total, one 2.5 per
  side; +10 lb imperial) — as of v2.19.2, unchanged.
- **Dumbbells**: rack steps (+2 kg / +5 lb) — unchanged.
- **Machines**: stack steps (+2.5 kg / +5 lb) — unchanged.
- History-first still applies to all weighted modes: a weight you've used before
  always beats a computed increment.

## v2.19.2 (2026-07-17) — Red mode follows you + the flag ping-pong ends + plate-honest nudges
- COMPLETION CONVERGENCE, finished: v2.19.1 fixed the flag merge, but a device
  that had already pushed a flag-less copy could keep the cloud flag-less — the
  "laptop stays red" ping-pong. Every pre-v2.19 day now gets a deterministic
  stamp (lastAt, or noon of that day) at boot AND on the remote side of every
  pull, so both devices agree on every day's age. Equal stamps merge flags; any
  real edit stamps Date.now() and wins outright. The asymmetry is structurally
  gone.
- RED MODE (official name, per Sungjee) now follows the work: returning to the
  Lift tab mid-workout lands on the part of your latest OPEN set — not the
  rotation's suggestion. Off red mode, the default pick is unchanged.
- PLATE-HONEST nudge increments, per unit system. "45 → try 47.5" meant a
  nonsense 13.75 kg per side. Fallback increments now land on buildable weights:
  barbell/smith +5 kg (one 2.5 plate per side) or +10 lb; dumbbells +2 kg / +5 lb;
  machines +2.5 kg / +5 lb. History-first suggestion unchanged — the fallback
  only fires at your all-time max.

## v2.19.1 (2026-07-16) — HOTFIX: completion state travels between devices
Reported: laptop refreshed onto v2.19, pulled today's session — and showed the
workout as LIVE (red) although it was completed on the phone.

Cause: a transitional hole. Days completed BEFORE v2.19 carry no edit stamp, so
they merge via the legacy union path — which merged the sets array but silently
dropped the completion flags (doneAll / doneEx / donePart). Sets arrived,
completion didn't.

Fix: the legacy union now merges completion state too — completed anywhere means
completed everywhere (doneAll OR, done-lists unioned, lastAt maxed, dismissed
suggestions combined). Logging a new set still reopens the day as always, and
from that moment the day is stamped and lives under clean per-day
last-writer-wins.

Verified against the exact report: laptop with unstamped mid-workout copy pulls
the phone's completed copy → completion arrives, no set duplication, header
cools, ✓ prefix shows; a fresh set reopens and stamps the day.

## v2.19 (2026-07-16) — Multi-device sync, done properly
The laptop joined the phone, exposing v2.10.2's stated limitation: with routine
pulls disabled, a second device shows its own stale copy forever. The sync model
graduates:

- **Per-day last-writer-wins.** Every mutation stamps its day (`upd`). Pulls
  compare day by day: the newer version of each day wins WHOLE — which means
  deletions finally propagate between devices (deleting a set makes your copy
  newer, so the deletion travels). Days from before v2.19 have no stamp and keep
  the old key-order-safe union merge.
- **Every device pulls on open**, and again when a tab regains focus after 2+
  minutes away — the laptop left open overnight catches up the moment you return.
- **Strict pull-before-push, no exceptions.** The old "established device may push
  without pulling" shortcut is gone; it was safe for one device and dangerous for
  two. Offline, changes stay local and push after the next successful pull.
- Settings copy updated: "Devices sync on open and on return, day by day — the
  newest edit of each day wins everywhere."

Verified against the exact reported divergence: stale laptop boots → today's
session appears; laptop deletes a set → phone receives the deletion; a locally
newer day survives a pull of older cloud data.

Honest edge to know: if you train the SAME day on BOTH devices without either
syncing in between, the day with the later edit wins whole. For one human with
one body, that's a corner case — flag it if it ever bites and I'll do set-level
merging.

## v2.18.2 (2026-07-16) — The nudge learns what weights actually exist
- "Try 24.5 kg" on a dumbbell exercise was nonsense — no rack on earth has 24.5s.
  The suggested next weight now comes from YOUR OWN HISTORY first: the smallest
  weight above your plateau that you've actually used on that exercise (for
  Dumbbell Combination at 22, that's 25 — you've lifted it before, it exists).
  Only when nothing above exists in history does it fall back to an increment,
  and that increment is now equipment-honest: +2 kg for dumbbells, +2.5 kg for
  bars and machines, +5 lb in imperial.
- Layout fixed: the suggestion button was inheriting width:100% from the base
  button style, crushing the text into a one-word-per-line column. Text now gets
  the row (flex:1), the button hugs its label, nothing wraps.

## v2.18.1 (2026-07-16) — Gym feedback: four fixes
- "Days trained, by month": the current month reads correctly now — the trained
  count sits INSIDE the filled bar in white, the number above the dashed outline
  is days elapsed (16 as of 7/16), and the summary line says both ("10 trained ·
  6 rested / 16 days into 07").
- "Every month, by part" scrolls sideways again: the chart's horizontal axis was
  being stolen by tab-swipe. The scroll container is now on the swipe blocklist,
  same as the heatmap and suggestion strip.
- Records: the pace unit ("/km") joins the bold mono figure instead of dangling
  in the body font.
- Logged sets are now visibly DONE: gray fill, dimmed (72%), no accent border —
  while Suggested chips keep their outline and blue reps. The two can no longer
  be confused, which matters because tapping a logged tile deletes it. (The set
  you just saved springs in at full opacity before settling into the dim state.)

## v2.18 (2026-07-14) — The motivation layer
- NEW **progressive-overload nudge**, in the Log-a-set card directly under the
  stepper it's about to change: "Same 60 kg for 3 sessions — try 62.5?" One tap
  sets the weight (and saves it as that exercise's default). ✕ dismisses it until
  the weight actually moves — it can't nag you at the same number twice. Fires
  only at 3+ identical top sets, and never on bodyweight-only moves, whose
  progression is reps, not load.
- NEW **milestone crossing**: passing any 100-unit boundary (1,500 km is imminent)
  is now a real event — recorded once, announced once, never nagged.
- NEW **yearly goal** in the Run section: declare a target and the app tracks it
  honestly — a progress bar with a tick marking where you SHOULD be today, an
  ahead/behind figure, and your projected year-end total. Unset, it just tells you
  what you're projecting and offers a suggestion based on last year.
- Fixed a temporal-dead-zone bug caught in testing: the goal card referenced the
  year-totals map before the chart built it.

## v2.17 (2026-07-14) — Wrap-around swipe, swipe cue, "I trained today", and the bounce
- Swipe now WRAPS: right from Today lands on History, left from History lands on
  Today. The four tabs are a loop, not a line.
- A large translucent chevron appears on the edge you're swiping toward, growing
  more opaque the further you drag (35% → 100% over 90px), and vanishes on
  release. You can see the swipe register before you commit to it.
- The header now says you TRAINED today: once a workout is logged and completed,
  the status line is prefixed with an accent ✓ ("✓ 4 sets · Legs · 3.45km").
  While a workout is live you get the pulsing red dot + timer instead, so the two
  states never compete — ✓ means done, ● means now.
- BOUNCE restored. Building pull-to-refresh in v2.07.2 required disabling the
  native overscroll bounce, which flattened the whole app. Now: the top edge still
  belongs to pull-to-refresh, but the bottom edge springs again — drag past the
  end and the content stretches with diminishing returns (÷2.6, capped at 80px),
  then snaps back with a slight overshoot, the way an Apple list does. Purely
  visual; no scroll state is touched.

## v2.16 (2026-07-14) — Refresh in place, a pull you can feel, swipe between tabs
- Pull-to-refresh no longer dumps you back on Today. Your tab, selected part, and
  open exercise are stashed before the reload and restored after — you land
  exactly where you were. (Also applies to the auto-reload when a new version
  installs.)
- The page now FOLLOWS your pull: the whole view slides down with your finger and
  springs back on release. The little arrow was never enough feedback on its own.
- NEW swipe navigation: swipe left/right to move along the nav —
  Today ↔ Lift ↔ Stats ↔ History. Clamps at both ends. Deliberately inert inside
  an exercise page (← owns that axis there), on horizontally scrollable strips
  (suggested chips, heatmap), on zoomable charts, and on set tiles, so it never
  steals a gesture that already means something. A swipe must be clearly sideways
  (1.5× more horizontal than vertical) and at least 60px, so scrolling is safe.

## v2.15 (2026-07-14) — Live-red semantics, Toss-grade dark mode, and a broken toast
- BUGFIX (the "error at the bottom"): the v2.14.3 portrait-lock patch accidentally
  swallowed the #toast CSS selector, so every toast since then rendered as naked
  text at the bottom of the screen. Selector restored; stylesheet brace-balanced
  and verified.
- Settings gear is a TOGGLE now: tap it in Settings and you return to exactly the
  screen you came from (Stats → Settings → Stats), nav highlight included.
- ONE COLOR LANGUAGE for "now": while an exercise is open, its part tile AND its
  row on the part board go live-red with a pulsing dot — matching the red header —
  so tiles, rows, and header all agree on what you're doing right now. Completing
  flips both to gray with "✅ today" (tile dims to 55%, row loses its tint). 🔥 is
  reserved for in-progress; ✅ means done.
- DARK MODE lifted toward Toss-style legibility: background #17181D, surfaces
  #20222A / #2B2E38 with clearer separation, lines #3C404C, secondary text up
  from #8B909C to #A2A8B6, faint text up to #747A8A. Same design, more light.
- BUTTON TYPE UNIFIED: all ghost buttons share one 14px size (the Undo row no
  longer mismatches Clear/Move — nor anything else at that level).
- Progression chart labels reduced (7 → 5.5 in chart units) per the screenshot;
  no more billboard-sized axis dates.

## v2.14.4 — HOTFIX: doubled sets + stuck versions
Two bugs, one update.

DOUBLED SETS (root cause: Postgres jsonb). Supabase stores the cloud document as
jsonb, which re-sorts object keys — a set leaves the phone as {part,ex,w,reps,at}
and returns as {at,ex,part,reps,w}. The pull merge deduped by raw JSON.stringify,
so the same set in two key orders looked different, and any Pull ↓ into non-empty
local data duplicated EVERYTHING — which constant-sync then pushed back to the
cloud, cementing it.
- The merge now uses a key-order-insensitive signature. Verified: a pull of the
  same day with jsonb-reordered keys adds exactly zero sets.
- AUTOMATIC REPAIR at boot and after every pull: exact-duplicate sets sharing the
  same `at` timestamp are provably clones (two real sets can't be logged in the
  same millisecond) and are collapsed; a toast reports how many. Intentional
  repeats (e.g. 8 real 70×10 dips) carry distinct timestamps and are untouched,
  and pre-timestamp history is never touched at all. The repaired state pushes to
  the cloud, cleaning it too. Verified against the exact broken state from the
  screenshot: 10 sets → 5 (4 real dips + 1 run), old days untouched.

STUCK VERSION (root cause: cache-first index.html). The service worker served the
app shell cache-first forever, so a deployed update only appeared after the new
worker activated — which the pull-to-refresh reload raced past.
- The worker now serves stale-while-revalidate: instant from cache, refreshed in
  the background.
- The app auto-reloads ONCE when a new worker takes control (flushing saves
  first), so a deployed version goes live within seconds of the next launch.
- Expect one self-reload the first time you open v2.14.4 — that's the mechanism
  working.

## v2.14.3 — Portrait only
- The app no longer follows the phone into landscape. Three layers, because
  platforms differ: the manifest declares portrait (honored by Android and
  desktop installs), screen.orientation.lock('portrait') is attempted at boot
  where the API allows it, and on iPhone — where Apple gives web apps no way to
  hard-lock — a full-screen veil covers the app in landscape ("Portrait only ·
  Rotate your phone back") so it never renders sideways.
- The veil is CSS-only, phone-scoped (coarse pointer + short viewport), so
  iPads and desktop windows are unaffected, and it can't break rendering.
- Deliberately NOT done: the rotate-the-DOM-90° hack — it fights the sticky
  header, fixed nav, and safe-area insets, and fails in exactly the janky ways
  this app avoids.

## v2.14.2 — Header truth + scroll float
- BUGFIX first: the ← was appearing on EVERY screen (your part-board screenshot),
  not just inside exercises. Cause: .icobtn's display rule sat later in the
  stylesheet than .hback's display:none at equal specificity, so it won. The back
  button is now header-scoped (higher specificity, ordering-proof) and appears
  only in exercise mode.
- The ← follows Apple's HIG: the whole icon-button family is now a 44×44pt touch
  target (up from 38), with a larger, heavier chevron. It reads as a button.
- The logo is out of the header — the top-left is the back button's slot inside
  an exercise, and empty otherwise. The mark lives on in the app icon.
- The duplicate exercise title is gone: the page-level H1 was repeating what the
  sticky header already says. One name, one place.
- The session meter now reads as an explanation, not content: gray (surface2)
  fill with a dashed border, its bar track flipped to keep contrast.
- NEW scroll float: any card, zone, KPI row, or table that starts below the fold
  drifts up 16px into place as it scrolls into view (IntersectionObserver; fires
  once per render; fully disabled under Reduce Motion; guarded so motion can
  never break rendering).

## v2.14.1 — Contextual back button
- The redundant "← Legs" row on the exercise page is gone — the header already
  names the exercise and part right above it.
- In its place, the header's top-left slot is now contextual: inside an exercise,
  the brand arrow swaps for a bordered ← button (same circular styling as the
  gear, so it unmistakably reads as tappable) that returns to the part board.
  Leave the exercise and the mark comes back. Same footprint, zero new chrome.
- Settings keeps its own ← Back; nothing else moved.

## v2.14 — Edit in place + the session meter
Closes the last two items from the July feedback batch.

- **Hold a logged set (~0.5s) to edit it** — weight and reps for lifts (reps
  accepts a comma list for multi-set rows), distance/min/sec for runs. The tile
  being edited gets a blue outline, a light haptic tick fires where supported,
  and the follow-up click is swallowed so a hold can never accidentally delete.
  A plain tap still deletes; scrolling cancels the hold. Hint now reads
  "Tap a set to delete it — hold to edit."
- **Session meter** on the part board, under today's logged list: a bar filling
  toward your USUAL session for that part — the per-session average across all
  918 days of history plus app-logged days (today excluded, since today is the
  thing being measured). Grows with every set; at 100% the bar brightens and the
  percentage turns blue. Runs measure km instead of volume. This is the "how is
  today adding to the overall picture" visual — placed on the part board because
  that's where CHEST · TODAY lives. (The progression chart already shows today's
  top set live at the exercise level.)

## v2.13 — Your history moves into Supabase (stage 1)
The 4–5 years of workout history (918 days, 7,845 rows, back to 2021-12-13) now
lives in your Supabase row, not just inside index.html. Every push carries the
full imported history under doc.archive, converted to the app's own day format.

- Verified against the seed's own ground truth before shipping: an independent
  recount of the pushed payload gives exactly 7,845 rows, 1,477.6 km, and
  8,035,814 kg of lift volume — byte-for-byte agreement with the embedded totals.
- The app still RENDERS from the embedded seed for now — zero behavioral change,
  by design. This release is about where the data LIVES.
- Settings shows the archive line under your account, so you can always see what
  the cloud holds. You can also see the raw data yourself: Supabase → Table
  Editor → app_state → doc → archive.
- Push payload grows to ~0.5 MB per sync. Acceptable for now; goes away in
  stage 2, when the archive becomes the app's actual working data.

Stage 2 (v3.0, planned): the app computes all stats from raw days at boot, the
archive merges into days as the single source of truth, and the embedded seed
leaves index.html entirely — gated on a deep-diff harness proving derived stats
match the embedded ones exactly.

## v2.12 — Progression + Readiness
- NEW **Progression chart** on every exercise page (below Logged today): top set
  per session as a line, last ~14 sessions plus everything logged since. Red dots
  mark TRUE PRs — the first session that tied or beat your all-time max, checked
  against full history, not just the visible window. The latest session pulses
  blue; first/last dates anchor the x-axis. Bodyweight-only moves (all-zero
  history) chart top REPS instead. Hidden when under 3 sessions exist.
- NEW **Readiness board** on Today (pre-gym), replacing the Rotation chips: each
  main part is a bar filling toward how often you usually train it. Full blue
  bar = due. Sorted most-ready-first, each row shows "Nd / every Md", and tapping
  a row jumps straight into that part. Same data as before (your actual training
  intervals) — now glanceable instead of readable.

## v2.11 — Supabase-only, constant sync, and screenshot fixes
- REMOVED "Backup to GitHub" entirely (markup, handlers, and the CSV machinery
  with it). One sync system: Supabase. The bar-weight inputs — which quietly
  shared GitHub's save button — got their own "Save bar weights".
- REMOVED both CSV exports ("Export today" on the part board, "Export everything"
  in History). The sheet era is over; the cloud is the backup.
- CONSTANT SYNC: on top of the ~1s push after every change, the app now pushes on
  every tab switch (debounced) and on every backgrounding/close — the close-time
  push uses fetch keepalive so it completes even as iOS suspends the app.
- Display buttons ("kg · km" / "Light ◐") are the same size now — a stale header
  CSS rule was still targeting #unitBtn after the button moved to Settings.
- Header status line never wraps: one line with ellipsis, and "3.45km" tightened.
- Lift tab: today's logged exercises are visually distinct — accent left border,
  faint blue tint, ● while open, ✓ once completed.
- Today tab: "N sets →" columns align perfectly (right column no-wrap + pinned).

## v2.10.2 — Sync, the simple way + the Run cascade
Sync direction is now one sentence: THE PHONE IS THE SOURCE OF TRUTH.
- Cloud → phone happens exactly twice: first open on an empty device (restore),
  and the moment you sign in (initial sync). Routine app opens no longer pull.
- Phone → cloud happens everywhere else: automatically ~1s after every change,
  and pull-to-refresh now force-pushes SYNCHRONOUSLY before reloading.
- Why this fixes the "Supabase overrides my data" feeling: the old boot-time pull
  merged by union, and a union can't represent deletions — delete a set, pull to
  refresh before the debounced push fired, and the deleted set resurrected from
  the cloud. Now deletions ride the forced push and stay dead.
- Settings keeps "Pull ↓" as the one explicit restore-from-cloud action, and its
  copy now explains the direction in plain words.
- Safety unchanged: a device that hasn't restored yet still cannot overwrite the
  cloud (the v2.09.1 reinstall protection).

Also: completing the LAST open exercise or part now completes the whole workout.
Morning run → tap "✓ Complete Run" → header cools. No second trip to Today
required. Logging anything later reopens everything, as before.

## v2.10.1 — Rest timer: deleting a set now lets go of the clock
Reported: after deleting a logged set, the red header stayed on with the timer
still ticking. Root cause was two-fold:
- The timer anchored to the moment of the LAST LOGGED set — and deleting that set
  never moved the anchor. Sets now carry a timestamp (`at`), and every removal
  path (tap-to-delete, remove-exercise ✕, Clear today's, Undo) re-anchors the
  clock to the newest remaining set, or stops it when none remain.
- The red header itself was often CORRECT: a morning run keeps the workout open
  all day (by design — complete it to close it), so deleting an evening lift set
  leaves the header live. What was silly was a rest clock ticking for hours. The
  timer now hides after 30 minutes without a set — 30+ minutes isn't "rest
  between sets". The header stays red until you Complete the workout.
Verified against the exact scenario: run 3h ago → timer hidden, header live →
lift set → 0:00 ticking → delete it → header still live (run open), timer quiet →
remove everything → header cools.

## v2.10 — Logger polish (feedback batch)
- Suggested row moved BELOW "Log a set" — the primary action leads the page.
- Your latest logged set now leads the Suggested strip (blue-outlined chip):
  one tap duplicates it. Duplicate weights/reps dedupe so the strip stays tight.
- The ⓘ bubble now includes a plain-text readout of the whole last session
  ("Last session — Tue 7/7: 50×23 · 60×4 · 60×4 …") above the shortcut chips.
- Bigger − / + steppers (76px wide, up from 56) — and each tap flashes the weight
  red with a tiny scale pop. A little adrenaline, contained to 300ms.
- Tapping the weight (or any numeric field: reps, distance, min, sec, bar) selects
  the whole number — type straight over it, no manual deleting.
- "Clear today's N" / "Move to another lift →" now share one row, one line each.
- "✓ Complete …" buttons are now solid accent blue — unmissable.
- Sticky header FIXED: it was declared sticky all along, but body{overflow-x:hidden}
  silently disables sticky on iOS. Switched to overflow-x:clip, which clips without
  creating a scroll container. Header (and the rest count-up) now stays put while
  you scroll.
- After "Complete workout", the "Continue <part> →" chips disappear from Today.
  The exercise rows stay tappable — logging a set resumes everything, per v2.09.

## v2.09.1 — HOTFIX: the data-loss bug
What happened: deleting/re-adding the home-screen app (e.g. to refresh the icon)
wipes iOS localStorage. That should be fine — the cloud has everything — but two
bugs compounded:
1. SILENT SYNC DEATH. When the Supabase token refresh failed, the app signed
   itself out quietly. Every push afterwards was a silent no-op, so the cloud
   copy went stale while the app looked synced.
2. PUSH-BEFORE-PULL CLOBBER. Push replaces the whole cloud document. On a fresh
   install, any save that fired before the boot-time pull finished (logging a
   set, a settings write) pushed the near-empty local state OVER the cloud copy
   that still held history.

Fixes:
- Pull-before-push gate: a device that hasn't successfully merge-pulled this boot
  physically cannot push. First push after a fresh install is guaranteed to be a
  superset of the cloud. Verified against the exact reinstall scenario.
- Sync failures are loud now: expired sign-in shows a toast + a red dot on the
  gear button; Settings shows a "Not syncing" banner whenever local workouts
  exist without a session.
- Rolling local backup: one snapshot per day (last 5 kept) under separate
  localStorage keys, as a belt against any future app-level clobber.

Recovery notes for data lost before this fix: see the chat.

## v2.09 — Session flow: workouts now have a beginning and an end
The organizing idea (Sungjee's): a session is a continuous flow of sets with a
clear start and finish, at three levels — exercise, body part, whole workout.

- **Complete buttons at every level.** "✓ Complete <exercise>" at the bottom of the
  exercise page; "✓ Complete <part>" under the part's logged list; "✓ Complete
  workout" on the Today tab. Completing the last open exercise in a part quietly
  completes the part. Logging a new set to anything completed reopens it — and its
  parents — because you can absolutely train chest twice in a day.
- **Live mode.** While the workout is open (first set → Complete workout) the
  header burns red — the one place red now means "heart pumping" rather than
  "record". Completing the workout cools it back down. Live mode belongs to the
  workout, not the exercise: you're still training between exercises.
- **Rest count-up.** A ticking m:ss clock sits in the live header, restarting at
  every logged set. It's a glance-value only — nothing is logged — and it survives
  an app reload mid-gym.
- **Suggested sets are shortcut keys now.** Tap one to log that w×r — as many
  times as you like; chips never disappear on use. Each has a ✕ to dismiss it for
  today (persisted). Max 6 show at once; dismissing one slides the next in. Once
  you've started logging, the zone shrinks to a one-line horizontal strip so it
  stops eating screen. "Log all" logs exactly the visible chips.
- **Go-To dedup.** An exercise you're currently working lives ONLY in the
  "· today" list; it leaves Go-To/Sometimes until you complete it, then returns
  tagged "✓ done today".

## v2.08 — Feedback batch 1: nine fixes
- FIX double-tap zoom: tapping +/− quickly no longer zooms the page
  (touch-action: manipulation). Chart pinch-zoom is unaffected.
- FIX duplicate "Carried over from…" text: the static note under the Suggested
  Session header is gone; the ⓘ bubble is now the only place it lives.
- SIMPLER header: the "✓ showed up ·" prefix is dropped (the mark says it), and
  the kg/lb and light/dark buttons moved into Settings under a new Display card —
  they're set-and-forget, not every-session controls. Header is now: mark, date,
  one status line, streak, gear.
- MOVED "Heaviest / Best set" lines from the top of the exercise page to the very
  bottom, under everything. Their "(−0 days ago)" oddity is fixed too: now reads
  "today" / "yesterday" / "N days ago". Bottom of every page also gained real
  padding against the home indicator.
- INVERTED "Pace by month": faster months now sit lower, as requested.
- BODYWEIGHT moves (Dip etc.): tiles and shortcut chips now read "BW × 12" instead
  of "0 kg × 12", and the logger starts at bodyweight instead of a fake 20 kg.
  Adding plates still works — type a weight and it reads "bodyweight + N".
- DEFAULT WEIGHT is now saved per exercise: every change (stepper, typing, or
  tapping a shortcut set) persists, so the exercise opens at exactly the weight
  you last used, forever, until you change it again.
- PLATE LINE simplified: "(1×25 + 1×2.5)" tally removed — it's now just
  "20 kg bar + 10 kg per side".
- ABOUT the "40 kg → 10.8 per side" report: the math was right — (40−20)/2 = 10
  exactly — which means the stored weight was actually 41.6, almost certainly
  drift from an lb-era value seeding the default. Two of the fixes above kill
  this class of bug: inferred defaults now snap to clean stepper increments, and
  your explicit per-exercise defaults are saved verbatim.

Next: v2.09 = session flow (complete exercise/part/workout, live workout mode,
rest count-up, suggested-as-shortcuts with ✕, Go-To dedup). v2.10 = duplicate/edit
logged sets + today-vs-history visual. v2.11 = per-exercise progression.

## v2.07.4 — Logo goes monochrome
- The mark is now pure black-and-white: both the shaft and the arrowhead are chalk.
  The accent blue is out of the logo entirely (it was in the v2.07.3 cut).
- All icons re-cut from the mono source: icon-192, icon-512, apple-touch-icon (180),
  maskable-512.
- Header mark simplified to a single currentColor — it still flips white on the
  live-blue header, but the special-case rule for the accent arrowhead is gone.

## v2.07.3 — New logo
- NEW mark: a geometric up-arrow. Built on a 512 grid — 54px stroke, round caps,
  arrowhead legs at exactly 45°, shaft on the vertical axis. Shaft in chalk, head in
  the accent blue, so the mark uses the app's own palette rather than being flat
  monochrome.
- Replaces the generic bar-graph placeholder everywhere: icon-192, icon-512,
  apple-touch-icon (180), plus a new maskable 512 (glyph scaled to a 72% safe zone
  so Android's circle crop can't clip the arrowhead).
- The mark now also sits in the app header, left of the date. It inherits the theme
  (chalk in dark, ink in light) and flips fully white when the header goes live-blue
  mid-session, so the accent-colored head can't disappear into the accent background.
- Service worker pre-caches the icons; favicon added.

## v2.07.2 — Pull to refresh
- NEW: hold the page down from the very top and let go — a circular indicator
  follows the pull, the arrow flips blue at the trigger point (72px), and on
  release the whole app refreshes.
- One gesture does three things in order: flushes any pending save (so nothing
  is lost), asks the service worker to check for a newer app version, then
  reloads — and the boot sequence cloud-pulls when signed in. So it means both
  "freshest data" and "freshest app".
- Pulls that start inside a zoomable chart are ignored, so the gesture never
  fights pinch-zoom. Pulls only begin when the page is scrolled to the very top;
  normal scrolling is untouched. The native rubber-band bounce is disabled
  (overscroll-behavior) so the two effects don't stack.

## v2.07.1 — Standalone-mode fixes
- FIX: header no longer hides under the iPhone status bar / Dynamic Island when the
  app is installed to the home screen. The page opts into edge-to-edge rendering
  (viewport-fit=cover) and the bottom nav already padded for the home indicator,
  but the header never got the matching top inset. In Safari the browser chrome
  masked it; standalone exposed it. Header now pads by env(safe-area-inset-top).
- FIX: theme (and any setting or set) could be lost if the app was closed within
  ~350ms of the change. Saves are debounced, and iOS kills a home-screen app the
  instant it's swiped away — the pending write simply died. This is why dark/light
  seemed not to stick. Now a pagehide/visibilitychange flush writes synchronously
  to localStorage the moment the app is backgrounded.
- FIX: no more wrong-theme flash at launch. A one-line pre-paint script applies the
  saved theme from a tiny mirror key before any CSS renders, instead of waiting for
  the async data load.

## v2.07 — Motion pass
Modern motion behaviors (the shadcn/Animate-UI language), implemented natively —
zero dependencies, still one file. Guiding rule: if removing an animation makes the
UI harder to understand, it earns its place; otherwise it's decoration and it's out.
Everything below vanishes under iOS "Reduce Motion", and the whole pass is wrapped
so a motion failure can never break rendering.

- **Tab transitions** — switching tabs cross-fades with a 3px drift via the View
  Transitions API (iOS 18+ Safari; older browsers just get the instant swap).
  In-view re-renders (logging a set, toggling a setting) intentionally do NOT
  transition, so mid-workout logging never flashes.
- **Tap feedback** — buttons, part cards, exercise rows and set tiles press in
  ~4.5% with a 130ms spring. Confirms the touch; biggest win for in-gym use.
- **Set-save moment** — the set you just logged springs into its tile; if it ties
  or beats your best weight, one red pulse radiates out. Red still = records only.
- **KPI count-ups** — plain numbers (1,478 km, streaks, session counts) tick up
  over 450ms with ease-out. Paces and dates don't move.
- **Staggered entrance** — cards and headers rise 8px with a 40ms stagger, capped
  at 9 steps so long pages never feel slow.
- **Chart draw-in** — every line chart sweeps left-to-right (consistency, YoY run,
  pace); single-series bars grow from their baseline (weekly run, monthly training,
  weekday). Stacked composition segments intentionally excluded — growing them
  independently would tear the stack apart mid-animation.

## v2.06 — Cloud credentials baked in
- The Supabase project URL and anon key are now embedded in index.html, so a fresh
  device (new phone, cleared Safari, incognito) never asks for them — Settings goes
  straight to "Continue with Google". This was the chicken-and-egg on the iPhone:
  the credentials lived in each device's localStorage, but a new device needed them
  BEFORE it could sign in and sync.
- The URL was embedded as the bare origin (the pasted /rest/v1 variant is trimmed).
- Safe to embed: the anon key is public by design — every browser using the app sends
  it anyway, and row-level security is what actually protects the data.
- If values are ever saved manually in Settings, those still override the baked-in
  ones (useful if the database ever moves).

## v2.05 — Run folds into Stats
- The Run tab is gone after one version; nav is back to 4 tabs. The whole Run story
  now lives inside Stats, between "Every month, by part" and Records.
- Stats got a jump bar at the top — Days · Parts · Run · Records — one tap scrolls
  to the section, so the longer page stays navigable.
- Milestone number is quiet now (chalk, not red), and the progress bar is blue.
  Red stays reserved for records.
- "Every week" x-axis: week numbers (24, 25, 26…) instead of unreadable month/day.
- "Year over year": axis gridlines are evenly spaced round numbers (90/180/270/360)
  with the unit on the top label; each year's tag sits at the end of its own line
  ('23 and '24 auto-nudge apart since 305 vs 303 nearly tie); the live 2026 line
  ends in the same pulsating blue beacon the consistency chart uses.
- "Pace by month": the current month is a pulsating blue dot with blue text;
  the fastest month keeps its red dot.
- Records dates dropped to a small muted second line under each number.

## v2.04 — Running gets its own tab
- NEW **Run** tab (5th in the nav). Running was near-daily but only ever showed up
  as one small monthly bar chart buried in Stats; it now has a home.
- **Next milestone** card: distance to the next 100 (km or mi), a progress bar, how
  many runs that is at your recent average, and a projected date from your last-4-week
  rate. Currently: 22.4 km to 1,500.
- **Every week**: last 16 weeks of distance, with the 16-week average line.
- **Year over year**: cumulative distance by day of year, 2022→2026, same shape as the
  consistency chart. (2022: 252 · 2023: 305 · 2024: 303 · 2025: 361 · 2026: 246 so far.)
- **Pace by month**: minutes per km/mi, last 12 months, fastest month in red.
  Computed from timed runs ONLY — 824 of your 900 runs have a clock on them, and an
  untimed run now adds distance without polluting the pace.
- **Records**: longest run, fastest pace, biggest week, biggest month.
- Run streak counts back from today (or yesterday, if today just hasn't happened yet),
  matching how the lift streak already behaves.
- REMOVED the "Distance run, by month" card from Stats — the Run tab supersedes it.
  The underlying monthly-km map stays; the composition chart still overlays it.
- Verified: the Run tab's all-time total reconciles exactly to the seed's 1,477.6 km,
  so nothing is double-counted between seed history and app-logged days.

### Note on the data model (confirmed against the sheet)
A run row is `[part, exercise, distance, reps[], Minutes, Seconds]` — the Minutes and
Seconds columns of the Log sheet. Distance is stored in km (your Analysis tab calls it
"KM Ran") and converted for display when the app is in imperial mode.

---
*Dates recovered from git commit history (v3.3.13 backfill). Entries without
a date predate this repository — the single-file era before version control —
and their exact ship dates were never recorded. From here on, every entry
carries its date at release time.*
