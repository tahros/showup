# ShowUp â€” changelog

## v3.3.217 (2026-08-12) â€” Stats, made actionable

- Growth Audit now puts each exercise's load Ã— reps record directly in the row and calls out a recent record change.
- Session Build filters are larger, thumb-friendly, and use distinct categorical colours.
- Consistency's ahead/behind verdict is larger; Monthly Pace gains breathing room, month initials, and year context.
- Distance is now a same-date two-year race, weekly distance uses a fair same-weekday cutoff, and the run milestone resets monthly.
- Pace gets a real axis/grid and quieter labels; the current running month becomes a visual six-metric dashboard.
- Removed Every Month, This Month goal/target, yearly running goal, and duplicate Records sections. Report Card remains intact.

## v3.3.216 (2026-08-12) â€” One section gap

**Growth Audit now follows the normal Stats section rhythm.** Its special
52-pixel top margin is gone, so the space after Current Rhythm matches the
space after Growth Audit and the surrounding card-to-heading transitions.

## v3.3.215 (2026-08-12) â€” One calendar proportion

**Current Rhythm now follows History's calendar geometry.** Its day cells use
the same 1.45:1 landscape proportion, four-pixel spacing, label scale and card
padding, removing the oversized square grid while preserving the streak-first
header and day states.

## v3.3.214 (2026-08-12) â€” Scrub your race

**Consistency is readable at every date again.** Press or drag across the
year-over-year graph to move an exact-day guide. The date, both large workout-
day totals, and the ahead/behind gap update together; releasing returns the
card to today's comparison.

**The comparison stays calendar-honest.** Both years now share one aligned
calendar-day timeline, including leap-year edges, so the scrubber never shows
a fractional workout day or compares two different dates.

## v3.3.213 (2026-08-12) â€” Time that helps

**Current rhythm makes today visible.** The active streak is now the dominant
readout, backed by a compact current-month calendar that fills today with the
first completed set and keeps the best streak in view.

**Consistency is now a same-date race against yourself.** Exact workout-day
totals for this year and last year lead the card, while a cumulative graph and
filled gap make both the direction and size of the difference obvious.

**Monthly pace compares partial months fairly.** Each of the last 12 months is
counted only through the same day number as today. Every month remains as the
long-range record; Days by month, Last 6 months and Weekdays are retired, along
with their redundant share cards.

## v3.3.212 (2026-08-12) â€” Quieter Flat, useful help

**Flat now recedes with Empty.** The minus uses the same muted gray and opacity
as the Empty dot, so only Going Up carries accent color.

**Growth Audit help explains the signal.** The information control now defines
the dot, line and trend states. Noun Project creator credits moved to Settings
beneath the app version, keeping attribution available without interrupting the
chart explanation.

## v3.3.211 (2026-08-12) â€” Three signals, no subtitles

**Growth Audit now has exactly three visible outcomes.** Empty means no
completed set in the last seven days, Flat means the exercise was trained but
has no confirmed comparable improvement yet, and Going Up means its
exercise-local comparable best moved. Empty is a quiet gray dot, Flat is a
small foreground line, and Going Up uses a ShowUp-blue trend arrow.

**Status glyphs are replaced by deliberate visual marks.** Empty is a native
CSS dot. Flat uses â€œMinusâ€ by ARIPATUT DASUKI and Going Up uses â€œTrendâ€ by
Travis Avery from Noun Project, with creator attribution in the information
control and asset manifest. The image-backed marks render as colourable masks.

**Exercise subtitles are gone.** Each receipt now contains only the exercise
name and its visual status. The comparable-best calculation stays intact
underneath the reduced interface.

## v3.3.210 (2026-08-12) â€” Growth Audit, reduced to the signal

**Six visible body groups.** Chest, Back, Shoulders, Arms, Legs, and Core are
the complete top-level vocabulary. Glutes remains an internal anatomical
classification, so Hip Thrust keeps its correct attribution, but rolls into
Legs in the interface. Body groups and their exercise receipts are ordered by
most recent training first.

**Status pills and explanatory prose are gone.** Compact symbols carry the
state while accessible labels preserve the meaning: â†— comparable progress,
â†» review, â€¦ learning, â†“ below the user's pattern, and â—‹ no recent work. The
per-exercise evidence remains visible, because the symbol alone cannot explain
why it appeared. The Recent Pattern and What the Record Says blocks are removed.

## v3.3.209 (2026-08-12) â€” Growth Audit learns before it judges

**Rep Zones is gone.** Its scatterplot described weight and repetitions but
could not answer the question it implied: whether a set contributed to muscle
growth. In particular, the old 6â€“12 â€œgrowthâ€ and 13+ â€œenduranceâ€ labels turned
rep count into a biological verdict the record cannot support.

**Growth Audit uses only observable comparisons.** Coverage is the last seven
days against the person's own four preceding seven-day blocks. Exercise
progress is compared only inside the same canonical exercise: a new set must
match or exceed an earlier set on both load and reps and improve at least one.
Four recent exposures without a comparable best says **Review**, never
â€œwasted.â€ No effort estimate, RIR question, universal set target, or mixed-lift
tonnage enters the result.

**Cold start is a real state.** The first two strength workouts say **Building
baseline** and show only what was logged. Three recent sessions establish an
exercise baseline; old history outside six weeks cannot manufacture current
confidence. The card then speaks in five restrained states: New, Learning,
Baseline ready, Progressing, and Review.

## v3.3.208 (2026-08-11) â€” Session Build

**Part Mix is now Session Build: one visible block per completed strength
set, stacked by body part.** Mixed-equipment tonnage was arithmetically
consistent but not conceptually comparable â€” a Smith number, dumbbell pair,
barbell total, and machine stack do not describe the same load. Runs remain
separate, and folded sheet-era rows count exactly like current one-set rows.

The live-growing skyline stays. The newest column rises as sets are completed
and uses live red during an active workout, while the old percentage verdict
is gone: more sets are a session receipt, not automatically better
performance. Exercise-specific screens remain the place for load and rep
progression.

## v3.3.167 (2026-08-08) â€” The receipt is the session card

**The share image now IS the History day card, redrawn at share size** â€”
the anatomy the maker circled: date and parts on the left, volume Â· km on
the right, then per exercise a solid rule, name over a dashed rule with its
set count, and the weight beside rounded rep chips in accent-on-tint. The
generic big-number frame is gone from this card; the thing being shared is
the thing on screen.

**Nicely proportioned means content-sized:** 1080 wide, height computed
from the day â€” a two-lift day shares as a short card, a six-lift day as a
tall one, capped at 1350 (the 4:5 the feeds expect). Same-exercise
different-weight sets group separately, exactly as History renders them.
SHOWUP sits quietly at the foot with the day's set count.

One build note: the drawn output was verified by DUMPING the actual
fillText stream ("Fri, Aug 7 | Legs | Squat | 3 sets | 60 | kg | 10 10 8")
before trusting any regex over it â€” template literals eat backslash-b, and
that class of assertion has lied before.

## v3.3.166 (2026-08-08) â€” Share a day

**Every non-empty day in History carries a Share button beside Edit.** It
opens the existing share overlay loaded with that day as a receipt in the
share-card language: date big, volume and distance beside it, SHOWUP Â·
SESSION kicker, then one block per exercise â€” name muted, weight Ã— reps in
chalk â€” with the run's distance and time up top. Fourteen exercises fit
before the card politely stops.

Nothing new was invented to do it: drawDayCard() feeds the same showCard()
overlay whose Share button already speaks navigator.share with a download
fallback. The one catch: showCard wants a canvas MAKER, not a painter â€” the
first wiring handed it the wrong shape and the behavioural test caught the
overlay opening empty.

Today's card reads from the live day; sealed days read from the derived
record â€” the same boundary as everywhere else.

## v3.3.165 (2026-08-08) â€” Exercises with two homes

**Deadlift on leg day is exactly as correct as Deadlift on back day** â€” the
catalog default is convention, not law. Nine dual-home exercises now carry a
quiet row at the bottom of their view â€” "Counts as BACK Â· move to Legs" â€”
and the move is gated by a native confirm that states the contract plainly:
from now on it lists and logs under the new part; everything already logged
stays exactly as trained.

The nine: Deadlift and Rack Pull (Backâ†”Legs), Romanian Deadlift
(Legsâ†”Back), Dip and Close Grip Bench Press and Bench Dip (Chestâ†”Triceps),
Barbell Shrug (Backâ†”Shoulder), Dumbbell Pullover (Chestâ†”Back), Chin Up
(Backâ†”Biceps).

**Forward-only by construction:** logged rows already carry the part they
were trained under, so history needs no migration and gets none â€” the
override only redirects listings and future logging. Moving an exercise
back to its catalog home deletes the override entirely: settings carry
differences, not restatements. The maker keeps Deadlift on Back, where he
actually trains it; the option exists for the users who don't.

One catch during build: the move button first carried data-ex, which the
exercise-open router upstream hijacks â€” the tap reopened the lift instead
of moving it. The behavioural test caught it before any phone did.

## v3.3.164 (2026-08-08) â€” Scrub the live bars

**Drag across the Today Â· live chart and the line above it reads
DATE Â· VOLUME** for whichever bar sits under your finger â€” the bar
highlights in accent, the readout persists on release so the answer stays
readable, and the "now" bar answers as today. The readout sits ABOVE the
chart, the v3.3.109 lesson: below it, it hides under the hand doing the
scrubbing.

Two guards make the motion safe: the card joined the tab-swipe blocklist
(a horizontal scrub is not a request to change screens â€” the class of bug
v3.3.140 closed for modals), and the SVG carries touch-action:pan-y so
vertical page scrolling through the chart still works.

## v3.3.163 (2026-08-07) â€” The runner's month, in the app's own voice

**"Freaking too boring" â€” correct.** Six identical bordered tiles was a
spreadsheet wearing a card. The answer was the app's existing grammar, not
decoration: ONE hero number (17.66 km, with the â‰ˆprojection inline in
accent), a fill bar showing how far into that projection the month has
come, and one quiet mono line carrying pace, time on feet, longest, count
and average. Same data, one third the chrome, a hierarchy instead of a
grid. Deletion, as usual, was the design.

## v3.3.162 (2026-08-07) â€” The runner's month

**THIS MONTH moved up** to sit directly under Weight, above the RUN tiles â€”
where the maker circled. It also lost its km readout: one number, one home.

**The pace chart's labels grew** from 6.5 to 9.5 viewBox units (~12px on
screen) â€” they were sized for the maker's eyes at his desk, not a phone at
arm's length.

**RUNNING Â· <month>** is new, beneath Pace: distance so far, a
calendar-rate projection (km per elapsed day Ã— days in month â€” dull and
honest, no hot-streak optimism), average pace, time on feet, longest run,
and run count with average length. The metrics a Strava runner expects,
in the app's own grammar, from data already in hand.

## v3.3.161 (2026-08-07) â€” THIS MONTH moves to Stats, and the keypad can type the pace

**The card moved off the logging path.** A monthly goal is a statistic
about the month, not a mid-run control â€” it sits near the top of Stats now,
and the Run view slims back down. The goal handlers render the CURRENT view
instead of assuming the Lift one, which the move itself exposed.

**The pace field demanded a character its own keyboard could not type.**
inputmode=numeric summons a keypad with no apostrophe â€” so bare digits now
parse: 730 is 7'30, 1015 is 10'15. Separators still work if pasted. Found
by the maker one screenshot after shipping; the field was tested by
JavaScript, which types characters keyboards do not offer.

## v3.3.160 (2026-08-07) â€” Log a past day

**The record is a record of training, not of logging discipline.** An empty
day within the last 7 becomes a dashed, tappable door in History's calendar;
tap it and a quiet form opens for that date â€” part, exercise (catalog
datalist), weight, comma'd reps for multiple sets, or distance and time for
a run. The write stamps upd so a backfilled day wins the cloud merge, and
the streak repairs the moment deriveAll ingests it â€” position (1), chosen
deliberately: punishing a midnight lapse would contradict an app that
records attendance.

Older than 7 days stays sealed, and the Train view never grows a date
picker: today stays the default reality, and backfilling is a deliberate
walk to where past days live. Available, minimal.

## v3.3.159 (2026-08-07) â€” Target pace

**What the first runner user actually meant.** THIS MONTH's setter gains a
target pace (7'30-style input; 7:30 and 7.30 parse too), stored as seconds
per km. The 10k line now projects the TARGET when one is set â€” with your
recent median beside it, because the gap between the two is the honest
number. No target set â†’ the recent-pace projection stands as before.

**Edit prefills instead of wiping.** The goal editor reopens with your
numbers in the fields â€” v3.3.158's clear-and-retype was crude and lasted
one day.

## v3.3.158 (2026-08-07) â€” Midnight holds, and a month has a goal

**The stranger user could not log after midnight.** A rollover guard
existed â€” visibilitychange plus a 60-second interval â€” but iOS resumes a
PWA without reliably firing visibilitychange, and intervals sleep with the
app, so todayISO stayed on yesterday exactly when he tried to log. The real
guard now runs INSIDE the tap handler, at the moment staleness can hurt: a
tap on a stale day rolls the date, re-derives (yesterday just sealed â€”
stats ingest it, the rest timer re-anchors), re-renders, and the next tap
lands in the real today. pageshow and focus joined t÷Î9âÚ$z{-®éÜj×GWÆ–6FRvV–v‡G2÷&W2FVGWR6òF†R7G&—7F—2F–v‡BàĞ¢ÒF†R)9‚'V&&ÆRæ÷r–æ6ÇVFW2Æ–â×FW‡B&VF÷WBöbF†Rv†öÆRÆ7B6W76–öàĞ¢‚$Æ7B6W76–öâ(	BGVRrós¢S9s#2+rc9sB+rc9sB(
b"’&÷fRF†R6†÷'F7WB6†—2àĞ¢Ò&–vvW"(‰"ò²7FWW'2ƒsg‚v–FRÂWg&öÒSb’(	BæBV6‚FfÆ6†W2F†RvV–v‡@Ğ¢&VBv—F‚F–ç’66ÆR÷âÆ—GFÆRG&VæÆ–æRÂ6öçF–æVBFò3×2àĞ¢ÒF–ærF†RvV–v‡B†÷"ç’çVÖW&–2f–VÆC¢&W2ÂF—7Fæ6RÂÖ–âÂ6V2Â&"’6VÆV7G0Ğ¢F†Rv†öÆRçVÖ&W"(	BG—R7G&–v‡B÷fW"—BÂæòÖçVÂFVÆWF–æràĞ¢Ò$6ÆV"FöF’w2â"ò$Ö÷fRFòæ÷F†W"Æ–gB(i""æ÷r6†&RöæR&÷rÂöæRÆ–æRV6‚àĞ¢Ò.)É26ö×ÆWFR(
b"'WGFöç2&Ræ÷r6öÆ–B66VçB&ÇVR(	BVæÖ—76&ÆRàĞ¢Ò7F–6·’†VFW"d•„TC¢—Bv2FV6Æ&VB7F–6·’ÆÂÆöærÂ'WB&öG—¶÷fW&fÆ÷r×ƒ¦†–FFVçĞĞ¢6–ÆVçFÇ’F—6&ÆW27F–6·’öâ”õ2â7v—F6†VBFò÷fW&fÆ÷r×ƒ¦6Æ—Âv†–6‚6Æ—2v—F†÷W@Ğ¢7&VF–ær67&öÆÂ6öçF–æW"â†VFW"†æBF†R&W7B6÷VçB×W’æ÷r7F—2WBv†–ÆPĞ¢–÷R67&öÆÂàĞ¢ÒgFW"$6ö×ÆWFRv÷&¶÷WB"ÂF†R$6öçF–çVRÇ'Câ(i""6†—2F—6V"g&öÒFöF’àĞ¢F†RW†W&6—6R&÷w27F’F&ÆR(	BÆövv–ær6WB&W7VÖW2WfW'—F†–ærÂW"c"ã’àĞ Ğ¢22c"ã’ã(	B„õDd•ƒ¢F†RFFÖÆ÷72'VpĞ¥v†B†VæVC¢FVÆWF–ær÷&RÖFF–ærF†R†öÖR×67&VVâ†RærâFò&Vg&W6‚F†R–6öâĞ§v—W2”õ2Æö6Å7F÷&vRâF†B6†÷VÆB&Rf–æR(	BF†R6Æ÷VB†2WfW'—F†–ær(	B'WBGvğĞ¦'Vw26ö×÷VæFVC Ğ£â4”ÄTåB5”ä2DTD‚âv†VâF†R7W&6RFö¶Vâ&Vg&W6‚f–ÆVBÂF†R6–væV@Ğ¢—G6VÆb÷WBV–WFÇ’âWfW'’W6‚gFW'v&G2v26–ÆVçBæòÖ÷Â6òF†R6Æ÷V@Ğ¢6÷’vVçB7FÆRv†–ÆRF†RÆöö¶VB7–æ6VBàĞ£"âU4‚Ô$Tdõ$RÕTÄÂ4Äô$$U"âW6‚&WÆ6W2F†Rv†öÆR6Æ÷VBFö7VÖVçBâöâg&W6€Ğ¢–ç7FÆÂÂç’6fRF†Bf—&VB&Vf÷&RF†R&ö÷B×F–ÖRVÆÂf–æ—6†VB†Æövv–ærĞ¢6WBÂ6WGF–æw2w&—FR’W6†VBF†RæV"ÖV×G’Æö6Â7FFRõdU"F†R6Æ÷VB6÷Ğ¢F†B7F–ÆÂ†VÆB†—7F÷'’àĞ Ğ¤f—†W3 Ğ¢ÒVÆÂÖ&Vf÷&R×W6‚vFS¢FWf–6RF†B†6âwB7V66W76gVÆÇ’ÖW&vR×VÆÆVBF†—2&ö÷@Ğ¢‡—6–6ÆÇ’6ææ÷BW6‚âf—'7BW6‚gFW"g&W6‚–ç7FÆÂ—2wV&çFVVBFò&RĞ¢7WW'6WBöbF†R6Æ÷VBâfW&–f–VBv–ç7BF†RW†7B&V–ç7FÆÂ66Væ&–òàĞ¢Ò7–æ2f–ÇW&W2&RÆ÷VBæ÷s¢W‡—&VB6–vâÖ–â6†÷w2Fö7B²&VBF÷BöâF†PĞ¢vV"'WGFöã²6WGF–æw26†÷w2$æ÷B7–æ6–ær"&ææW"v†VæWfW"Æö6Âv÷&¶÷WG0Ğ¢W†—7Bv—F†÷WB6W76–öâàĞ¢Ò&öÆÆ–ærÆö6Â&6·W¢öæR6æ6†÷BW"F’†Æ7BR¶WB’VæFW"6W&FPĞ¢Æö6Å7F÷&vR¶W—2Â2&VÇBv–ç7Bç’gWGW&RÖÆWfVÂ6Æö&&W"àĞ Ğ¥&V6÷fW'’æ÷FW2f÷"FFÆ÷7B&Vf÷&RF†—2f—ƒ¢6VRF†R6†BàĞ Ğ¢22c"ã’(	B6W76–öâfÆ÷s¢v÷&¶÷WG2æ÷r†fR&Vv–ææ–æræBâVæ@Ğ¥F†R÷&væ—¦–ær–FV…7Væv¦VRw2“¢6W76–öâ—26öçF–çV÷W2fÆ÷röb6WG2v—F‚Ğ¦6ÆV"7F'BæBf–æ—6‚ÂBF‡&VRÆWfVÇ2(	BW†W&6—6RÂ&öG’'BÂv†öÆRv÷&¶÷WBàĞ Ğ¢Ò¢¤6ö×ÆWFR'WGFöç2BWfW'’ÆWfVÂâ¢¢.)É26ö×ÆWFRÆW†W&6—6Sâ"BF†R&÷GFöÒöbF†PĞ¢W†W&6—6RvS².)É26ö×ÆWFRÇ'Câ"VæFW"F†R'Bw2ÆövvVBÆ—7C².)É26ö×ÆWFPĞ¢v÷&¶÷WB"öâF†RFöF’F"â6ö×ÆWF–ærF†RÆ7B÷VâW†W&6—6R–â'BV–WFÇĞ¢6ö×ÆWFW2F†R'BâÆövv–æræWr6WBFòç—F†–ær6ö×ÆWFVB&V÷Vç2—B(	BæB—G0Ğ¢&VçG2(	B&V6W6R–÷R6â'6öÇWFVÇ’G&–â6†W7BGv–6R–âF’àĞ¢Ò¢¤Æ—fRÖöFRâ¢¢v†–ÆRF†Rv÷&¶÷WB—2÷Vâ†f—'7B6WB(i"6ö×ÆWFRv÷&¶÷WB’F†PĞ¢†VFW"'W&ç2&VB(	BF†RöæRÆ6R&VBæ÷rÖVç2&†V'BV×–ær"&F†W"F†àĞ¢'&V6÷&B"â6ö×ÆWF–ærF†Rv÷&¶÷WB6ööÇ2—B&6²F÷vââÆ—fRÖöFR&VÆöæw2FòF†PĞ¢v÷&¶÷WBÂæ÷BF†RW†W&6—6S¢–÷Rw&R7F–ÆÂG&–æ–ær&WGvVVâW†W&6—6W2àĞ¢Ò¢¥&W7B6÷VçB×Wâ¢¢F–6¶–ærÓ§726Æö6²6—G2–âF†RÆ—fR†VFW"Â&W7F'F–ær@Ğ¢WfW'’ÆövvVB6WBâ—Bw2vÆæ6R×fÇVRöæÇ’(	Bæ÷F†–ær—2ÆövvVB(	BæB—B7W'f—fW0Ğ¢â&VÆöBÖ–BÖw–ÒàĞ¢Ò¢¥7VvvW7FVB6WG2&R6†÷'F7WB¶W—2æ÷râ¢¢FöæRFòÆörF†B|9w"(	B2ÖçĞ¢F–ÖW22–÷RÆ–¶S²6†—2æWfW"F—6V"öâW6RâV6‚†2)ÉRFòF—6Ö—72—Bf÷ Ğ¢FöF’‡W'6—7FVB’âÖ‚b6†÷rBöæ6S²F—6Ö—76–æröæR6Æ–FW2F†RæW‡B–ââöæ6PĞ¢–÷RwfR7F'FVBÆövv–ærÂF†R¦öæR6‡&–æ·2FòöæRÖÆ–æR†÷&—¦öçFÂ7G&—6ò—@Ğ¢7F÷2VF–ær67&VVââ$ÆörÆÂ"Æöw2W†7FÇ’F†Rf—6–&ÆR6†—2àĞ¢Ò¢¤vòÕFòFVGWâ¢¢âW†W&6—6R–÷Rw&R7W'&VçFÇ’v÷&¶–ærÆ—fW2ôäÅ’–âF†PĞ¢,+rFöF’"Æ—7C²—BÆVfW2vòÕFòõ6öÖWF–ÖW2VçF–Â–÷R6ö×ÆWFR—BÂF†Vâ&WGW&ç0Ğ¢FvvVB.)É2FöæRFöF’"àĞ Ğ¢22c"ã‚(	BfVVF&6²&F6‚¢æ–æRf—†W0Ğ¢Òd•‚F÷V&ÆR×F¦ööÓ¢F–ær²ş(‰"V–6¶Ç’æòÆöævW"¦öö×2F†RvPĞ¢‡F÷V6‚Ö7F–öã¢Öæ—VÆF–öâ’â6†'B–æ6‚×¦ööÒ—2VæffV7FVBàĞ¢Òd•‚GWÆ–6FR$6'&–VB÷fW"g&öŞ(
b"FW‡C¢F†R7FF–2æ÷FRVæFW"F†R7VvvW7FV@Ğ¢6W76–öâ†VFW"—2vöæS²F†R)9‚'V&&ÆR—2æ÷rF†RöæÇ’Æ6R—BÆ—fW2àĞ¢Ò4”ÕÄU"†VFW#¢F†R.)É26†÷vVBW+r"&Vf—‚—2G&÷VB‡F†RÖ&²6—2—B’Âæ@Ğ¢F†R¶röÆ"æBÆ–v‡BöF&²'WGFöç2Ö÷fVB–çFò6WGF–æw2VæFW"æWrF—7Æ’6&B(	@Ğ¢F†W’w&R6WBÖæBÖf÷&vWBÂæ÷BWfW'’×6W76–öâ6öçG&öÇ2â†VFW"—2æ÷s¢Ö&²ÂFFRÀĞ¢öæR7FGW2Æ–æRÂ7G&V²ÂvV"àĞ¢ÒÔõdTB$†Vf–W7Bò&W7B6WB"Æ–æW2g&öÒF†RF÷öbF†RW†W&6—6RvRFòF†RfW'Ğ¢&÷GFöÒÂVæFW"WfW'—F†–ærâF†V—""(‰#F—2vò’"öFF—G’—2f—†VBFöó¢æ÷r&VG0Ğ¢'FöF’"ò'–W7FW&F’"ò$âF—2vò"â&÷GFöÒöbWfW'’vRÇ6òv–æVB&VÀĞ¢FF–ærv–ç7BF†R†öÖR–æF–6F÷"àĞ¢Ò”ådU%DTB%6R'’ÖöçF‚#¢f7FW"ÖöçF‡2æ÷r6—BÆ÷vW"Â2&WVW7FVBàĞ¢Ò$ôE•tT”t…BÖ÷fW2„F—WF2â“¢F–ÆW2æB6†÷'F7WB6†—2æ÷r&VB$%r9r""–ç7FV@Ğ¢öb#¶r9r""ÂæBF†RÆövvW"7F'G2B&öG—vV–v‡B–ç7FVBöbf¶R#¶ràĞ¢FF–ærÆFW27F–ÆÂv÷&·2(	BG—RvV–v‡BæB—B&VG2&&öG—vV–v‡B²â"àĞ¢ÒDTdTÅBtT”t…B—2æ÷r6fVBW"W†W&6—6S¢WfW'’6†ævR‡7FWW"ÂG—–ærÂ÷ Ğ¢F–ær6†÷'F7WB6WB’W'6—7G2Â6òF†RW†W&6—6R÷Vç2BW†7FÇ’F†RvV–v‡@Ğ¢–÷RÆ7BW6VBÂf÷&WfW"ÂVçF–Â–÷R6†ævR—Bv–âàĞ¢ÒÄDRÄ”äR6–×Æ–f–VC¢"ƒ9s#R²9s"ãR’"FÆÇ’&VÖ÷fVB(	B—Bw2æ÷r§W7@Ğ¢##¶r&"²¶rW"6–FR"àĞ¢Ò$õUBF†R#C¶r(i"ã‚W"6–FR"&W÷'C¢F†RÖF‚v2&–v‡B(	BƒC(‰##’ó"Ò Ğ¢W†7FÇ’(	Bv†–6‚ÖVç2F†R7F÷&VBvV–v‡Bv27GVÆÇ’CãbÂÆÖ÷7B6W'F–æÇĞ¢G&–gBg&öÒâÆ"ÖW&fÇVR6VVF–ærF†RFVfVÇBâGvòöbF†Rf—†W2&÷fR¶–ÆÀĞ¢F†—26Æ72öb'Vs¢–æfW'&VBFVfVÇG2æ÷r6æFò6ÆVâ7FWW"–æ7&VÖVçG2Âæ@Ğ¢–÷W"W‡Æ–6—BW"ÖW†W&6—6RFVfVÇG2&R6fVBfW&&F–ÒàĞ Ğ¤æW‡C¢c"ã’Ò6W76–öâfÆ÷r†6ö×ÆWFRW†W&6—6R÷'B÷v÷&¶÷WBÂÆ—fRv÷&¶÷WBÖöFRÀĞ§&W7B6÷VçB×WÂ7VvvW7FVBÖ2×6†÷'F7WG2v—F‚)ÉRÂvòÕFòFVGW’âc"ãÒGWÆ–6FRöVF—@Ğ¦ÆövvVB6WG2²FöF’×g2Ö†—7F÷'’f—7VÂâc"ãÒW"ÖW†W&6—6R&öw&W76–öâàĞ Ğ¢22c"ãrãB(	BÆövòvöW2Ööæö6‡&öÖPĞ¢ÒF†RÖ&²—2æ÷rW&R&Æ6²ÖæB×v†—FS¢&÷F‚F†R6†gBæBF†R'&÷v†VB&R6†Æ²àĞ¢F†R66VçB&ÇVR—2÷WBöbF†RÆövòVçF—&VÇ’†—Bv2–âF†Rc"ãrã27WB’àĞ¢ÒÆÂ–6öç2&RÖ7WBg&öÒF†RÖöæò6÷W&6S¢–6öâÓ“"Â–6öâÓS"ÂÆR×F÷V6‚Ö–6öâƒƒ’ÀĞ¢Ö6¶&ÆRÓS"àĞ¢Ò†VFW"Ö&²6–×Æ–f–VBFò6–ævÆR7W'&VçD6öÆ÷"(	B—B7F–ÆÂfÆ—2v†—FRöâF†PĞ¢Æ—fRÖ&ÇVR†VFW"Â'WBF†R7V6–ÂÖ66R'VÆRf÷"F†R66VçB'&÷v†VB—2vöæRàĞ Ğ¢22c"ãrã2(	BæWrÆövğĞ¢ÒäUrÖ&³¢vVöÖWG&–2WÖ'&÷râ'V–ÇBöâS"w&–B(	BSG‚7G&ö¶RÂ&÷VæB62ÀĞ¢'&÷v†VBÆVw2BW†7FÇ’C\+Â6†gBöâF†RfW'F–6Â†—2â6†gB–â6†Æ²Â†VB–àĞ¢F†R66VçB&ÇVRÂ6òF†RÖ&²W6W2F†Rw2÷vâÆWGFR&F†W"F†â&V–ærfÆ@Ğ¢Ööæö6‡&öÖRàĞ¢Ò&WÆ6W2F†RvVæW&–2&"Öw&‚Æ6V†öÆFW"WfW'—v†W&S¢–6öâÓ“"Â–6öâÓS"ÀĞ¢ÆR×F÷V6‚Ö–6öâƒƒ’ÂÇW2æWrÖ6¶&ÆRS"†vÇ—‚66ÆVBFòs"R6fR¦öæPĞ¢6òæG&ö–Bw26—&6ÆR7&÷6âwB6Æ—F†R'&÷v†VB’àĞ¢ÒF†RÖ&²æ÷rÇ6ò6—G2–âF†R†VFW"ÂÆVgBöbF†RFFRâ—B–æ†W&—G2F†RF†VÖPĞ¢†6†Æ²–âF&²Â–æ²–âÆ–v‡B’æBfÆ—2gVÆÇ’v†—FRv†VâF†R†VFW"vöW2Æ—fRÖ&ÇVPĞ¢Ö–B×6W76–öâÂ6òF†R66VçBÖ6öÆ÷&VB†VB6âwBF—6V"–çFòF†R66VçB&6¶w&÷VæBàĞ¢Ò6W'f–6Rv÷&¶W"&RÖ66†W2F†R–6öç3²ff–6öâFFVBàĞ Ğ¢22c"ãrã"(	BVÆÂFò&Vg&W6€Ğ¢ÒäUs¢†öÆBF†RvRF÷vâg&öÒF†RfW'’F÷æBÆWBvò(	B6—&7VÆ"–æF–6F÷ Ğ¢föÆÆ÷w2F†RVÆÂÂF†R'&÷rfÆ—2&ÇVRBF†RG&–vvW"ö–çBƒs'‚’ÂæBöàĞ¢&VÆV6RF†Rv†öÆR&Vg&W6†W2àĞ¢ÒöæRvW7GW&RFöW2F‡&VRF†–æw2–â÷&FW#¢fÇW6†W2ç’VæF–ær6fR‡6òæ÷F†–æpĞ¢—2Æ÷7B’Â6·2F†R6W'f–6Rv÷&¶W"Fò6†V6²f÷"æWvW"fW'6–öâÂF†VàĞ¢&VÆöG2(	BæBF†R&ö÷B6WVVæ6R6Æ÷VB×VÆÇ2v†Vâ6–væVB–ââ6ò—BÖVç2&÷F€Ğ¢&g&W6†W7BFF"æB&g&W6†W7B"àĞ¢ÒVÆÇ2F†B7F'B–ç6–FR¦ööÖ&ÆR6†'B&R–væ÷&VBÂ6òF†RvW7GW&RæWfW Ğ¢f–v‡G2–æ6‚×¦ööÒâVÆÇ2öæÇ’&Vv–âv†VâF†RvR—267&öÆÆVBFòF†RfW'’F÷°Ğ¢æ÷&ÖÂ67&öÆÆ–ær—2VçF÷V6†VBâF†RæF—fR'V&&W"Ö&æB&÷Væ6R—2F—6&ÆV@Ğ¢†÷fW'67&öÆÂÖ&V†f–÷"’6òF†RGvòVffV7G2FöâwB7F6²àĞ Ğ¢22c"ãrã(	B7FæFÆöæRÖÖöFRf—†W0Ğ¢Òd•ƒ¢†VFW"æòÆöævW"†–FW2VæFW"F†R•†öæR7FGW2&"òG–æÖ–2—6ÆæBv†VâF†PĞ¢—2–ç7FÆÆVBFòF†R†öÖR67&VVââF†RvR÷G2–çFòVFvR×FòÖVFvR&VæFW&–æpĞ¢‡f–Ww÷'BÖf—CÖ6÷fW"’æBF†R&÷GFöÒæbÇ&VG’FFVBf÷"F†R†öÖR–æF–6F÷"ÀĞ¢'WBF†R†VFW"æWfW"v÷BF†RÖF6†–ærF÷–ç6WBâ–â6f&’F†R'&÷w6W"6‡&öÖPĞ¢Ö6¶VB—C²7FæFÆöæRW‡÷6VB—Bâ†VFW"æ÷rG2'’Vçb‡6fRÖ&VÖ–ç6WB×F÷’àĞ¢Òd•ƒ¢F†VÖR†æBç’6WGF–ær÷"6WB’6÷VÆB&RÆ÷7B–bF†Rv26Æ÷6VBv—F†–àĞ¢ã3S×2öbF†R6†ævRâ6fW2&RFV&÷Væ6VBÂæB”õ2¶–ÆÇ2†öÖR×67&VVâF†PĞ¢–ç7FçB—Bw27v—VBv’(	BF†RVæF–ærw&—FR6–×Ç’F–VBâF†—2—2v‡’F&²öÆ–v‡@Ğ¢6VVÖVBæ÷BFò7F–6²âæ÷rvV†–FR÷f—6–&–Æ—G–6†ævRfÇW6‚w&—FW27–æ6‡&öæ÷W6ÇĞ¢FòÆö6Å7F÷&vRF†RÖöÖVçBF†R—2&6¶w&÷VæFVBàĞ¢Òd•ƒ¢æòÖ÷&Rw&öær×F†VÖRfÆ6‚BÆVæ6‚âöæRÖÆ–æR&R×–çB67&—BÆ–W2F†PĞ¢6fVBF†VÖRg&öÒF–ç’Ö—'&÷"¶W’&Vf÷&Rç’552&VæFW'2Â–ç7FVBöbv—F–ærf÷ Ğ¢F†R7–æ2FFÆöBàĞ Ğ¢22c"ãr(	BÖ÷F–öâ70Ğ¤ÖöFW&âÖ÷F–öâ&V†f–÷'2‡F†R6†F6âôæ–ÖFRÕT’ÆæwVvR’Â–×ÆVÖVçFVBæF—fVÇ’(	@Ğ§¦W&òFWVæFVæ6–W2Â7F–ÆÂöæRf–ÆRâwV–F–ær'VÆS¢–b&VÖ÷f–ærâæ–ÖF–öâÖ¶W2F†PĞ¥T’†&FW"FòVæFW'7FæBÂ—BV&ç2—G2Æ6S²÷F†W'v—6R—Bw2FV6÷&F–öâæB—Bw2÷WBàĞ¤WfW'—F†–ær&VÆ÷rfæ—6†W2VæFW"”õ2%&VGV6RÖ÷F–öâ"ÂæBF†Rv†öÆR72—2w&V@Ğ§6òÖ÷F–öâf–ÇW&R6âæWfW"'&V²&VæFW&–æràĞ Ğ¢Ò¢¥F"G&ç6—F–öç2¢¢(	B7v—F6†–ærF'27&÷72ÖfFW2v—F‚7‚G&–gBf–F†Rf–WpĞ¢G&ç6—F–öç2’†”õ2‚²6f&“²öÆFW"'&÷w6W'2§W7BvWBF†R–ç7FçB7v’àĞ¢–â×f–Wr&R×&VæFW'2†Æövv–ær6WBÂFövvÆ–ær6WGF–ær’–çFVçF–öæÆÇ’Fòäõ@Ğ¢G&ç6—F–öâÂ6òÖ–B×v÷&¶÷WBÆövv–æræWfW"fÆ6†W2àĞ¢Ò¢¥FfVVF&6²¢¢(	B'WGFöç2Â'B6&G2ÂW†W&6—6R&÷w2æB6WBF–ÆW2&W72–àĞ¢ãBãRRv—F‚3×27&–ærâ6öæf—&×2F†RF÷V6ƒ²&–vvW7Bv–âf÷"–âÖw–ÒW6RàĞ¢Ò¢¥6WB×6fRÖöÖVçB¢¢(	BF†R6WB–÷R§W7BÆövvVB7&–æw2–çFò—G2F–ÆS²–b—BF–W0Ğ¢÷"&VG2–÷W"&W7BvV–v‡BÂöæR&VBVÇ6R&F–FW2÷WBâ&VB7F–ÆÂÒ&V6÷&G2öæÇ’àĞ¢Ò¢¤µ’6÷VçB×W2¢¢(	BÆ–âçVÖ&W'2ƒÃCs‚¶ÒÂ7G&V·2Â6W76–öâ6÷VçG2’F–6²W Ğ¢÷fW"CS×2v—F‚V6RÖ÷WBâ6W2æBFFW2FöâwBÖ÷fRàĞ¢Ò¢¥7FvvW&VBVçG&æ6R¢¢(	B6&G2æB†VFW'2&—6R‡‚v—F‚C×27FvvW"Â6V@Ğ¢B’7FW26òÆöærvW2æWfW"fVVÂ6Æ÷ràĞ¢Ò¢¤6†'BG&rÖ–â¢¢(	BWfW'’Æ–æR6†'B7vVW2ÆVgB×Fò×&–v‡B†6öç6—7FVæ7’Â–õ’'VâÀĞ¢6R“²6–ævÆR×6W&–W2&'2w&÷rg&öÒF†V—"&6VÆ–æR‡vVV¶Ç’'VâÂÖöçF†Ç’G&–æ–ærÀĞ¢vVV¶F’’â7F6¶VB6ö×÷6—F–öâ6VvÖVçG2–çFVçF–öæÆÇ’W†6ÇVFVB(	Bw&÷v–ærF†VĞĞ¢–æFWVæFVçFÇ’v÷VÆBFV"F†R7F6²'BÖ–BÖæ–ÖF–öâàĞ Ğ¢22c"ãb(	B6Æ÷VB7&VFVçF–Ç2&¶VB–àĞ¢ÒF†R7W&6R&ö¦V7BU$ÂæBæöâ¶W’&Ræ÷rVÖ&VFFVB–â–æFW‚æ‡FÖÂÂ6òg&W6€Ğ¢FWf–6R†æWr†öæRÂ6ÆV&VB6f&’Â–æ6övæ—Fò’æWfW"6·2f÷"F†VÒ(	B6WGF–æw2vöW0Ğ¢7G&–v‡BFò$6öçF–çVRv—F‚vöövÆR"âF†—2v2F†R6†–6¶VâÖæBÖVvröâF†R•†öæS Ğ¢F†R7&VFVçF–Ç2Æ—fVB–âV6‚FWf–6Rw2Æö6Å7F÷&vRÂ'WBæWrFWf–6RæVVFVBF†VĞĞ¢$Tdõ$R—B6÷VÆB6–vâ–âæB7–æ2àĞ¢ÒF†RU$Âv2VÖ&VFFVB2F†R&&R÷&–v–â‡F†R7FVB÷&W7B÷cf&–çB—2G&–ÖÖVB’àĞ¢Ò6fRFòVÖ&VC¢F†Ræöâ¶W’—2V&Æ–2'’FW6–vâ(	BWfW'’'&÷w6W"W6–ærF†R6VæG0Ğ¢—Bç—v’ÂæB&÷rÖÆWfVÂ6V7W&—G’—2v†B7GVÆÇ’&÷FV7G2F†RFFàĞ¢Ò–bfÇVW2&RWfW"6fVBÖçVÆÇ’–â6WGF–æw2ÂF†÷6R7F–ÆÂ÷fW'&–FRF†R&¶VBÖ–àĞ¢öæW2‡W6VgVÂ–bF†RFF&6RWfW"Ö÷fW2’àĞ Ğ¢22c"ãR(	B'VâföÆG2–çFò7FG0Ğ¢ÒF†R'VâF"—2vöæRgFW"öæRfW'6–öã²æb—2&6²FòBF'2âF†Rv†öÆR'Vâ7F÷'Ğ¢æ÷rÆ—fW2–ç6–FR7FG2Â&WGvVVâ$WfW'’ÖöçF‚Â'’'B"æB&V6÷&G2àĞ¢Ò7FG2v÷B§V×&"BF†RF÷(	BF—2+r'G2+r'Vâ+r&V6÷&G2(	BöæRF67&öÆÇ0Ğ¢FòF†R6V7F–öâÂ6òF†RÆöævW"vR7F—2æf–v&ÆRàĞ¢ÒÖ–ÆW7FöæRçVÖ&W"—2V–WBæ÷r†6†Æ²Âæ÷B&VB’ÂæBF†R&öw&W72&"—2&ÇVRàĞ¢&VB7F—2&W6W'fVBf÷"&V6÷&G2àĞ¢Ò$WfW'’vVV²"‚Ö†—3¢vVV²çVÖ&W'2ƒ#BÂ#RÂ#n(
b’–ç7FVBöbVç&VF&ÆRÖöçF‚öF’àĞ¢Ò%–V"÷fW"–V"#¢†—2w&–FÆ–æW2&RWfVæÇ’76VB&÷VæBçVÖ&W'2ƒ“óƒó#só3cĞ¢v—F‚F†RVæ—BöâF†RF÷Æ&VÃ²V6‚–V"w2Fr6—G2BF†RVæBöb—G2÷vâÆ–æPĞ¢‚s#2æBs#BWFòÖçVFvR'B6–æ6R3Rg232æV&Ç’F–R“²F†RÆ—fR##bÆ–æPĞ¢VæG2–âF†R6ÖRVÇ6F–ær&ÇVR&V6öâF†R6öç6—7FVæ7’6†'BW6W2àĞ¢Ò%6R'’ÖöçF‚#¢F†R7W'&VçBÖöçF‚—2VÇ6F–ær&ÇVRF÷Bv—F‚&ÇVRFW‡C°Ğ¢F†Rf7FW7BÖöçF‚¶VW2—G2&VBF÷BàĞ¢Ò&V6÷&G2FFW2G&÷VBFò6ÖÆÂ×WFVB6V6öæBÆ–æRVæFW"V6‚çVÖ&W"àĞ Ğ¢22c"ãB(	B'Vææ–ærvWG2—G2÷vâF Ğ¢ÒäUr¢¥'Vâ¢¢F"ƒWF‚–âF†Ræb’â'Vææ–ærv2æV"ÖF–Ç’'WBöæÇ’WfW"6†÷vVBW Ğ¢2öæR6ÖÆÂÖöçF†Ç’&"6†'B'W&–VB–â7FG3²—Bæ÷r†2†öÖRàĞ¢Ò¢¤æW‡BÖ–ÆW7FöæR¢¢6&C¢F—7Fæ6RFòF†RæW‡B†¶Ò÷"Ö’’Â&öw&W72&"Â†÷pĞ¢Öç’'Vç2F†B—2B–÷W"&V6VçBfW&vRÂæB&ö¦V7FVBFFRg&öÒ–÷W"Æ7BÓB×vVV°Ğ¢&FRâ7W'&VçFÇ“¢#"ãB¶ÒFòÃSàĞ¢Ò¢¤WfW'’vVV²¢£¢Æ7BbvVV·2öbF—7Fæ6RÂv—F‚F†Rb×vVV²fW&vRÆ–æRàĞ¢Ò¢¥–V"÷fW"–V"¢£¢7V×VÆF—fRF—7Fæ6R'’F’öb–V"Â##.(i###bÂ6ÖR6†R2F†PĞ¢6öç6—7FVæ7’6†'Bâƒ###¢#S"+r##3¢3R+r##C¢32+r##S¢3c+r##c¢#Cb6òf"âĞ¢Ò¢¥6R'’ÖöçF‚¢£¢Ö–çWFW2W"¶ÒöÖ’ÂÆ7B"ÖöçF‡2Âf7FW7BÖöçF‚–â&VBàĞ¢6ö×WFVBg&öÒF–ÖVB'Vç2ôäÅ’(	Bƒ#Böb–÷W"“'Vç2†fR6Æö6²öâF†VÒÂæBàĞ¢VçF–ÖVB'Vâæ÷rFG2F—7Fæ6Rv—F†÷WBöÆÇWF–ærF†R6RàĞ¢Ò¢¥&V6÷&G2¢£¢ÆöævW7B'VâÂf7FW7B6RÂ&–vvW7BvVV²Â&–vvW7BÖöçF‚àĞ¢Ò'Vâ7G&V²6÷VçG2&6²g&öÒFöF’†÷"–W7FW&F’Â–bFöF’§W7B†6âwB†VæVB–WB’ÀĞ¢ÖF6†–ær†÷rF†RÆ–gB7G&V²Ç&VG’&V†fW2àĞ¢Ò$TÔõdTBF†R$F—7Fæ6R'VâÂ'’ÖöçF‚"6&Bg&öÒ7FG2(	BF†R'VâF"7WW'6VFW2—BàĞ¢F†RVæFW&Ç––ærÖöçF†Ç’Ö¶ÒÖ7F—3²F†R6ö×÷6—F–öâ6†'B7F–ÆÂ÷fW&Æ—2—BàĞ¢ÒfW&–f–VC¢F†R'VâF"w2ÆÂ×F–ÖRF÷FÂ&V6öæ6–ÆW2W†7FÇ’FòF†R6VVBw2ÃCsrãb¶ÒÀĞ¢6òæ÷F†–ær—2F÷V&ÆRÖ6÷VçFVB&WGvVVâ6VVB†—7F÷'’æBÖÆövvVBF—2àĞ Ğ¢222æ÷FRöâF†RFFÖöFVÂ†6öæf—&ÖVBv–ç7BF†R6†VWBĞ¤'Vâ&÷r—2·'BÂW†W&6—6RÂF—7Fæ6RÂ&W5µÒÂÖ–çWFW2Â6V6öæG5Ö(	BF†RÖ–çWFW2æ@Ğ¥6V6öæG26öÇVÖç2öbF†RÆör6†VWBâF—7Fæ6R—27F÷&VB–â¶Ò‡–÷W"æÇ—6—2F"6ÆÇ2—@Ğ¢$´Ò&â"’æB6öçfW'FVBf÷"F—7Æ’v†VâF†R—2–â–×W&–ÂÖöFRàĞ Ğ¢ÒÒĞĞ¢¤FFW2&V6÷fW&VBg&öÒv—B6öÖÖ—B†—7F÷'’‡c2ã2ã2&6¶f–ÆÂ’âVçG&–W2v—F†÷W@Ğ¦FFR&VFFRF†—2&W÷6—F÷'’(	BF†R6–ævÆRÖf–ÆRW&&Vf÷&RfW'6–öâ6öçG&öÂ(	@Ğ¦æBF†V—"W†7B6†—FFW2vW&RæWfW"&V6÷&FVBâg&öÒ†W&RöâÂWfW'’VçG'Ğ¦6'&–W2—G2FFRB&VÆV6RF–ÖRâ Ğ 