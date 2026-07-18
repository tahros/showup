# ShowUp — changelog

## v3.1.12 — Tap the red header to return to your session
In live mode the header IS the session — tapping it now jumps straight to
the active exercise: the most recent set today whose part is still open
(completed parts are skipped, so after closing Chest a tap lands on Back).
Buttons inside the header — back, gear, demo bar — keep their own behavior;
tapping the header while already on that exercise does nothing. Cursor
affordance added in live mode.

## v3.1.11 — Plate hint on two lines
"20 kg bar + 15 kg per side" wrapped mid-thought. Now: bar on line one,
per-side on line two, no plus sign. Reads at a glance from the rack.

## v3.1.10 — Plate diagram updates as you type
The bar-loading hint ("20 kg bar + 15 kg per side") recomputed on +/− taps
and chips but not on manual weight entry — type 60 and it kept showing 50's
breakdown. One input listener later, the plate math follows every keystroke.

## v3.1.9 — The Run view shows its history
The Last Time card (v3.1.2) explicitly excluded Run, leaving the Run screen
a bare input form with 900+ runs invisible behind it. Now: RECENT RUNS —
the last 8, newest first, each as date · distance · time · computed pace
(Fri 7/17 · 3.93 km · 30'31" · 7'46"/km), footer with this-month and
lifetime totals. Rows without a recorded time render distance-only. Same
visual language as Last Time on lifts.

## v3.1.8 — Demo bar bleeds both edges
v3.1.7's header-resident bar came up 36px short on the right: a flex item's
outer size is basis + margins, so flex-basis:100% with -18px side margins
paints past the left edge but stops short of the right. Basis now pre-pays
the margins (flex:0 0 calc(100% + 36px)) — full-width red, both edges.

## v3.1.7 — Demo bar joins the header (gap fixed)
The v3.1.6 fix over-corrected: the fixed bar's measured height (safe-area
included) was added as body padding ON TOP of the header's own notch
allowance — safe-area counted twice, producing a big dead gap under the bar.

Rearchitected instead of re-measured: the demo strip now lives INSIDE the
sticky, already-notch-aware header as its first child, bleeding over the
header's top/side padding with a red repaint of the status-bar zone. No fixed
positioning, no JS measurement, no body offsets — the sticky header simply
carries it, always visible, zero gap. Old inline body padding is cleared on
boot for devices coming from v3.1.6.

## v3.1.6 — Fresh-slate visuals: three fixes from real-phone testing
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

## v3.1.5 — Onboarding actually renders (CSS variable hotfix)
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

## v3.1.4 — Last Time: one row per weight, both eras
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

## v3.1.3 — Swipe back from an exercise
Sungjee: inside "Incline Barbell Bench Press", a swipe should mean BACK to
Lift, not a tab hop. Agreed, and generalized: at drill-down depth a decisive
horizontal swipe — EITHER direction — pops back to the part list (your part
stays selected); at tab level swipes switch tabs as before. The edge hint
shows ‹ with your part name while dragging. Swipes beginning on inputs,
chip strips, heatmaps, and charts remain inert, and the back button still
works. You can no longer accidentally tab-hop out of a lift.

## v3.1.2 — "Last time" replaces the PR footer
The exercise screen's bottom panel now answers the one mid-workout question:
what did I do last time? Full previous session, nicely laid out — each weight
on its own row with rep chips (16 kg | 15 14 12), a Wed · 3 days ago stamp,
and a sets + total-volume footer. Mid-workout it shows the PREVIOUS session,
never today's own sets. Never-logged exercises get "today writes the first
line." Heaviest/Best-set moved out (they live in Records); suggested-set
chips up top are unchanged.

## v3.1.1 — Logout means goodbye (safely)
Spec from Sungjee: sync only ever happens signed-in (already true — every
push/pull is token-gated), and signing out should return the device to a
fresh onboarding.

signOut() is now a full detach: final cloud push FIRST, then wipe the local
copy, backups, and session, then reload into onboarding. If the push can't
be confirmed (offline, expired token), the app asks before discarding —
declining leaves everything intact and you stay signed in. Signing back in
restores the full history from the cloud. Demo data skips the push.

## v3.1 — Clean Slate: the hand-off build
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

## v3.2.2 — Rest days exist only in the past tense
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

## v3.2.1 — The seed leaves the building
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

## v3.2 — Daily Fire + iron-true suggestions
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

## v3.0.3 — History duplicates fixed
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

## v3.0.2 — The ledger, decoded: true weights
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

## v3.0.1 — True kilometers
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

## v3.0 — The Foundation: single source of truth
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

## v2.19.10 — Go-To tiers learn recency
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

## v2.19.9 — Pulsation returns, as color
Per Sungjee: the v2.19.8 state table stays exactly as agreed, and the active
part gets its pulse back — as COLOR oscillation on the red elements only, never
a whole-tile brightness dim:
- Active, not selected: the red border and 🔥 breathe between two reds (1.8s).
- Active, selected: the red fill itself pulses between --live and a deeper red;
  the white text stays solid and fully legible throughout.
- Off under Reduce Motion, like all motion in the app.

## v2.19.8 — The part-tile state table (rules first, then paint)
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

## v2.19.7 — Only you complete a body part: the Reopen button
The part board now ALWAYS carries the part-level control:
- Part open → "✓ Complete <part>" (unchanged).
- Part completed → "<part> completed ✓ — Reopen": one tap removes the completion,
  reopens the workout (red mode resumes), un-dims the tile, and stamps the day
  for sync. Individual exercise ✓s are preserved — reopening the part doesn't
  forget which exercises you finished.
No more being stuck when a completion happened that you disagree with (including
ones the pre-v2.19.6 auto-cascade applied). Only you decide when a body part is
done — and now you can un-decide too.

## v2.19.6 — Part tiles that tell the truth, calmly
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

## v2.19.5 — Red mode reaches the Today tab
- Today's per-exercise rows now speak the same language as the Lift tab: an OPEN
  exercise is red with a pulsing ● and tinted row; a completed one is gray with
  ✓. One glance at Today tells you exactly where you are mid-workout.
- "Continue <part> →" appears only for parts with something OPEN to continue.
  Completed Run no longer begs for continuation — the Run row itself stays
  tappable if you genuinely want to add another run (which reopens it, as
  always).

## v2.19.4 — Red where the work is, bodyweight in Settings, bar edits that reach
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

## v2.19.3 — The nudge understands modality
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

## v2.19.2 — Red mode follows you + the flag ping-pong ends + plate-honest nudges
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

## v2.19.1 — HOTFIX: completion state travels between devices
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

## v2.19 — Multi-device sync, done properly
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

## v2.18.2 — The nudge learns what weights actually exist
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

## v2.18.1 — Gym feedback: four fixes
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

## v2.18 — The motivation layer
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

## v2.17 — Wrap-around swipe, swipe cue, "I trained today", and the bounce
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

## v2.16 — Refresh in place, a pull you can feel, swipe between tabs
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

## v2.15 — Live-red semantics, Toss-grade dark mode, and a broken toast
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
