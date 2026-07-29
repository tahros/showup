# ShowUp — changelog

## v3.3.139 (2026-07-29) — Swipe the cards, save the set

**Swipe anywhere on the report card, and anywhere on the share image.** The
arrows still work; they are no longer the only way. One gesture reader serves
both surfaces and both call the same `repRotate`, so there is still exactly
one place that knows how to advance a card.

A swipe commits only on horizontal INTENT — at least 44px, and at least 1.5x
more sideways than vertical. Both surfaces sit inside a page you scroll
vertically, and a carousel that rotates while you are trying to scroll past
it would be worse than one with no swipe at all. Pointer events rather than
touch, so a trackpad drag works the same way.

**The line that makes it work is in the tab-swipe blocklist.** `#repCard`
joins `[data-zoom]` and the other strips that own their own horizontal axis.
Without it every card swipe would also change tab — the single most likely
way this feature could have shipped broken.

**The arrows moved to the vertical midline**, absolutely positioned against
the card, flanking the preview where your thumb already is. The title
reclaims the full width.

**Overlay swipe keeps `_repCv` in step with what is on screen.** If it did
not, Share would send the card you were looking at BEFORE the swipe — which
looks completely fine right up until the wrong image lands in someone's
chat. The carousel underneath follows too, so closing the overlay leaves you
where you were. Swipe is gated on the overlay having been opened from the
carousel: the milestone card is drawn outside the registry, and swiping there
would teleport "day 900" to an unrelated chart.

**Save all N** draws every registered card and hands the whole set to the
share sheet in one call, where iOS "Save Images" writes them to the camera
roll together. Stated plainly because it is a real limit: a PWA cannot write
to the camera roll directly — there is no API — so one share sheet with every
image is the honest best. Desktop falls back to spaced sequential downloads.
The count comes from the registry, so someone who has never run is offered
five, not eight.

Gesture code is the least jsdom-verifiable thing in this app — the thresholds
can only really be judged with a thumb. The test covers what IS decidable:
that horizontal fires and vertical does not, that a twitch does not, that the
blocklist entry exists, and that the label `_repCv` carries always matches
the card being displayed.

## v3.3.138 (2026-07-29) — One rhythm down the column

**`.lastcard` sat 26px below the card above it; every `.zone` sits at 14px.**
So the gap under "Logged today" read as a section break that nobody had
decided to put there — two containers doing the same job, a card in a
column, with different ideas about spacing. Now both are 14px.

The run-history card carries the same class and gets the same correction,
which is right: it is also a card in a column.

**A buildcheck guard went in with the fix.** The two rules are in different
parts of the stylesheet, written at different times, and nothing connected
them — which is exactly how they drifted in the first place. Guard #10 reads
both margins and fails the build if they disagree, so the next person to
change either has to change both. Verified by reverting the fix and watching
the build fail with the precise message, then re-applying it.

## v3.3.137 (2026-07-29) — The suggestions follow the weight

**The rep tiles have followed the weight since v3.3.56; the suggested chips
never joined them.** They do now, through the same `refreshLoad()` funnel, so
the load line, the rep tiles and the chips cannot disagree about what weight
you are looking at.

The reorder is a **stable partition, not a sort**: chips matching the current
weight move to the front keeping their relative order, the rest follow
keeping theirs. Two properties fall out of that, and both are the point.
When the weight already matches the last logged set — the state the screen
opens in — nothing moves at all, so the feature is invisible until you
actually steer the weight somewhere. And "your latest logged set leads"
therefore still holds in that default, yielding only once you have
deliberately changed the weight, which is itself a stated intent.

Nearest-weight matching was considered and rejected: near-misses would
reshuffle on every tap of `+`, turning a stable list into a moving target
under your thumb. Exact match only, and a weight with no match leaves the
order alone rather than shuffling for the sake of motion.

**A latent bug surfaced while wiring this.** The suggested block is BUILT
before the log zone even though it RENDERS below it, and the log zone was
where `lift.weight` got resolved — so partitioning the chips there would have
compared them against whatever weight the previous exercise left behind. The
resolver moved up to sit directly under `suggestedFor()`, which is the only
thing it needed. Nothing depended on its old position.

The test drives the real stepper rather than calling the sort directly, and
its most important assertion is a negative one: in the default state the chip
order must be byte-identical before and after a refresh. A reorder feature
that quietly rearranged the opening screen would be a regression wearing a
feature's clothes.

## v3.3.136 (2026-07-29) — The rate, quietly

**The percentage goes in the corner the URL left empty.** Removing the URL in
v3.3.133 balanced the card's top but not its bottom — the span sat alone at
the left with nothing opposite it. "55% of days" fills that corner at the
footer's own size and faint colour, so the two read as one sentence: over
this window, this share of days.

Deliberately not a second headline. The count leads and the rate qualifies
it; a large percentage beside a large day count would make the reader choose
which number the card is about.

Two derived figures on one card is where they drift apart, so the assertion
checks they AGREE — that the stated percentage equals the stated fraction —
rather than only that both are present.

## v3.3.135 (2026-07-29) — 931 out of what

**"931 days" never said out of what.** The span was already printed along the
bottom of the card — 2021-12-13 to today — so the denominator was present but
never as a fraction, and the one number a stranger needs to read the card was
the one they had to compute. The headline now reads "931 of 1,690 days":
elapsed days since the first entry, inclusive of both ends, the same window
the footer states.

Same move as v3.3.133 on Last 6 months, and for the same reason: a count
without its denominator is a number, not a rate, and this app's whole claim
is about rate.

The assertion that matched the label "days" exactly was replaced rather than
loosened — it now checks the fraction is stated, that the denominator equals
elapsed days since the first entry, and that the count never exceeds it.

## v3.3.134 (2026-07-28) — The Pace card was a scale bug, not a spacing bug

**The white space was the symptom.** `drawSeries` scaled lines from 0 to max.
Pace values sit within a few percent of each other, so every point mapped
into the top sliver of the plot, the remaining 90% was structurally empty,
and the month labels stranded at the foot of an empty box. Re-centring would
have moved the emptiness around without removing it.

Lines may now declare their own y-range. The Pace row pads lo/hi by 25% each
side with a 30-second span floor — the same guard the live chart has carried
since it was written ("never flatten a near-identical year"). The rule is
spelled out in both places rather than shared, because the card and the chart
are different coordinate systems and the thing that must agree is the rule,
not the arithmetic.

**Bars deliberately cannot do this.** A bar chart cut off at a non-zero
baseline overstates the differences between its bars. Every week stays
zero-based on principle, and the option is gated on `kind==='line'` so it
cannot be handed to a bar chart by accident.

The line block is 55% of the band now and centres WITH its labels, so the
x-axis follows the art instead of sitting at the bottom of the frame.

**A correction to v3.3.133.** That entry claimed Pace kept full height "to
preserve the variation it has to show". Wrong diagnosis: the variation was
not being preserved by the height, it was being destroyed by the scale.

**And the test that should have caught it.** v3.3.133's centring assertion
passed on this card, because it measured the bounding box of all drawn art —
and "line pinned at the top, labels stranded at the bottom" has a perfectly
centred bounding box. It measured the frame and called it the composition.
Two assertions now measure density instead: the points must spread across a
real fraction of the plot, and the gap between the lowest point and the month
labels must be bounded. The bounding-box check stays, but can no longer pass
on its own.

One stale assertion went with it — "the bars plot is shorter than the
full-height line plot" encoded the design this release overturns, and
comparing the two heights was never the interesting question. Replaced with
band containment for both.

## v3.3.133 (2026-07-28) — The share cards, squared up

**Seven cards reviewed on the phone, seven notes, one release.** Most of the
work landed in `cardFrame()`, which every card but two already shares.

**The URL is gone from all of them.** `tahros.github.io/showup` was buying a
second mention of provenance at the cost of a whole line, when the "ShowUp"
wordmark already says it. Removed from the milestone card too — no card in
the family carries it now, which matters more than any one card keeping it.

**Plots are vertically centred.** Every painter used to hardcode a top under
the header, which left a dead strip above the caption on every card. The
frame now hands back a band (below the kicker, above the caption) and a
`mid()` that centres a plot of given height inside it. `vbMapCentered()` does
the same for the three cards that map an SVG viewBox — centred on their
PAINTED height, not the declared box, or they ride high by the difference.

**Consistency and Every week lost 25% of their height.** Pace deliberately
did not: it is a nearly flat series, and squashing it further would flatten
the only variation it has to show.

**The weekday caret was colliding with its own percentage** — the same bug
fixed on the live chart at v3.3.129, present here because the card ports that
loop verbatim. Same fix, same unconditional stack: bar, then the percentage,
then the caret above it. Position no longer depends on which flags are set.

**Every week** now labels only the oldest and newest week instead of nine
dates nobody read, puts a value above the most recent bar, and gains a y-axis
with dotted rules — without them a short bar was only "shorter than the
others", which is not the question the card exists to answer.

**Pace** labels every point in pace format rather than raw seconds,
alternating above and below the line so twelve labels on a flat series never
touch. The latest point is larger and stays accent — it used to inherit the
record colour whenever it happened to also be the fastest, which made "where
am I now" and "where was I best" the same mark.

**Consistency** stamps the date the receipt was taken, bottom right, where
the URL used to sit. **Last 6 months** names its denominator — "116 days in
26 weeks (182 days)" — so the number has something to be 116 of.

Two assertions inverted (both asserted the URL was present) and a new
test-cardframe.js records every canvas call and reasons about the result:
centring is checked as "is the gap above about the gap below" rather than
against magic numbers, so a re-tune of the frame does not silently break it.
One assertion in it is explicitly NOT checked on canvas — jsdom cannot
resolve CSS custom properties, so the pace point's colour is verified in the
source rather than allowed to pass vacuously.

## v3.3.132 (2026-07-28) — Every week, read at a glance

**A Strava chart the maker admired for being minimal, taken apart for what
made it readable.** Not its features — its restraint. Four things it does:
month names at boundaries instead of a label per point, two y-ticks instead
of a ladder, exactly one emphasised point carrying the only number on the
plot, everything else just shape. Every week now does the same, all by
subtraction:

- **Month names at the boundary**, not a week number under every bar. MAY ·
  JUN · JUL where the month turns — our own heatmap's convention, derived
  from the Sunday key each bar already has, not imported from Strava.
- **One number on the whole chart:** this week, bold, on the accent bar. The
  fifteen past bars lose their value labels. You were never reading them; you
  were reading the shape, and now the shape is all that is there.
- **Y-axis is 0 and the peak.** Nothing between.
- **Past bars dim to accent-dim**, so this week is the one thing lit.

**Kept, against Strava: the dashed average line.** Strava shows a peak to
celebrate; the average shows a baseline to measure against. "This week versus
my own normal" is a days-over-volume question, and the baseline is what
answers it. Bars stayed too — a line gliding between points hides a zero-km
week, and in an attendance record an empty week is not noise, it is the
fact.

`weekNum()` went with the per-week labels; nothing else read the sheet's week
number. New test-everyweek.js checks the subtraction held: exactly one bar
keeps a number, month names land where months actually turn, and the average
line survives.

## v3.3.131 (2026-07-28) — The i finds its middle

**Two verdicts in one day, both right.** The v3.3.130 filled disc shouted;
the bare glyph that replaced it whispered into the heading and vanished
(maker's verdict, same afternoon, from the phone). The middle is a dim
outlined circle — `var(--line)` border, muted glyph, no fill. Visibly a
button, not demanding anything.

Same-day trial-and-adjust, recorded as such. The padding/negative-margin
trick from v3.3.130 goes with the bare glyph; the 22px circle itself is the
tap target now, which is simpler and the same size to a thumb.

## v3.3.130 (2026-07-28) — One share surface, and a quieter i

**Seven share buttons were seven doors to one room.** Every section header
carried its own blue download icon, each wired to its own router line and its
own `make*Image()` wrapper. They are all gone. In their place, "Report card"
returns at the bottom of Stats — rotate with ‹ ›, see the card you are about
to send, then send it.

The thing that made this cheap was already true: the share painters have
always drawn on canvas from the same data functions as the live charts, not
from the rendered SVG. So this release is not a rework of sharing, it is a
rework of entry points. `shareCards()` is now one list — label, file name,
draw — and adding a card is adding a row. There is no second place to
register one, which was the actual defect: a card could be built and then
never reachable because nobody added a router line.

The run cards (Distance, Every week, Pace) are withheld from anyone who has
not run. An empty Pace card is not a card, it is a bug with a title.

**The rotation index is clamped, not trusted.** If the card list shrinks
under a stale index — rotate to Pace, delete your runs — `repCardAt()` wraps
it back into range rather than returning undefined. The index also lives at
module scope, so logging a set does not snap you back to card one.

**Deliberately not built: month stepping.** The old v3.3.111 Report card
stepped through months with ‹ ›. Those arrows now step through card types,
and nesting a second meaning inside the same control is the kind of thing
that reads fine to the person who built it and confuses everyone else. One
axis. If stepping back to June is missed, it can return as its own control on
its own card.

**The i lost its disc.** A filled chalk circle beside every heading read as a
control demanding attention, when it is a footnote you consult maybe twice.
It is a muted glyph now, sitting close to the title. The ink shrank; the tap
target did not — 6px of padding with a matching negative margin keeps it
around 22px, because a smaller target would just be a worse button.

Eleven assertions across four suites were inverted rather than deleted:
they encoded "Report card is gone" and "the download icon appears on exactly
these eight sections", which were true and are now false. The one that
mattered most got rewritten rather than dropped — it used to check that the
share ids survived a move, and now checks that rotating changes *which* card
the button sends. A carousel that always sends card one would look perfectly
correct on screen.

## v3.3.129 (2026-07-28) — Taller plots, and labels that cannot collide

**Four charts were too short to hold their own furniture.** Consistency and
Distance go 340×170 → 340×220 (baseline 140→190, span 120→170); Days by month
and Weekdays go 330×118 → 330×150 (baseline 94→126). Weekdays reverses the
v3.3.113 compaction on purpose — at 118 the caret and the percentage had
nowhere to live. Weight and Pace were left at 118: they were not in the
request, and a chart is not improved by being taller on principle.

The `data-sy0`/`data-syh` scrub anchors moved in lockstep with the geometry.
They are the only thing standing between the legend and a confident lie —
the live readout is derived from them, so a drifted anchor does not crash,
it just reports the wrong percentage under your finger.

**The zoom hint sat on top of the plot it described.** On Days by month it
landed squarely on the days-elapsed number. `.zoomhint` is no longer
absolutely positioned inside `.zoom`; it is a static right-aligned line above
it, the same move and the same argument as the v3.3.109 legend — it doubles
as the scrub date readout, and above the chart it is never under the hand
doing the scrubbing. Being a sibling now, `app.js` looks for it on the parent
card; miss that and the date readout and the zoom fade break silently.

**Tuesday was both today and the strongest weekday, so it drew both labels in
the same place.** The percentage's y branched on today/best while the caret
sat at a fixed offset above the bar, which put them 4 units apart in the one
combination where both were drawn. The stack is now unconditional — bar, then
the percentage 4 above it, then the caret 11 above that. Position no longer
depends on which flags are set, so no combination can collide. Measured gap:
11.

**The consistency chart's year-end tags smeared together** when years finished
within a few points of each other (60/57). They are now collected, nudged
apart, then emitted — the same pass the distance chart has used since
v3.3.89, rather than a second mechanism doing the same job differently.

`test-scrub.js` hardcoded `"0 0 340 170"` as the double-tap reset target, so
making the plot taller failed a test of a gesture that had not changed. It
reads the baseline off the chart now. New `test-chartsize.js` drives the real
painter with today forced to also be the strongest weekday — the exact
collision case — and measures the drawn gaps rather than trusting the source.


## v3.3.128 (2026-07-28) — A wider plot, and selection off everywhere

**The consistency chart's plot was using 80% of its own width.** Margins of
26 left and 40 right on a 340 viewBox, most of it reserved for labels that
did not need it. The plot now runs 20→322, about 10% wider, with the y-axis
labels moved in to match. Assertions check the actual drawn extent: nothing
crosses the right edge, nothing clips on the left, and the year end-labels
still fit between the plot edge and the box.

**Text selection was still possible outside `#app`.** The v3.3.110 rule was
scoped to the app shell, and the share overlay mounts on `<body>` —
deliberately, so long-press could still save the card image — which meant
its buttons were selectable. That is what the maker hit: selection handles
over "Close".

Fixed for the overlay, with the IMAGE keeping its callout, since long-press
to save is the one long-press that should work.

**The audit for this found a second one I did not know about.** Rather than
naming the overlay, the assertion walks every element mounted outside `#app`
and requires each to be covered by a no-select rule — and immediately
flagged the floating "top" button, real visible text with the same gap.
Covered too. The assertion checks coverage rather than counting known
elements, so the next thing mounted on `<body>` fails until it is handled.

Two test-matching corrections on the way, neither a code fault: the rules
are grouped (`#repOv,.calreturn{…}`) so a per-selector regex missed them,
and the top button's id is `calReturn` while its class is `.calreturn` —
comparing only the id against a class selector reported uncovered when it
was covered, differing by case.

`test-scrub.js` at 38.

## v3.3.127 (2026-07-28) — Wider bars, and numbers that read

**Bars 25% wider** — columns 12→15, bars 10→12.5, gap held at a hairline.

**Thousands separators.** `pmixTick()` had its own formatter, and once the
archive grew the k-value itself ran past a thousand: a lifetime total
rendered as `6620k`, digits running together. It goes through `fmt()` now,
the function the rest of the app already uses, so it reads `6,620k`.
Everything smaller is unchanged — 9.2k, 13k, 940 — asserted, because a
formatter change is exactly the kind of fix that quietly breaks the values
it was not aimed at.

That is the second private formatter found in this chart after v3.3.124's
private volume formula. Both were written here instead of reused, and both
were wrong in a way the shared version was not.

`test-pmix.js` at 87.

## v3.3.126 (2026-07-28) — Part mix: release means release

**What an empty-space tap means now depends on the state.** Landing on a
segment always picks that part. Landing on empty space picks the column's
part only when nothing is being followed — once you ARE following one, empty
space RELEASES rather than switching you to whatever bar happens to sit
under your finger. The maker's read is the right one: once you are following
something, blank space means get me out, not take me somewhere else.

Both states are asserted, plus the case that must keep working: landing on a
real segment while following something else still switches to it.

**The left gutter is 26% narrower** (axis 34→25) — it was holding far more
room than "13k" needs.

**The newest column pulses**, so "where is today" needs no scrolling to
answer. It pulses the COLUMN rather than the bars, deliberately: a CSS
animation beats inline style, so animating the bars would override the
opacity that focus-dimming sets and the two would fight. Asserted that the
pulse never touches a bar, and that it holds still under reduced motion.

**More air** between the legend, the hint, and the plot (6→14px each).

`test-pmix.js` at 83.

## v3.3.125 (2026-07-28) — One interaction, and height that follows content

**The scrubber is gone.** Tapping is the only interaction now and it does
one thing: follow a body part. Tapping ANYWHERE in a single-part column
works — you never have to hit a thin bar exactly — while an ambiguous stack
still needs its segment, because guessing which of two parts you meant would
be worse than doing nothing. A drag scrolls and never selects; movement past
6px cancels the tap.

The line above the chart says what tapping does, then says what you are
following once you have chosen. The old per-day readout is removed — which
also retires the "6k 6k kg" class of bug entirely, since nothing prints a
part total beside a day total any more.

**Columns 17→12, bars 13→10** — about 20% narrower with the gap halved, so
more of the archive is legible at once.

**The dead space is gone.** The box was 232 tall while the drawn content
ended near 182 — rotated dates run from the baseline down about 26px — so
every render carried ~50px of empty card. It is 186 now.

**The two-shape rule is WITHDRAWN**, on the maker's call. v3.3.113 collapsed
four aspect ratios to two so section heights would stop looking arbitrary;
each chart should be sized to what it displays instead. Part mix proved the
point by padding itself to hit a ratio. What replaces it is the property the
ratio rule was a proxy for: **a chart may not waste its own height.** The
assertion measures drawn extent against viewBox height and fails under 80%
— verified to fail the previous build at 67%. Its threshold is 80 rather
than 85 because the measure reads y/height attributes and cannot see how far
ROTATED text extends, which is documented where it is set.

**Three test-design corrections**, all the same root cause: assertions
inheriting whatever fixture ran last. The month-rule check failed against a
fixture of consecutive days that crossed no boundary; the label check failed
against a fixture with no Chest in it. Both seed their own data now. And
excising the readout function accidentally took `pmixSummary()` with it —
it sat between the two — caught by the suite and restored verbatim.

`test-pmix.js` at 73.

## v3.3.124 (2026-07-28) — The maker was right; Part Mix was wrong

Part Mix reported **2.5k** for a day History calls **9,190 kg**. The maker
said something was off. I said it wasn't. The maker was right.

**Cause.** `partMix()` computed volume with its own formula, `w * reps[0]`,
while every other surface in the app calls `volOf()` = `w * sum(reps)`. A
stored entry may hold a REPS ARRAY — `Pull Up 70kg [12,10,10,8]` is one
entry worth four sets — so the private formula counted one set in four.
Fri Jul 10: Pull Up 70×40, Bent-Over Row 61.2×75, Lat Pull Down 45×40 =
9,190. The old formula read 70×12 + 61.2×20 + 45×10 = 2,514.

**Why my earlier check missed it, which is the part worth keeping.** I
reconstructed a day from a SCREENSHOT's display and verified my formula
against my own reconstruction. It agreed with itself. It never once agreed
with `volOf()`. A check that validates an assumption against the same
assumption proves nothing, and it read as confirmation.

The fix is one line — call `volOf()` — and it is the drift this codebase
keeps paying down: `resealDay()`, `foldSets()`, `gridData()`,
`elapsedDays()`, `runYearCurves()` were each extracted because the same
arithmetic in two places eventually disagrees. This was the same mistake,
made by me, in a new function.

**The regression test compares partMix against volOf() on every day**, over
folded and unfolded storage both, and is verified to FAIL on the previous
build with the exact numbers from the report (chart 2514, volOf 9190). A
second assertion forbids partMix from ever carrying a private volume
formula again.

Every other `reps[0]` in the app was audited: all are display labels or
suggestion values, none compute volume.

A test-design note: that last assertion first failed against correct code,
because the fix's own comment explains what `reps[0]` used to do and the
grep flagged the explanation as the bug. Comments are stripped before
grepping now — the same failure as v3.3.106, in a new place.

`test-pmix.js` at 74.

## v3.3.123 (2026-07-28) — Part mix: tap a bar, read the trend, find the year

**"6k 6k kg" was a real bug.** On a one-part day the part total IS the day
total, and the readout printed both. The total only earns its place when
there is more than one part to add up.

**Tapping a bar is now the same act as tapping its legend chip** — the
shortest route from "what is this bar" to "show me all of these". A DRAG
still scrubs; a TAP selects, distinguished by a 6px movement threshold, so
scrubbing across the chart never selects by accident. Asserted both ways.

**A summary sits below the chart**: total, session count, average, and a
trend. With a part isolated it speaks about that part; otherwise about every
lift. The trend compares the most recent third of the SESSIONS THAT COUNT
against the third before — sessions, not calendar days, so a quiet fortnight
does not read as a decline in something you simply did not train.

**The year rides just outside the plot, top-left, and swaps as you cross a
boundary.** Scroll back past January and it becomes 2025. Asserted by
seeding two years and scrolling between them.

`test-pmix.js` at 70.

## v3.3.122 (2026-07-28) — Part mix: scrubbable, yearly, and no longer lurching

**On the volume discrepancy — it is not a bug.** `SEED0.sessions` ships
empty, so the archive could not be audited from here and was not guessed at.
What could be checked is the arithmetic, against a day already visible in a
screenshot: Dumbbell Press 4,296 + Side Raise 960 + Front Raise 480 = 5,736,
exactly what the app displays for that Shoulder day. One set is
`weight × reps`, a 20-set day lands near 5.7k, and the same weights across
5 sets land near 1.4k — which is the range of the small bars. The ratio in
the chart is SETS PER DAY. The new scrubber makes that checkable per day
instead of inferred.

**The lurch is gone by removing its cause.** Loading backwards meant
prepending columns and then correcting `scrollLeft`, and correcting
scrollLeft mid-momentum is a visible jump no easing hides. The whole archive
renders up front instead — a day carries one or two parts, so ~930 days is a
couple of thousand rects, and the lazy path bought nothing but the bug.

**A scrubber.** Press or drag across the plot and the line above names the
date, each part trained with its volume, and the day's total; the column
under the finger lifts. Discrete columns, so this is an index lookup rather
than the interpolation the line charts need.

**Years are findable.** A firm labelled rule at every year change, the
existing soft rule at every month, and the first column names its year so
the left edge is never mute.

**Isolating a part now labels it** — values written above that part's bars,
and only that part's. Legend is centred.

**Six assertions were replaced rather than deleted**: they tested the
lazy-loading mechanism that no longer exists. Their replacements assert the
outcome that mattered — every training day rendered, nothing prepending, no
scroll correction, still parked at today. And the smooth-scroll hazard moved
rather than vanished: isolating a part re-renders the plot, so the
suppression now lives in `pmixSetFocus()`, with the assertion following it
there.

`test-pmix.js` at 57.

## v3.3.121 (2026-07-27) — Light enough to see, tappable enough to read

**The light theme was near-black, and my own guard caused it.** I set a 3:1
floor for part fills in v3.3.118 — and on a near-white ground, 3:1 MEANS
dark, so the ramp had nowhere to sit but 600–900. That floor is right for a
lone graphic; it is wrong for stacked segments, whose neighbours are other
segments, separated by a stroke, inside an axis and labelled guides. The
fill floor is 2.0 now and the light ramp spans 2.29–6.82 instead of
3.32–14 — blue-400 at the top where it was sky-800.

**"Hard to pin point which exercise corresponds to which color" is the
ramp's real cost**, and more colours is not the fix — that is what a single
hue buys. Tapping a name in the legend now isolates it: every other part
drops to 12% and the legend marks which one is live. Tap again to clear.

It is applied by mutating the rendered rects rather than re-rendering, so
scroll position and any weeks loaded backwards survive the tap — and the
back-loader re-applies it, since prepending weeks replaces every rect.
Asserted, because that is exactly the kind of state that silently resets.

`test-pmix.js` at 51.

## v3.3.120 (2026-07-27) — Part mix: a scale, a ramp, and the way back

Seven changes to the part-mix chart. One of them undoes a decision two
releases old, correctly.

**Shades of blue.** The categorical palette is gone, which returns this
chart to the app's original no-categorical rule — the v3.3.116 exception is
spent rather than extended. Sourced across Tailwind's sky/blue/indigo/cyan
so the ramp carries a little hue drift, because pure lightness cannot hold
eight steps: on a dark ground, eight levels each clearing 3:1 against it AND
separating from each other do not FIT in the luminance range available. That
is arithmetic, not preference. A **hairline separator** is stroked between
stacked segments and carries the boundary instead, which is what lets the
mutual floor sit at 1.12.

**A fixed y-axis** beside the scroller, so the scale stays readable however
far back you have travelled, with **five labelled guides** across the plot.
Axis and plot both call one `pmixMax()` — two maxima would mean the labels
quietly lie about the bars.

**A soft vertical rule at every month change**, with the month named beside
it, and a compact legend above the chart.

**A jump-to-latest button** appears bottom-right once you are more than a
screen from today, fades in rather than pops, and rides the wrapper's own
smooth scrolling. Back-loading explicitly SUPPRESSES that smoothness while
it restores position — gliding the view across the weeks it just prepended
is the exact opposite of holding it still. Both motions are disabled under
reduced-motion.

**The v3.3.119 colour guard was rewritten, not relaxed.** It assumed a
categorical palette, where two fills sharing a hue meant a collision — so
against a deliberate ramp it flagged all 28 pairs of a palette working
exactly as intended. The property that actually matters either way is that
any two fills be distinguishable by SOMETHING: different hue, or enough
luminance between them. It now tests that, and separately asserts the
separator exists, since that is what makes the low floor honest.

`test-pmix.js` at 43.

## v3.3.119 (2026-07-27) — The maker's palette, minus what the guards refused

Family assignment by the maker; steps dark -300 / light -500. Six of eight
landed exactly as asked. Three did not, each for a measured reason.

**Back asked for RED, Shoulder for ORANGE.** `red-500` sits 5° from the LIVE
red and `orange-500` 20° — there is no red that is not the red, which is
what makes it a state colour. Back takes **pink** (330°), the closest legal
hue to red; Shoulder takes **purple** (271°), because amber is legal on hue
but measures 1.94:1 on the light ground.

**Light -500 could not hold for two of them.** `yellow-500` reads 1.73:1 on
the near-white ground and `teal-500` 2.24:1, both under the 3:1 floor a
chart fill owes. Chest is `yellow-700` (4.44) and Sixpack `teal-600` (3.37).
Warm and cyan hues carry too much luminance to clear 3:1 at a mid step; that
is physics rather than preference, and the maker's earlier instinct to go
two steps lighter would have made Chest invisible at 1.38:1.

**A new guard caught a failure the contrast floor could not see.** Biceps
asked for slate and Triceps for gray — 3–5° apart, effectively one colour,
and those two stack side by side. Clearing the GROUND is not the same as
being tellable apart from EACH OTHER, so `test-pmix.js` now compares every
pair of part colours and fails any two that share a hue without clearly
separated saturation. Triceps takes **stone** (warm, 25°) against slate's
215°, and Run takes **zinc** (240°) rather than gray, which collides with
slate too. Three greys that are genuinely distinct: cool, warm, pure.

Run's colour never renders in this chart — it was excluded in v3.3.117 — but
a defined-yet-duplicate token is a trap for whoever renders it next, so it
was fixed rather than exempted.

Final: Chest yellow · Back pink · Shoulder purple · Legs blue · Biceps slate
· Triceps stone · Sixpack teal · Run zinc.

`test-pmix.js` at 26.

## v3.3.118 (2026-07-27) — PART_COLORS, sourced rather than mixed

Tier 1 of adopting Tailwind's palette. Scoped deliberately to PART_COLORS:
the semantic tokens keep their canonical hues, per the maker's v3.3.92
ruling against cosmetic recolouring.

**No dependency was added.** Tailwind is a build-step tool and this app has
no build step; what was wanted is the palette, which is MIT-licensed data.
The real values were pulled from `tailwindcss@3.4.19` on npm rather than
recalled, then mapped: indigo / violet / teal / yellow / pink / slate / sky
/ stone, at -300 in dark (-400 for the two near-neutrals, too pale at 300)
and -600 in light.

**Two families were rejected by the guard, not by taste.** `rose` sits at
350°, fifteen degrees from the LIVE red, and would have put a body part in
the app's one red. `amber-700` and `orange-700` sit at 26° and 17°. Pink
and yellow are what survived the constraint that no part colour may read as
a state colour.

**The contrast floor changed the mapping twice.** Chart fills are graphical
objects and owe 3:1 against their own ground. On the near-white light
theme, `amber-600` measured 2.87 and `yellow-600` 2.65 — warm hues carry too
much luminance to clear 3:1 without darkening into the red. Legs is
`yellow-700` (4.44) for that reason alone.

That floor is now a **build guard**: buildcheck computes every `--p-*`
against its own theme's ground and fails under 3.0. Verified by putting
`yellow-600` back and watching it fail at 2.65. Without it this palette
would have shipped a Legs bar nobody could see — twice.

**A v3.3.117 assertion was replaced, not deleted.** It required every part
colour to be light, which held only while both themes used pastels. The real
invariant is directional — dark fills lighter than the dark ground, light
fills darker than the light ground — plus a check that the two themes use
genuinely different values rather than one pasted into both.

`test-pmix.js` at 24. buildcheck at 9 guards.

## v3.3.117 (2026-07-27) — Part mix, corrected

Five corrections from the maker, two of them real bugs.

**The palette was poster paint.** Softened toward pastel: hues kept, since
hue is what tells the parts apart, but saturation and lightness pulled back
(#6B8CFF → #A8B8F0 and so on), with the light theme a shade deeper so the
same softness survives a white ground. The v3.3.116 state-colour guard was
re-run against the new values BEFORE writing them, and a new assertion
requires every part colour to be light — so nobody can quietly saturate it
back.

**Volume, not sets** — the maker's original intent, and what the spreadsheet
plotted. **Run leaves the stack**: its `w` field holds kilometres, and
kilometres do not sum with kilograms. The spreadsheet drew Run as a separate
line for exactly that reason. The legend drops to seven.

**Every column names its day**, rotated, as the spreadsheet does. Columns
are wider (13→17) and the plot taller (150→232) — the first pass was too
squat to read.

**The scroll ran away, and the cause was measurement.** Reaching the left
edge loaded older weeks by reading `box.scrollWidth` to learn how much had
been prepended — but scrollWidth has not reflowed inside the handler, so the
delta came back 0, `scrollLeft` stayed at 0, the next scroll event saw
`scrollLeft<80` and loaded again. One flick ran the chart to the first day.
Two fixes: the width added is now COMPUTED from the data (columns × column
width) rather than measured, and the re-entry lock is held until the next
animation frame instead of being released synchronously, which never
blocked anything.

The test reproduces that exactly — jsdom reports `scrollWidth` as 0 always,
which is precisely the failing condition, so a correct implementation must
still move the view. It asserts the view is pushed right by exactly
columns-added × column-width, and that a burst of fifteen scroll events
loads at most one chunk.

A test-design note: the burst assertion first demanded exactly one chunk and
failed against working code — under a synchronous burst the rAF that clears
the lock never runs, so zero loaded IS the lock holding. The invariant is
"at most one", and the test says that now.

`test-pmix.js` at 22.

## v3.3.116 (2026-07-27) — Part mix

A new chart, second from the top: one column per training day, stacked by
body part, so an under-served part shows up by its absence. Ported from the
maker's Google Sheets dashboard — the "Which part to work out?" chart that
predates this app.

**Sets, not volume.** Tonnage is not comparable across parts — one Legs day
dwarfs a month of Biceps and would flatten everything else — and days >
volume argues for the count regardless.

**PART_COLORS is a second validated exception**, agreed with the maker
before building. Eight series have to be distinguishable at a glance and a
lightness ramp cannot do it; this is the case where categorical colour is
the correct encoding rather than decoration.

It does NOT reproduce the spreadsheet's palette. **Back is not red and Legs
are not green**, because those two hues mean exactly one thing each in this
app — LIVE and declared rest — and a body part is not it. The guard is
saturation-aware: a part colour passes if it is far in hue from the state
hues OR too desaturated to read as one (Run's brown sits near red on the
wheel at 0.31 saturation against the LIVE red's 0.65). A hue-only first
draft failed those browns, which was the test being blunt rather than the
palette being wrong. The stronger guard is scope — asserted — that part
colours only ever appear as chart fills, which `--live` and `--rest` never
are.

**It loads backwards.** Opens on the last 8 weeks parked at today, and
pulls in another 8 as you reach the left edge, restoring scroll by exactly
the width added so the view does not jump under your finger. It stops at
the end of the archive. Being a sideways scroller, it joins the tab-swipe
blocklist.

**Two existing assertions needed scoping, both broken by my own addition.**
The v3.3.113 two-shape rule governs charts that FILL the card width, where
the viewBox ratio literally is the rendered height; this chart is a
fixed-pixel-height scroller whose width grows with data, so it is excluded
and asserted to have a fixed height instead. And the v3.3.109 legend-order
check used the first `.legend1` in the document — now this chart's — whose
card holds no zoomable chart, so it was passing or failing on section order
rather than on the thing under test.

New suite `test-pmix.js`, 16 assertions. Harness at 26 suites.

## v3.3.115 (2026-07-27) — Cards that mirror the screen

The maker on yesterday's five cards: Days by month, Last 6 months and
Weekdays were "so bad". Correct — they were built from a generic painter
that took the numbers and drew its own idea of a chart, so they were
approximations of the data rather than pictures of the chart.

**They now map the SVG's own coordinate system onto the canvas.** Each of
those charts is authored in a 330×118 viewBox, so `vbMap()` supplies one
scale factor and the drawing loop is ported line for line — same bar
positions, same rounded corners, same opacities (0.55 / 0.6 for past, 1 for
current), same label offsets, same gridlines. Fidelity is structural: if the
chart changes, porting it is a copy rather than a redesign.

What that recovered, concretely: **Days by month** regains its dashed
20-day reference line, its dashed days-elapsed outline on the current month,
and the trained-count-inside-the-bar treatment. **Weekdays** regains its
0/25/50/75/100 gridlines with labels, the ▲ over the strongest day, the
per-bar percentages, and today drawn in accent against accent-dim.
**Last 6 months** regains its weekday rail down the left and month labels
across the top, drawn only where the month turns over — it had been a bare
grid of squares.

Pace and Every week keep the generic painter; their on-screen shapes are a
plain line and plain bars, which it already matches.

**Icons: larger and back beside the title.** (i) 17→21px, the download glyph
10→13px, and `margin-left:auto` dropped from the action group — the maker's
call after living with them hard-right for one release.

**The tests now compare the card against its own chart**, not against
"did it draw something". They pull the `<text>` nodes out of the rendered
SVG and require the card to emit the same month labels and the same seven
percentages. That caught a real subtlety immediately: `cardFrame()` always
emits five texts of its own first (big, sub, kicker, footer, url), and the
card's headline "23" was being counted as a month label, so the sets never
lined up. The comparison skips the frame now.

`test-cards.js` at 39.

## v3.3.114 (2026-07-27) — Five more cards, two more painters

Share cards for Days by month, Last 6 months, Weekdays, Pace and Every week.
Eight of the fifteen Stats sections are shareable now, up from three.

**Two painters, not five.** The four older cards each hand-drew their own
frame; these share `cardFrame()` for the headline/kicker/footer/URL, then
`drawSeries()` (kind `bars` or `line`) covers four of them and `drawHeat()`
covers the calendar. Five cards, ~130 lines, because the differences between
them are data and wording, not drawing.

**The data moved out of the render functions first.** `wdDist()`,
`weekSeries()`, `paceSeries()` and `heatSeries()` are pure functions in
util.js now, and the on-screen SVG reads the same ones — the weekday chart's
inline 365-day loop was deleted in favour of `wdDist()`. Adding a card by
duplicating the arithmetic is exactly the drift `resealDay()`, `foldSets()`,
`gridData()`, `elapsedDays()` and `runYearCurves()` were each extracted to
stop, and it would have been the easy way to do this.

**Two headlines were wrong on the first pass and only visible in the test
output.** Every week led with "0 km this week" — honest, and useless on a
Monday morning; it leads with the weekly average now, which is stable and is
already the chart's reference line. Weekdays led with "S", which does not
say whether that is Sunday or Saturday; it spells the day out.

New suite `test-cards.js`, 27 assertions. It drives the real painters
through a recording 2D context and counts what actually reaches the canvas,
because "the button is wired" and "the card draws something" are different
claims — every card is checked for real geometry, its own kicker, and the
URL footer. A final assertion walks every `.shareb` in the DOM and requires
a matching router handler, so an icon can never open nothing.

The v3.3.112 assertion pinning which sections carry the icon was updated
from three names to eight — kept explicit rather than loosened, since its
purpose is catching a section that silently gains an icon opening nothing.

Harness at 25 suites.

**Deploy note — fifth Pages build-drop, and the cause is now fixed.**
`f55bf9a` landed while the previous build was in flight and no build was
enqueued for it. All five drops (v3.3.96, .100, .106, .113, .114) share that
one cause, and each was patched with a throwaway follow-up commit. `deploy.py`
now WAITS for any in-flight build to finish before pushing — removing the
cause rather than repeating the remedy.

## v3.3.113 (2026-07-27) — Two chart shapes, not four

Part three of the Stats review, closing it.

The maker's read was that section heights fluctuated because of the "Share
as image" button. The button was a symptom; the cause was that the charts
render at `width:100%; height:auto`, so their height IS their viewBox
aspect ratio — and there were **four** of them: Weight at 0.315, the bar
charts at 0.358, Weekdays at 0.424, and the two year-over-year line charts
at 0.500.

Now there are two. **Tall (340×170, 0.500)** for the two year-over-year line
charts — five series, a scrubber, a full year across the x-axis; they earn
the height. **Short (330×118, 0.358)** for everything else. Five of the
seven charts already sat on one of those two; only Weight and Weekdays were
outliers.

Both outliers were **rescaled to fill the new box, not padded into it** — a
card that is the right height but half empty is not the same thing as a
chart that fits. Weight's baseline moved 84→95 and its span 66→75 (×1.135);
Weekdays' baseline moved 112→94 and its span 96→81 (×0.843), along with the
four label offsets that hang off that baseline.

Rescaling by hand is exactly the kind of change that clips something
quietly, so the test walks every chart's rendered geometry and asserts
nothing draws below its own viewBox — plus, specifically for Weight, that
every plotted point still lands inside the plot area rather than in the
axis-label margin.

A fixture note: `renderStats()` early-returns on an empty archive, so a
first attempt to inspect the weight chart reported "no weight section" and
looked like a regression. It needed training days AND weigh-ins; the chart
was fine all along.

`test-statspolish.js` at 45.

**Deploy note — fourth Pages build-drop** (after v3.3.96, .100 and .106).
`e7c579c` landed on main while the previous build was in flight and no build
was enqueued for it; ten polling rounds showed the prior commit still
`built`. Same remedy as before: a follow-up commit. The success line stayed
silent this time, which is the v3.3.106 fix working — it now requires the
SHA poll AND the byte-check, so a correct-but-unpublished release can no
longer report itself as shipped.

## v3.3.112 (2026-07-27) — One action group per header

Part two of the Stats review. Every section header now ends with the same
right-aligned group: the (i), and — where a share card exists — a download
icon. The eye finds them in one place instead of hunting mid-title for a
tip and below the card for a button.

**Nine sections gained a tip.** Show up, Days by month, Last 6 months,
Weekdays, Run, Next milestone, Every week, and both Records tables. They
follow the rule the existing tips already set: *what it measures — how to
read it*, sentence case, one breath. buildcheck's 120-char guard passed
them, and a test now reads every rendered tip and asserts the longest fits.

**The download icon appears only where a card exists** — Consistency, Every
month, Distance. Making it universal would mean hand-writing a 1080×1080
canvas renderer for a dozen more sections, and nobody shares a records
table. Shown selectively, its absence reads as deliberate; a test pins the
exact three, so a future section can't quietly acquire or lose one.

The (i) stays chalk and the download is accent — passive explains, active
does something.

**The three "Share as image" buttons moved out of the card bodies and into
the headers, keeping their original ids.** That meant the router needed no
change at all. Because "the button still exists" and "the button still
works" are different claims, the test stubs `showCard` and clicks all three,
asserting each reaches a card renderer.

**Two process notes.** The patch script's first run had a wrong anchor
(`h+=` where the source says `let h=`) and died mid-way with header.js and
the CSS already written — the all-or-nothing guarantee holds per patch()
call, not across a script, so the tree was restored from the previous stage
and reapplied rather than patched forward from a half-done state. And two
v3.3.75 assertions grepped the source for `iBtn('mgrid',...)`, which broke
when the identical tip text moved into `hActs()`; they accept either caller
now, so they assert the tip rather than its wrapper.

`test-statspolish.js` at 39, `test-sharecard.js` at 70.

## v3.3.111 (2026-07-27) — Stats, in the order the maker asked for

Part one of a three-part Stats review. This release: order, removals,
titles. Header icons and chart heights follow.

**Order is now declared, not incidental.** Sections used to render in
whatever order their code happened to sit in, so reordering meant moving
long blocks of markup. Each section is now cut into a buffer as it's built
and emitted from one line at the bottom of `renderStats()` — and the same
technique inside `runStatsHTML()`. Reordering Stats is now a one-line edit.

The order, top to bottom: Show up · Consistency · Every month · Days by
month · Last 6 months · Weekdays · Weight · Run · Distance · Next
milestone · Pace · Every week · {year} goal · Records · per-part ·
Settings. Asserted as a sequence, so it can't drift back.

**Two sections removed** on the maker's call: *Report card* and *Last 30
days, vs your usual*. Both took their machinery with them — the entire
last30/drift computation existed only to feed the second, and `drawRep()`,
`makeRepImage()`, `repOff` and three router handlers only fed the first.
Eleven orphaned CSS rules went too.

**`repData()` survives, and that mattered.** It looked like dead code after
the Report card was cut, but the month grid's tap-to-expand reads it. A test
now asserts `repData` exists while `drawRep` does not, so the distinction
survives the next person who greps for unused functions.

**Titles follow one rule:** short noun phrase, no comma-qualifier — if it
needs a qualifier, that belongs in the (i). `Consistency, year over year` →
**Consistency**; `Days trained, by month` → **Days by month**; `Which days
you show up` → **Weekdays**; `Your weight` → **Weight**; `Showing up,
every month` → **Every month**; the run chart's `Year over year` →
**Distance**; `Pace, by month` → **Pace**. `Show up — that's the whole
game` is left alone: it's the thesis, not a label.

**Test notes.** A v3.3.69 assertion pinned Weight above "Report card" —
markup that no longer exists — and was revised to the surviving intent
rather than deleted. Its first rewrite anchored on the Run block, which does
NOT render in a fixture without runs, so `indexOf` returned -1 and the
comparison silently inverted; it anchors on an always-present section now.
And the order assertion's first draft split heading text on the letter
"i" to strip the tip, which decapitated "Consistency" at its own first i.

`test-statspolish.js` at 32, `test-bwcard.js` at 53.

## v3.3.110 (2026-07-27) — An app, not a document

Reported while scrubbing: iOS pops Copy / Look Up / Translate over the
chart. A long press is simultaneously "scrub this curve" and "select this
text", and iOS resolves the tie in favour of selection.

**The decision, not just the fix.** ShowUp is an application shell, not a
document. Selection is off by default now, restored deliberately.

Every surface here already owns a gesture — charts scrub, pinch and
double-tap; tiles tap-to-delete and hold-to-edit; chips select — so text
selection competes with all of them. And the failure is asymmetric: an
accidental callout blocks the UI mid-gesture, whereas a missing selection on
a label like "DAYS OF SHOWING UP" costs nothing, because there is nothing
there worth copying.

The codebase had already been answering this one element at a time.
`.settile` and `.readyhead` each got `user-select:none` reactively, after
each one broke. That is whack-a-mole — the default was wrong, not those two
elements — and both spot-fixes are subsumed by the base rule now.

**Restored deliberately:** `input`, `textarea`, `select`, and an explicit
`.selectable`. The inputs are not optional — three code paths call
`.select()` programmatically (bodyweight entry, rep fields, and the Sheets
clipboard fallback). The account email in Settings wears `.selectable`,
being a real identifier someone may want to copy. The share-card overlay
mounts on `<body>`, outside `#app`, so long-press to save the image is
untouched.

**The honest cost:** iOS Translate-via-selection is gone. Accepted — the
app's text is short labels and numbers, and anyone needing translation needs
the whole app translated, not a word at a time. VoiceOver is unaffected; it
reads the DOM, not selections. Getting your data out remains Export/Backup,
which was always the better path than selecting text off a screen.

Also removed: three orphaned `.readyhead` rules, dead since the Readiness
board was deleted in v3.3.86.

`test-scrub.js` at 31.

## v3.3.109 (2026-07-27) — The readout moves above the hand

Two reports from using the new scrubber, one root cause: the legend was
doing two jobs — static reference and live readout — while positioned and
sized for only the first.

**It sat below the chart**, which is exactly where the scrubbing hand is.
It's above the chart now, so the numbers are in clear sight while a finger
is on the curve.

**It scrolled sideways, so years were simply absent.** `.legend1` was
`overflow-x:auto` with unshrinkable chips — a horizontal scroller. The
current year sorts LAST, so it was the first thing pushed off-screen, which
is why 2026 was missing. It wraps now: every plotted year is on screen at
all times, asserted by comparing the set of plotted `polyline[data-yr]`
against the set of legend entries.

There was already a workaround for this in the codebase, from v3.3.75:
stats parked the legend scrolled to its right edge, precisely so the
current year would be visible. It didn't hold. The workaround is removed
along with its cause — a wrapping legend has no right edge to park at.

The value column reserves its width, so a live scrub doesn't make the whole
row twitch as 100% becomes 45%.

**Two v3.3.75 assertions were revised, not deleted.** The legend had earned
two exceptions for being a sideways scroller: a tab-swipe block and the
scroll-parking above. Both are now unjustified, and the surviving invariant
is sharper — those exceptions exist for, and only for, things that actually
scroll sideways. The tests assert the legend wraps, claims no swipe
exception, needs no parking, AND that `.heatcols`/`.heat`, which genuinely
do scroll, keep theirs.

`test-scrub.js` at 25, `test-sharecard.js` at 70.

## v3.3.108 (2026-07-27) — The scrubber

Press and hold a line chart and a thin guide follows your finger, reading
every curve at that day. The interaction finance apps use — Robinhood,
Apple Stocks — usually called a scrubber or crosshair. Without it these
curves were only legible at their endpoints.

**It costs no new gesture.** `bindZoom` already owns pointers on these
charts, and a single finger did NOTHING at default zoom: panning is gated
on already being zoomed in. So the map is now 1 finger + not zoomed =
scrub, 1 finger + zoomed = pan (unchanged), 2 fingers = pinch (unchanged),
double-tap = reset (unchanged). A second finger dismisses the guide — that
is a zoom, not a read. `[data-zoom]` was already first in the tab-swipe
blocklist and `.zoom` already carries `touch-action:none`, so a horizontal
drag can neither change tabs nor scroll the page.

**One implementation, driven by data-attributes.** The svg declares its own
geometry (`data-scrub`, `data-sx0/sxw/sy0/syh/smax`) and `bindScrub()`
reads values straight off the rendered `<polyline points>` — so it serves
the consistency chart and the distance chart identically, and any future
line chart opts in by declaring six attributes. Charts that don't opt in
grow nothing, asserted.

**The readout reuses what's already on screen.** The legend's values swap
to the scrubbed day and swap back exactly on release; the zoom hint becomes
the date under your finger. Nothing new appears except the guide and its
dots. A year that hasn't reached the scrubbed day shows an en-dash rather
than a fabricated value. The distance legend's total gained a `<b>` so both
legends expose the same element.

**Test-design note.** The first fixture trained every 2 days flat, which
makes cumulative consistency ~50% at EVERY point of the year — so scrubbing
anywhere returned the endpoint value and the suite could not distinguish a
working scrubber from a broken one. It passed anyway. The fixture now runs
each year hot for 100 days then sparse, so the curve genuinely falls: the
assertions read 100% in early February, 46% by mid-December, a dash for the
unreached current year, and exact restoration of the year-end totals on
release. A second assertion was also comparing "restored" against a value
captured AFTER the first press, and so proved nothing; it captures the true
originals first now.

New suite `test-scrub.js`, 20 assertions. Harness at 24 suites.

## v3.3.107 (2026-07-27) — The day figure, one size down

38px borrowed the Stats hero's size without its context: that card owns a
full row, while this one shares with the 21-day strip and a secondary
percentage. 28px keeps it clearly primary without crowding.

The test pins the HIERARCHY rather than the number — the day figure must
outrank the secondary percentage and stay under the 38px `.big` used by the
gap variant (which does own the card alone when it appears). Currently
20 < 28 < 38; a future resize can shift the values but cannot silently
invert the order.

`test-todayhero.js` at 54.

## v3.3.106 (2026-07-27) — Training should not delete the number it moved

The maker on the Rhythm card once a session is done: boring, and a moving
percentage isn't inspiring.

The diagnosis was specific. "Trained today" is a LABEL, and one the strip's
own outlined `today` cell already carries — so the trained state said
nothing new and left its caption slot literally empty
(`<div class="rcap"></div>`). Meanwhile `helloCard()`, the only place Today
shows the day count, renders exclusively in the `!logged` branch. So the
act of training REMOVED the app's north-star number from the screen and
replaced it with a redundant label beside a figure that moves 0.3 points a
day. No wonder it read as static.

Now the trained state leads with the figure that moved *because you showed
up* — the live day total, at flagship size and accent, mirroring the Stats
hero — and the empty caption carries "days in", plus the thousands
countdown when one is close.

**No compliment was added, deliberately.** The doctrine is receipts, not
claims, and the app does not congratulate. Encouragement here means finding
the fact that is genuinely encouraging and showing THAT: the number went up
today, and it went up because of something you did. `test-bw.js`'s
no-exclamation guard still holds over the greeting.

The number ticks over once from yesterday's total — an earned response to a
real event, gated to once per app open so it never becomes a decoration
that replays on every tab switch, and skipped under reduced motion.
`msCountUp()` and the new day counter now share one `countUpEl()`.

`msNearThousand()` is extracted so the greeting and the card cannot drift:
thousands only, inside 75 days, asserted at both boundaries (75 in, 76
out), with the ladder array asserted to exist exactly once.

**A test bug fixed on the way.** The greeting's no-exclamation guard failed
against correct code: it finds string literals by pairing apostrophes, so a
single "can't" in a NEW COMMENT opened a phantom string that swallowed the
code after it, including a legitimate `if(!el)`. The extractor now strips
comments first — the assertion is about what the greeting can say, so it
must read strings only. Re-verified by injecting a real exclamation into
`helloSub` and confirming the guard fires, then restoring.

`test-todayhero.js` at 53, `test-bw.js` at 57.

**Deploy note — third Pages build-drop** (after v3.3.96 and v3.3.100).
`9641ced` landed on main while the previous build was still in flight and
no build was ever enqueued for it. Compounding it, the verify script's
final line printed "PUBLISHED AND VERIFIED" on the strength of the
byte-comparison alone, while the SHA poll had quietly timed out on the
PREVIOUS commit — so a correct-but-unpublished release briefly reported as
shipped. The byte-check answers "are the right bytes at this commit?"; only
the poll answers "did Pages publish it?", and the script must not claim the
second on evidence of the first. Both conditions are now required before
the success line prints.

## v3.3.105 (2026-07-27) — A specificity coin-flip, not a decision

From a screenshot: a large empty gap between the header and the "Rhythm"
heading, once today's session is over.

`h2.quiet` sets `margin-top:24px`. `h2:first-child` sets `margin-top:4px`.
Element+class and element+pseudo-class carry IDENTICAL specificity, so when
both rules match the same element — which Rhythm's heading does, once a
session is sealed and no exercise is live — the winner is whichever rule
was written LATER in the file. `.quiet` happens to appear after
`:first-child`, so it won by coincidence of where it was typed, not by any
design intent. The 24px gap was never a decision; it was a coin-flip that
came up wrong.

Fixed with `h2.quiet:first-child{margin-top:4px}` — a targeted selector
with genuinely HIGHER specificity than either rule alone, so the outcome no
longer depends on source order and can't flip again if the stylesheet gets
reordered later.

**A build note on the test itself.** `renderToday()` has two branches with
different opening markup: before anything's logged, it opens with
`helloCard()+rhythmCard()` and never renders a "Rhythm" heading at all;
after a session is logged AND sealed (`doneAll`), `todayHeroHTML()` is the
only path that ever renders it, and only then is it genuinely `#view`'s
first child. The first two fixture attempts landed in the wrong branch
entirely — once with no history (hit the cold-start empty state), once
with history but nothing logged today (hit the pre-gym branch), once with
today logged but not sealed (hit the LIVE partDigest branch, not Rhythm) —
each testing a heading that particular branch doesn't render. The working
fixture seeds past days, logs and SEALS today's session (`doneAll=true`,
matching `isLive()`'s exact condition), which is what the screenshot's
state actually was.

`test-todayhero.js` at 40.

## v3.3.104 (2026-07-27) — The set you just logged, where you can see it

Reported from a live session: after ~8 sets the Logged Today grid runs past
the fold, so a set you just logged lands somewhere off-screen — the save
flash animates where nobody is looking, and the section reads as
congestion.

The screen was conflating two different needs. **"Did my set land?"** is
immediate and belongs at the point of action. **"What have I done today?"**
is review, and can wait. One long chronological grid served the second
poorly and the first not at all.

**Confirmation moved to the point of action.** Three code paths log a set —
tapping a rep tile, the Add set button, and tapping a Suggested chip. Only
the third one toasted; the other two logged silently. All three now call
one shared `setToast()`, which also fixes a latent bug none of them
handled: a bodyweight set read as "0kg × 20" and now reads "BW × 20". A
toast is visible wherever you happen to be scrolled, which is exactly what
the grid stopped being.

**The list leads with the newest and stays short.** Most recent six,
newest first, with `Show all N` when there are more. Two rows tall no
matter how long the session runs — a shorter section, not a scroll aid for
a long one, consistent with how the jump chips were handled in v3.3.89.

Reversing matches what this same screen already does one card above: the
Suggested row puts your latest set first ("one tap duplicates it"). The
live surface is recency-ordered; chronological review is History's job.

Two things that could have broken quietly and are asserted instead: the
reversal is display-only, so `data-del` still resolves to the true array
index (the first tile now points at the LAST entry — checked); and the
fresh-save animation is matched by set IDENTITY rather than by position,
since the newest set is no longer the last thing rendered.

`test-repweight.js` at 28.

## v3.3.103 (2026-07-26) — The badge, flush; the number and its unit, one word

Two fixes from a screenshot of the Suggested and Logged Today chips.

**The dismiss badge moves to the true corner — flush, not floating.** It
was inset 3px from both edges, which sat it straddling the pill's own 9px
rounded corner: part of the circle over the fill, part over the curved
cutaway where the pill has no fill at all, reading as neither properly
inside nor properly pinned. The first fix attempt reached for the familiar
overhanging notification-badge look (negative top/right) — and buildcheck's
own v3.3.49 guard caught it immediately: `#app` sets `overflow-x:clip`,
which per spec forces `overflow-y` to compute `auto` too, so any negative
offset here risks being shaved at the page edge. That guard exists because
this exact mistake was made twice before, in v3.3.46–48. The correct fix
stays non-negative: the badge sits flush at (0,0). `.lschip` has no
`overflow:hidden` of its own, so a flush badge simply caps the corner's
curve completely — fully pinned, no float, and no clip risk anywhere.

**Logged Today's number and its unit are now one visual word.** "16 kg"
had a gap "16" never had in the Suggested chip's "16kg" because the two
pieces lived in SEPARATE flex children of a `gap:6px` row — the layout gap
was rendering INSIDE what should have read as one label. Fixed by nesting
the unit as `<small>` inside the weight span, the same pattern the
Suggested chip already used correctly. The separator span now carries only
`×`. A bodyweight set, which has no unit, renders no `<small>` at all —
asserted, so an empty tag can't sneak back in.

**A real bug caught by the full regression, not the standalone check.** The
first version of this release's own test used a regex containing HTML
closing tags (`</small>`, `</span>`). The literal slashes inside those tags
collapsed the escaping meant to protect them across the vm bridge — a
failure mode already written into this harness's own notes — and the
regex terminated early, throwing `SyntaxError: Invalid regular expression
flags` instead of failing cleanly. Worse: because a stack-trace crash never
prints the word "FAIL", a hasty standalone check (grep for FAIL, count
PASS) read as clean at 12/12 when the true count was 16 and four
assertions had silently never run. Fixed by switching to `.includes()` for
any check whose content contains a literal `/`, and the regression re-run
now explicitly greps every suite's full output for crash signatures, not
just its exit code.

`test-repweight.js` at 16.

## v3.3.102 (2026-07-26) — The part digest card, ~15% shorter

Requested from a screenshot of the Shoulder · LIVE card on Today. The bar
chart's viewBox drops from 92 to 78 units, the baseline and max-bar height
scaled to match (same proportions, shorter canvas), and the two internal
margins around it tighten by 2px each so the shrink reads through the whole
card, not just the chart. Every day-part page that renders this card —
Today's live digest, History's part filter — gets it for free; there is
only one `partDigestCard()`.

**A pre-existing, unrelated test bug was found and fixed along the way.**
Full regression turned up a failure in `test-statspolish.js` that also
failed against YESTERDAY's build — confirming it had nothing to do with
today's change. Its weekday-distribution fixture hardcoded "Monday is the
strongest day, today is a Wednesday," true when the test was written and
false the day this suite happened to run on an actual Monday: the fixture's
designated strongest day collided with today's real weekday on the
calendar, and the guard it existed to prove ("the caret and the accent bar
are never the same bar") failed for a reason that had nothing to do with
the app. Fixed to compute the strongest day three weekdays off from
whatever today actually is, so the fixture can never again collide with
its own run date. A quiet reminder that hardcoded dates in fixtures are
themselves a kind of technical debt with a fuse.

`test-histpart.js` at 25, `test-statspolish.js` at 26.

## v3.3.101 (2026-07-26) — One root cause, two marks

From a screenshot: dead space at the top of the Days hero, and dead space
under the year and month cards, with the comeback line crossed out on the
streak card. Two fixes, one of them upstream of the other.

**The comeback line is removed from the Stats card.** It was the tallest
content in the 3-up row — label wrapping plus the comeback text pushed that
cell to four visual lines against three for its neighbours — and CSS grid
stretches every cell in a row to match the tallest. The empty space the
maker circled under 62% and 65% was that stretch, not their own padding;
removing the taller sibling's content closed both gaps in one change.

`comebacks()` itself is untouched: still correct, still tested, now with
zero callers. Not dead code in the harmful sense (v3.3.89's removed jump-chip
handler, which explained nothing and nothing used) — a working derivation
kept on purpose, same shape as `fireDist()` in today.js. Flagged honestly
rather than silently orphaned; whether it resurfaces elsewhere is open.

**The hero's top gap was a real CSS bug, unrelated to the comeback removal.**
`align-items:baseline` measured "928"'s own text baseline against the FIRST
LINE of the two-line label span beside it, leaving a gap above the label
equal to the number's ascent overshoot. Changed to `center`.

A test-design note against the harness's own limits: a first assertion
checked that all three compact cards have equal CHILD COUNT, on the theory
that this was the mechanism. It wasn't — the actual gap came from text
WRAPPING, which jsdom cannot measure without real layout, and the three
cards had equal child counts even in the broken screenshot. The assertion
tested the wrong invariant and was removed with the reasoning left in place
rather than kept as a green that meant nothing.

`test-comeback.js` at 15, `test-statspolish.js` at 26.

## v3.3.100 (2026-07-26) — Hierarchy by width: the hero row

One release after Days joined the KPIs, the maker's screenshot showed the
2×2 grid making it merely first-among-equals. Requested: clear hierarchy,
minimal height.

**Row one is the game:** 928 full-width, number left and words right on one
baseline, so the hero costs ~70px. **Row two is everything derived:** of
2026 · of Jul · streak, three-up.

The compaction pass that makes 3-up fit is subtraction, not shrinkage:
- ", trained" dropped from the percentage labels — the section heading
  already names the game, and no compact card repeats it (asserted).
- "pts" and "today" dropped from the deltas: "+15 vs 2025" carries the
  same receipt.
- July → Jul; "(day 26)" dropped — same-day comparison is the card's
  premise, not information.
- The comeback line compacts to "8 comebacks · 35d" — "longest break:"
  was label, not information. Its v3.3.97 assertion was updated with a
  dated note, deliberately, not silently.

The obsolete 2-col span rule (.kpi:nth-child(3):last-child) went with the
restructure; the hero owns its type size by class now rather than by
position.

`test-statspolish.js` at 25; `test-comeback.js` at 16.

**Deploy note.** Second occurrence of the Pages build-drop (first: v3.3.96):
`0baea88` landed on main while the previous commit's build was in flight,
and no build was ever enqueued for it — latest stayed `built adff02a`
through two full polling windows. Same remedy, this commit. Pattern worth
naming now that it has repeated: pushing while a Pages build is running
risks the trigger being swallowed; the ritual's answer is unchanged — poll
for `built <exact-sha>` and never claim shipped until it appears.

## v3.3.99 (2026-07-26) — The game itself, finally under its own heading

Spotted by the maker from a screenshot: the Stats section titled "Show up —
that's the whole game" contained the year percentage, the month percentage,
the streak — every number EXCEPT the game. Total days lived in the greeting,
in Settings, behind the grid, and nowhere under the heading that names it.

Now it leads. First KPI card: **928 · days of showing up**, with the
lifetime pace as its caption — "55% of all days since Dec 2021" — the
truest denominator the app has, straight from the longevity brainstorm. The
value is msLiveTotal(), the same live-total rule the month grid uses, so
logging today's first set moves both together; asserted equal.

One accent per section: the flagship carries it, and the year/streak cards
drop to chalk — they are derived from this number and now read like it. The
existing :first-child rule hands Days the 38px type automatically, and with
four cards the July card stops spanning and the block settles into a 2×2.

The lifetime span honours the unwritten-today rule (v3.3.95) in its
denominator, so the pace never dips a point at breakfast.

One test-design note repeated from earlier suites: a parity check compared
fresh arithmetic against a DOM left one derive behind by the previous
assertion — re-render before comparing. Stale-fixture bugs remain the
harness's most common failure.

`test-statspolish.js` at 19.

## v3.3.98 (2026-07-26) — Milestones: celebrations that pop, with nothing on the hook

The ladder: 10 · 20 · 30 · 50 · 100 · 200 · 300 · 500 · 1,000, then every
100 ("500 is too big, man" — the maker; ~two a year at a most-days cadence).
It celebrates TOTALS, never streaks: a total is irreversible, so celebrating
it threatens nothing. Streak milestones are where engagement bait lives — a
celebrated thing that can die is a hook. Comebacks stay uncelebrated for the
mirror reason: honouring a lapse-and-return with fanfare would incentivise
the lapse.

The maker's ruling on tone, adopted: fun is not the same as farming, and
celebrations should POP — big, bold, statements. The implementation makes
them pop by TYPE, MOTION, and the record itself, not by punctuation (no
milestone line contains an exclamation mark — asserted) and not by confetti.

**The moment.** Top of Today, that day only: DAY over the number in 76px
mono, counting up from the previous rung (~1.6s ease-out, reduced-motion →
static), one dry line ("A month of days. Most quit here — you didn't."),
Share as image, and Carry on.

**The thousand tier is bigger, as directed:** accent-flooded card, 92px
white number, and the spectacle is the user's own record — every month
they've ever trained cascades in square by square before the number lands.
The fireworks are the receipts.

**The anti-bait rules, each an assertion:**
- High-water floor at first run — no retroactive fireworks. The founder's
  first moment will be day 1,000 (≈ Oct 5), not a backlog of nine.
- A restored/imported archive initialises its floor to its own total and
  fires nothing — migration is honoured, never celebrated. Asserted through
  Restore's own adoption shape.
- Once per rung, acknowledgement synced in settings.
- Several rungs crossed at once (bulk past-edits) → ONE moment, the
  largest. A queue of celebrations is a slot machine.
- Dismissal is one tap and permanent; no "remind me later" exists. Sharing
  does not dismiss.
- Never in Lift — the gym is for the gym. Never a sound, notification, or
  badge; nothing exists that can fire while the app is closed.
- The greeting's countdown stays thousands-only — "3 more to day 10" never
  exists; anticipation-farming is the mechanism, not the size.

**The line in History** (maker's call): milestone days state their ordinal
— "Day 500 · Back, Legs" — derived at render from the day's position in
the sorted record, so every PAST milestone is marked too, including ones
that predate the feature. The celebration is once; the fact is forever.

**Share card:** DAY N huge over the faded all-time month grid, 1080×1080,
same family, URL footer. User-initiated sharing is the only distribution
this feature does.

Build notes: drawMilestone first borrowed V() from an enclosing scope that
doesn't exist — every drawer in report.js defines its own; it does now too.
One test fixture failed against its own arithmetic (106 seeded days claimed
to cross 300) — the fixture was corrected, not the code.

New suite `test-milestone.js`, 24 assertions. Harness at 23 suites.

## v3.3.97 (2026-07-26) — Comebacks: the longevity twin of the streak

Born from a brainstorm about bringing longevity into the app without
predicting anything. A horizon/life-expectancy card was designed, argued,
and scrapped by the maker — the app renders receipts, and a death date is a
claim. What survived the scrap is the observation that longevity is already
IN the data: a streak measures never stopping, but a practice that lasts
years is made of RETURNING. The record contains every gap ever survived;
nothing was counting them.

`comebacks()` counts them. Five lines were agreed before code, each now an
assertion:

1. **A comeback = training again after 7+ days away.** Fixed threshold — an
   adaptive one was rejected as unexplainable in a 120-char tip. The test's
   cadence case is the important one: a normal 6-day part rotation yields
   ZERO, because scheduling is not returning. Boundary asserted exactly: 6
   days away is nothing, 7 is a comeback.
2. **Declared rest days are invisible to gaps.** A 🍃 interrupting a gap
   would be comeback insurance — the corruption the rest doctrine's first
   line forbids, extended to a new number. Holds by construction
   (workoutDates() contains only trained days); proven by test anyway.
3. **Only closed gaps count.** The open gap you are in is not a comeback in
   progress; rendering it would be a nudge in a costume.
4. **Every return counts, sticky or not.** Requiring returns to last would
   turn a count into a grade. Depth is carried by the companion figure,
   longest break returned from.
5. **Zero renders as nothing.** The line appears with the first comeback —
   absence is shown by absence.

Renders as a second caption on the streak KPI in Stats: `34 comebacks ·
longest break: 11d` under `day streak · best N`. One card holding both
philosophies — never stopping and always returning — as equals is the
message. No colour, no animation, never in Today.

Honest note recorded at spec time: with a most-days cadence this number is
likely near zero for the founder's own archive. It is the first feature
built for the Phase-1 users — whose records will be gap-riddled — rather
than for the maker, and a gap-riddled record that still counts 34 returns
is exactly the sustainability argument the app exists to make.

Derived at read time like everything else: filling an old gap by past-day
edit dissolves its comeback, asserted. New suite `test-comeback.js`, 16
assertions. Harness at 22 suites.

## v3.3.96 (2026-07-26) — System / Light / Dark

Three preferences resolving to two themes. The Display card's two-state
toggle becomes a segmented control matching the M/F idiom already used in
the You card.

**System means system, continuously.** Resolving the OS preference once at
boot would leave the app in yesterday's theme when a phone flips at sunset,
so a `prefers-color-scheme` listener is attached (once, guarded) and
re-applies on change. Asserted with a fake media query that can be flipped
mid-test: on 'system' the applied theme follows; on an explicit preference
it does not.

**The anti-flash contract is the fragile part.** `index.html` paints from
`localStorage['showup-theme']` before any script runs. That key must
therefore hold a RESOLVED theme — writing 'system' into it would put the
literal string on `documentElement.dataset.theme` on the first frame and
reintroduce the flash this app removed long ago. Three assertions guard it:
the key is never 'system', it always holds light or dark, and it tracks the
resolution across an OS flip. A fourth asserts index.html still reads that
key with a dark fallback.

**`theme-color` now follows too** (#F2F3F6 light / #0C0E13 dark). It had been
pinned to the dark ground since it was written, so the installed app's status
bar never matched the light theme.

**Back-compat is exact.** Anything not 'system' or 'light' still resolves
dark — tested against 'dark', undefined, null, '' and a junk value — and a
legacy 'dark' blob lights the Dark segment rather than leaving all three
blank. New installs seed `theme:'system'`; the seed only applies when no
saved settings exist, so nobody's current choice moves.

A harness note: the settings screen's view name is `'sync'`, not
`'settings'` — historical. A fixture using the wrong name renders fine
through `renderSync()` but makes the handler's `render()` throw on an
unknown view, which is how this was found.

New suite `test-theme.js`, 26 assertions. Harness at 21 suites.

**Deploy note.** The first push of this release (`a8d01ad`) landed on main
with correct bytes but GitHub Pages never enqueued a build for it — the
build record one second later reported `built` against the PREVIOUS commit.
Pages drops a trigger occasionally; the fine-grained PAT cannot request one
(403, no `pages` scope), so a follow-up commit is the remedy. Two ritual
lessons: poll for `built <expected-sha>`, never for `built` alone — the
loop exited satisfied on a stale record — and treat "content correct at the
commit" and "content published" as two separate checks, because they can
disagree.

## v3.3.95 (2026-07-26) — One fraction, one denominator

**Reported from a screenshot: the KPI card said 62%, the chart beacon and its
legend said 61%. Same fact, same screen, two numbers.**

Root cause. The app has a rule — *an unwritten today does not count against
you; you have not missed it until midnight* — expressed as
`elapsed = doy(today) - (trainedToday ? 0 : 1)`. That line was written twice,
in `header.js` and `stats.js`. `yearCurves()`, which draws the chart, had
never heard of it and always divided by `doy(today)`.

So on any day with nothing logged yet: 127 trained days became 127/206 in the
KPI and 127/207 in the chart. 61.65% and 61.35%. They round to 62 and 61.

The bug was equally present the day before and every unwritten day before
that — rounding simply landed both on the same integer. It became visible
only when the two fractions straddled a boundary, which is the worst kind of
arithmetic bug: correct-looking for months, then wrong with no change to the
code that broke it.

**Fix:** `elapsedDays()` in util.js, called by all three. Not two agreeing
implementations — one implementation. Reproduced before the fix at day 207
with 127 trained (62% vs 61%) and verified after (62% vs 62%).

`runYearCurves()` shares the same `end` line and is deliberately untouched:
cumulative distance has no denominator, so there was nothing to disagree
about. The first patch attempt aborted on that ambiguity — the anchor matched
both functions — and the all-or-nothing patch guard meant nothing was written
rather than the wrong function edited.

**Tests:** the two values are asserted equal across twelve differently-shaped
years, plus equal after rounding, plus source-level guards that
`elapsedDays()` is defined once and that no file open-codes the rule again.

A test-design correction worth recording: the property assertion first
demanded bit-identical float64 and failed 11 of 12 — on a 4e-9 difference,
with the code already correct. The curve is stored in a `Float32Array`; the
comparison now runs through `Math.fround()`. Match the storage, not the
ideal.

`test-statspolish.js` at 13.

## v3.3.94 (2026-07-25) — Settings stops explaining itself

Four passages cut from Settings, measured the way v3.3.71 measured the tips:
longest note 272 → 158 chars, total prose 1,395 → 1,025.

What went, and why each was written for an audience of one:
- The LWW essay — "the newest edit of each day wins everywhere, so deletions
  travel too. Every change pushes ~1s later, and pull-to-refresh
  force-pushes before reloading." Correct, and a description of the
  implementation. A stranger needs to know sync happens, not how conflicts
  resolve.
- "lives in doc.days as the single source of truth (v3.0)" — an internal
  key and a version number, in the UI.
- **The database host.** `Database: https://….supabase.co` sat in the
  settings card and therefore in every screenshot ever taken of it. Not a
  secret, but it is infrastructure on a user's screen, and it travels
  further than intended. A test now asserts the string `supabase` appears
  nowhere in the rendered app.
- "Last change recorded …" (already shown on the Stats weight card), plus
  the sentences explaining that bodyweight feeds Pull Up and Dip, and that
  Sex is stored for a future release and unused today. Explaining an unused
  field is worse than the field.

What survives is what a stranger needs: sync happens, this is what you own,
this is when it last synced, and the one genuinely non-obvious rule —
*silence means unchanged*.

Nine phrases are asserted absent and four asserted present. A test-design
note: the three survival checks first “failed” because the account card only
renders when signed in — they would have been meaningless run against a
signed-out fixture, where the negative checks pass by absence and prove
nothing. They now sign in first, and two of the negative checks are re-run
against the signed-in card for the same reason.

`test-settings.js` at 30.

## v3.3.93 (2026-07-25) — Knowing who uses it, without becoming what we're not

The question was how to tell whether a hand-recruited tester actually uses
the app. The answer required no app change at all, and that is the point.

`app_state` already holds one row per signed-in user: the whole archive plus
a sync timestamp. `auth.users` already holds signup and last-sign-in. Every
retention question is a query against data the user chose to sync. Shipping
analytics INTO an app whose pitch is that it is not an engagement business
would have been the wrong trade for information already sitting in the
backend.

**`tools/beta_status.py`** — an operator tool, like the converters. Reads
Supabase with the service key, prints one line per tester.

**The metric it exists for:** days logged ON OR AFTER signup. You cannot
import a day that had not happened yet, so any day dated after the account
existed was logged by that person, in the app, deliberately. An imported
archive can be 900 days long and prove nothing:

    archive 928 / own 0   → they looked at their history and left
    archive 928 / own 11  → the product replaced their old habit

The fixture encodes the four testers the founder will actually meet — the
migrant who stayed, the migrant who bounced, the from-zero starter, and the
person who signed in and never logged. The bounced migrant is the failure
mode the Phase-1 gate exists to catch, and no other number reveals it.

Also derived: the roadmap's week-two gate (days logged 8–14 days after
signup), 7/14/30-day activity, declared rest days, and last sync.

**Restraint, asserted rather than promised.** The tool never reads `ex`,
`reps`, or `part` — the test greps its own source to prove it — and prints
the disclosure in its own output. A second assertion sweeps every app file
for `sendBeacon`, `gtag`, `analytics`, `mixpanel`, `posthog`, `amplitude`
and requires all of them absent, so a future release cannot quietly add
telemetry while this tool exists.

**Tell the testers.** They are people you recruited by hand: “I can see when
your app last synced and how many days you've logged — not what you lifted,
because I won't look.” Then don't look.

New suite `test-beta.js`, 27 assertions. Harness at 20 suites.

## v3.3.92 (2026-07-25) — The colour audit: ink and wash part ways

Implementation report for the colour-system spec (v2.0), per its §16
format. Governing decisions confirmed with the maker first: NO blue default
header (rejected — it violates the spec's own quiet-between-events law and
would dilute red/green); canonical hues preserved (no cosmetic recolor);
YEAR_COLORS kept as a validated exception; existing token vocabulary kept,
missing tokens only.

**The audit.** Every load-bearing token pair was computed against WCAG in
both themes. Dark theme: one real failure. Light theme: five. The worst was
structural, not cosmetic: `--rest` — a wash-grade colour — was also serving
as the rest chip's TEXT, scoring 1.69:1 (dark) and 1.58:1 (light) against
its own wash. A background grade cannot moonlight as an ink.

**Changes:**
- `--rest-ink` (#8DB596 dark / #3B5742 light): rest as text, same hue,
  text grade. The chip writes in it now. One-meaning discipline extends to
  the ink — asserted.
- Light `--muted` #6B7080→#626776 (was 4.10:1 on surface2) and light
  `--faint` #9AA0AE→#8C929E (was 2.62:1) — darkened along their own hue.
- `--chart-soft` (#616EA3 dark / #7F859F light): 2025's year line.
  `--accent-soft` is a background grade and scored 2.10:1 / 1.58:1 as a
  chart stroke; the new token is the same family at stroke grade.
  accent-soft itself is untouched everywhere it serves as a background.
- Keyboard focus is visible app-wide: `:focus-visible` outlines in accent,
  2px, offset 2. Touch behaviour unaffected — the pseudo-class only fires
  for keyboard/AT navigation. This was the app's largest accessibility gap.

**The guard.** buildcheck gains its eighth structural check: it parses both
theme blocks and COMPUTES the contrast of every audited pair, including
rest-ink against the 52% wash it actually sits on. The WCAG floor is
arithmetic, so it is now a build failure, not a hope. Verified by breaking
it.

**Remaining raw hexes, and why:** `#fff` on accent/live/record controls is
the *-on convention (computed white-on-live = 5.09/5.69, passing); the
share-overlay chrome (#16181D) is theme-independent by design; onboarding
gradients predate the token layer and sit outside data surfaces.

**Conflicts found between spec and product, resolved:** blue default header
(rejected above); §11.3's no-categorical-palette vs YEAR_COLORS — the ramp
is blue+neutrals with direct end-labels, weight redundancy, and stable
year identity; documented in DESIGN.md as a validated exception that
licenses nothing else; the spec's `[data-theme="dark"]` blocks fold into
`:root` because dark is this app's default; "one file" is actually eleven
plus the stylesheet — the audit covered all of them.

`test-rest.js` at 55, `test-sharecard.js` at 68, buildcheck at 8 guards.

## v3.3.91 (2026-07-25) — Rest is a frame, not a repaint

**v3.3.90's green numbers are reverted after one release.** Seen in daylight,
"5d" and "62%" in green read as a different *kind* of data rather than the
same data on a rest day — the figures are the app's voice and the voice
shouldn't change with the weather. They are accent again, permanently.

The state moved to the **frame**: the Rhythm card takes a green border and a
1px green halo while the leaf is up. Same information, stated around the
data instead of through it. Today's pending cell in the strip keeps its
green edge — that one is a border too, and it marks a real declared rest.

Trial-and-revert, one release apart, recorded rather than quietly dropped.
What survives from v3.3.90 is the rule it established, which the revert did
not touch: colour may describe today; it may never repaint the record.

**The breath got wider, not faster.** 48→36 was a 12-point swing on a
translucent layer — too small to read as motion on a phone. It is 52→28
now, 24 points, on both the solid and frosted branches. The 7-second tempo
is unchanged, and the test asserts both: amplitude ≥20 points AND tempo
≥6.4s, so nobody can make it visible later by speeding it into a pulse.
Live pulses; rest breathes.

`test-rest.js` at 53.

## v3.3.90 (2026-07-25) — The rest state gets loud enough to mean it

**The wash was too polite.** 28% over the ground barely registered on a
phone in daylight. It is 48% now, breathing to 36%, with a firmer border.
LIVE remains louder at 92% — asserted, not assumed, because the ratio
between the two states is the whole point: live must never whisper, rest
may.

**The Rhythm card follows the day.** While the leaf is up, "5d" and "62%"
wear the rest green, and today's pending cell in the 21-day strip takes a
green dashed border instead of grey.

**What deliberately does NOT turn green: the filled cells of the strip.**
Those mark days you trained. Painting them green would say those days were
rest days — a false statement about the record. Today's cell changes
because today genuinely is a declared rest; the previous twenty do not.

This narrows a rule rather than breaking one. v3.3.81 asserted the hero
card took no rest colour at all, on "facts don't take moods". That
assertion failed this build, and the honest response was to revise it
rather than delete it. The surviving rule is sharper: **colour may describe
today; it may never repaint the record.** Card backgrounds are still never
tinted, and the test now checks exactly that — no `background` property in
any `.rhythm.resting` rule.

DESIGN.md carries the refined boundary.

One authoring note: `.rhythm .big.ok` already sets accent, so the rest rule
is written with equal-or-higher specificity AND placed after it. The test
asserts the source ORDER of the two rules — the `.chip.on` /
`.chip.on.livego` lesson from v3.3.50, applied before it could bite.

`test-rest.js` at 50.

## v3.3.89 (2026-07-25) — One painter, two charts; the jump chips go

**The distance chart ships as a share card.** "Share as image" now sits under
Run → Year over year, matching the consistency chart.

It reuses `drawYoy()` rather than adding a second renderer. The two charts
differ only in scale and wording — percent vs distance — so the painter is
parameterised (`fmtAxis`, `fmtBig`, `kicker`, `sub`, `footer`, `yMax`,
`ticks`) and there is still exactly one of it. Duplicating 250 lines of
canvas for a unit change is precisely the drift `resealDay()`, `foldSets()`,
`gridData()` and `mgAlpha()` were each extracted to stop.

`runYearCurves()` joins them: the SVG in `runStatsHTML()` and the share card
now read one cumulative-distance source instead of computing it twice. The
test asserts both call it and that only one `drawYoy` exists.

**The jump chips are gone.** DAYS / PARTS / RUN / RECORDS was a table of
contents duplicating the section headings directly below it — the same
duplication argument that removed the year-vs-year block from Today
(v3.3.83) and the Readiness board (v3.3.86). It also sat above the fold on
the app's most data-rich screen, so the first thing Stats showed was
navigation rather than a number. The accent section headers are strong
scroll anchors and the app-wide "↑ top" button already covers get-me-back.

The `[data-jump]` click handler and the `.jumps` CSS went with them —
nothing emitted them any more, and unread logic is the degenerate case of
the same-logic-in-two-places problem.

**Honest cost:** Stats is the longest screen in the app, and this removes
its only wayfinding. If scrolling past four sections to reach Records
becomes annoying in real use, the answer is a shorter Stats page, not the
chips back.

`test-sharecard.js` at 66 — including a regression guard that the
consistency card kept its percent axis, percent headline and own kicker
through the generalisation.

## v3.3.88 (2026-07-25) — The import pipeline: Strong and Hevy walk in

The research settled the strategy: Strong's CSV is the de-facto interchange
format (Hevy imports it; other tools convert INTO it), Hevy's header is
documented and stable, and the incumbents have two public weaknesses —
Strong cannot re-import its own export, and Hevy permits one import per
account. ShowUp's Backup JSON already round-trips, so the converters
translate into the format the app already accepts. No new import surface;
Restore IS the importer.

New in `tools/`:
- `convert_strong.py` — sniffs comma/semicolon, reads the unit out of the
  weight HEADER ('Weight (kg)' vs '(lbs)'), warm-up markers, cardio rows
  → Run entries.
- `convert_hevy.py` — both start_time formats ('22 Dec 2025, 08:00' and
  ISO), weight_kg with weight_lbs fallback, set_type, distance/duration →
  Run. rpe and superset_id are dropped and REPORTED dropped — pretending
  to import fields the app doesn't store would be a lie.
- `import_validate.py` — preflight where every check is a scar with a
  version number: reps:[] marker rows (v3.3.61), missing upd stamps,
  insane weights, future days, bodyweight range, duplicate-explosion days.
- `importlib_showup.py` — the policy in one place: one row = one set,
  kg canonical, warm-ups count (days>volume), zero-content rows are
  skipped and named, and UNKNOWN exercise names STOP the run and write
  mapping_todo.json for the operator. A guessed body part is a corrupted
  archive; the converter refuses to guess.

`test-import.js` runs the REAL python on fixture CSVs, restores the output
through Restore's own adoption logic, and asserts what deriveAll()
concludes: day counts, kg fidelity, part mappings, the run's minutes, the
skipped rows' absence, and — the closing move — that the app's own Backup
validates --strict, so the round trip is a circle.

The suite also caught its own false PASS on the way in: a relative tools
path under cwd:/tmp made python exit 2 for "can't open file", which
coincidentally matched the converter's bail code. The assertion now
requires the UNMAPPED message, not just the number. Exit codes are not
semantics.

One product change rode along: settings.js's click router used
`e.target.id===` — the v3.3.58 pattern — on the Backup/Restore buttons the
entire pipeline funnels through. It asks closest() now, asserted at the
source.

Concierge protocol for the first migrations: victim's file → converter →
mapping_todo round-trip with them → validate --strict → they Restore.
Every confirmed mapping accretes into EXACT for the next person.

## v3.3.87 (2026-07-25) — Absence is shown by absence

The "· today" section on the Lift part view rendered before it had anything
to say: a header, then a card reading "Nothing logged for Shoulder today.
Pick an exercise below." A whole section whose only content was that it had
no content — an anti-receipt — with an instruction that instructed the
obvious, since the Go-To list sits directly under it.

The section — header included — now appears with the first set and not
before. This is the greeting rule and the rest doctrine generalized: states
appear when they exist and are not narrated when they don't.

Asserted in test-continue: header absent with no sets, the old copy gone
from the app entirely, the section appearing on the first set, and
appearing only for the part that has sets. One harness note: this suite's
`expect()` is JSON-shaped for the continue-flow checks, so the new
assertions carry their own boolean helper — third idiom mismatch of the
day, each caught by the run, none by the eye.

## v3.3.86 (2026-07-25) — Two invisible lines, and Readiness leaves Today

**The alignment.** 5d and 62% were two stacked columns aligned at their
tops, and a 38px number's top is not a 20px number's top's equal — the
annotation's two invisible lines drifted. The head is now a 2×2 grid with
`align-items:baseline`: both numbers on one baseline, both captions on one
row. The grid shape is invariant across every variant — the trained-today
lead keeps the year percentage beside it (the first cut of this patch
dropped it silently; the harness caught the regression before it shipped)
— and the test asserts the cell order and the baseline rule itself.

**Readiness leaves Today.** v3.3.85's disclosure lasted one release, and
the reasoning that killed it is the same reasoning that created it, taken
one step further: the Lift tab's part list IS the readiness board. A
collapsed copy of a whole tab is still a copy. Today keeps a door —
"Train other parts · N due →" — that lands on Lift with the tab bar
following. The due count survives as the door's one receipt.

Trial-and-revert, recorded as ever: 85 collapsed it, 86 removed it, and
the test lineage says so. The `readyOpen` setting is orphaned but harmless
in existing stores; nothing reads it.

`test-todayhero.js` at 37 — board absent, door present and labelled, due
receipt agreeing with trainingPlan(), the door landing on Lift, grid cell
order num,num,cap,cap, and the baseline rule in the CSS.

## v3.3.85 (2026-07-25) — Readiness becomes a disclosure

Train Next and Readiness were the same cadence data twice: Train Next is the
answer ("Shoulder · 4d since · usually every 6d"), the per-part bars are the
working-out. Working-out lives behind a tap — that is D1, applied one
section further down than v3.3.83 applied it.

Readiness now renders as its header alone, collapsed by default. Tap to
open; the preference persists in settings (auto-stamped, synced). The i
still explains, and tapping it does NOT toggle the disclosure — guarded and
asserted. The header keeps exactly one receipt: "· N due", accent, shown
only when something is waiting — a glance still answers whether to look.

Demoted, not deleted: every bar, every tap-to-start row is one tap away,
unchanged.

The due-count test earned a design note: hand-picking "due" parts from
outside is fragile because trainingPlan() derives mains from history depth,
so the assertion is self-consistent instead — open the board, count the due
bars the app itself drew, collapse, and require the header's receipt to
equal that count, including the zero case where the receipt must be absent.

`test-todayhero.js` at 38.

## v3.3.84 (2026-07-25) — Two numbers, two captions, one strip

The Rhythm card settles into its minimal shape: 5d and 62% share the top
line, "streak · today unwritten" and "of 2026" share the caption line
beneath, then the strip, dated on the right only. "3 weeks ago" captioned a
length the strip already shows; "of" returned because "62% · 2026" read as
two facts instead of one.

The lead's other variants keep the shape: a gap day shows the gap count
over its caption; a trained day shows "Trained today" alone.

The symmetry is asserted — caption under the number as a sibling DIV, the
anchor phrase, the strip's single date — with the streak-variant check made
self-contained because the fixture at that point has trained today, whose
lead is caption-less by design.

Two test stumbles, both prior lessons re-stepped-in and re-recorded: a `\/`
inside a template-literal expression collapsed before the vm saw it (the
v3.3.68 rule — indexOf for literal markup — now applied where it was first
written down), and an assertion assumed a fixture state it wasn't in.

## v3.3.83 (2026-07-25) — Today gets minimal: the first outside feedback lands

Someone other than the maker looked at Today and said "too complicated."
That is the app's first external design signal, and it outranks internal
taste in both directions.

The cut is exactly the duplicated half of the Rhythm card. The year-vs-year
block — bars, percentages, the +N points delta, trained/rested counts — is
the Stats Report Card nearly verbatim; Today was carrying a second copy of
Stats above the fold. And "N rest days in the last 21" captioned a strip
that is already visible directly below it. Today answers *what now*; Stats
answers *how's it going*.

What stays: the streak lead, the 21-day strip with its two date labels, and
the year percentage — which keeps a one-word anchor ("2026") because a
naked 62% is its own kind of complicated. The full label and the comparison
still live one tab away, where they always also lived.

Lineage matters here and is recorded in the test: v3.3.52 tried a chart in
this block and v3.3.53 reverted to the bars — that was a FORM question
(chart vs bars), answered by the maker. v3.3.83 is a PRESENCE question (on
Today at all), answered by the first stranger. The assertion that guarded
the bars back in now guards their absence, with last-year data seeded so
the absence is proven against data, not against emptiness.

rhythm() still computes everything it did — Stats consumes it; Today just
stopped repeating it.

## v3.3.82 (2026-07-25) — The resting header breathes

The green wash now dims to 19% and back over ~7 seconds — a resting breath.
The live pulse is 1.6s and sharp; rest is more than four times slower and
never sharp, and the test enforces the ratio, not just the presence. Border
stays still: only the air moves.

Implementation notes that mattered: background keyframes on the header
itself, no pseudo-element overlay — the `fill-mode:both` stacking-context
trap is why nothing position-absolute goes near the header. Two keyframe
blocks, solid and frosted, because the two branches paint different
backgrounds. And the `prefers-reduced-motion` kill is placed AFTER the
`@supports` frost branch in document order — equal specificity means later
wins, so a kill placed before the frost rule would silently lose the
cascade exactly where backdrop-filter works. The test asserts the document
ORDER of the kill, not merely its existence.

Two assertion regexes needed repair on the way: keyframe stop selectors
(`50%`) legitimately carry `var(--rest)` without saying "rest", so the
one-meaning scan now strips restbreathe blocks before judging the rest; and
the transform/opacity check now parses balanced keyframe blocks instead of
lazily running past a closing brace into unrelated rules.

`test-rest.js` at 41.

## v3.3.81 (2026-07-25) — Green becomes a word: the resting header

The ask was to tint the hero card green on a declared rest day. Declined for
the hero, granted for the header, and the distinction is the release:

**The hero card is the receipts surface.** Streak, 62%, the year bars — none
of those facts change when rest is declared, and tinting a container of
numbers paints a mood onto data. Facts don't take moods. (It would also have
broken the v3.3.79 scope: the flag renders in the header only.)

**The header already speaks in colour.** LIVE turns it 92% solid red — the
app's most global signal that today is burning. Declared rest is the exact
mirror state and now takes the mirror treatment: `header.resting`, a 28%
wash of the palette's new and only green. Live must never whisper; rest may.

This is a **promotion, not a decoration**: `--rest` joins `--record` and
`--live` as a semantic colour with exactly one meaning, defined in both
themes, and DESIGN.md gains the line beside the red one — *Green = declared
rest, and nothing else.* The chip's text joins it (v3.3.80's muted was the
right instinct against decorative green; a semantic green supersedes it).

The discipline is asserted, not promised: the test extracts every CSS rule
that touches `var(--rest)` and requires every selector to be a rest rule —
one colour, one meaning, nowhere else, enforced the way the tip-length cap
is. Plus: the header wears `.resting` only while the leaf is up, sheds it
when a set lands, never holds it and `.live` at once, and the hero card
carries no rest class at all.

`test-rest.js` at 35.

## v3.3.80 (2026-07-25) — The leaf sheds the fire's red

v3.3.79 shipped the rest chip red, and the first gym screenshot caught it.
Root cause: the chip's BASE rule is `color:var(--record)` — the fire earns
red permanently, not only via `.atrisk`, and removing `.atrisk` in the rest
branch left the base rule standing. jsdom sees no colour; the eighth
first-screenshot-only bug of this line of work.

Fixed as doctrine, not taste: **red is LIVE only**, and a declared rest day
is the least live state the app has. The chip now wears `.restchip` —
muted text — in the rest branch and sheds it in the fire branch.

Green text was proposed and declined with reasons: the leaf emoji already
carries the green, doubling it in text makes rest a celebrated state (one
step down the gamified-rest road refused in v3.3.79), and a one-off colour
used by a single chip is how a palette rots. Rest is absence; the text
recedes. It is one variable to flip if living with muted says otherwise.

`test-rest.js` at 28 — the class flips on in the rest branch, off in the
fire branch, and the rule itself is asserted muted with no red variable and
no green literal in it.

## v3.3.79 (2026-07-25) — The declared rest day

A Rest day button in Today, agreed line by line before a byte was written:

**One — it never touches the streak math.** Declaring rest changes what today
means, not what tomorrow counts. The fire still resets; the 928 stays a
receipt with no forgiveness in it. Self-administered streak insurance is the
trap this feature was most at risk of becoming, and the honest limit was
stated and accepted before build.

**Two — undeclared rest stays first-class.** The flag exists in no derived
total; declared and undeclared rest produce byte-identical numbers, and the
test asserts exactly that. 928 days of undeclared history lose nothing.

**Three — training always wins.** The first set clears the flag, structurally:
in save(), the one gate every mutation passes through, not at the six
set-push call sites (the v3.3.45 lesson). A weigh-in save leaves a declared
rest day standing — you can weigh yourself while resting.

**Four — the app never asks.** No prompt exists; the suite greps the string
literals for question-shaped phrases and finds none.

The symbol is 🍃, proposed over the drafted 🌙 and adopted for a real
reason: the moon says sleep; the leaf says growth, and growth is what a rest
day physiologically is. Fire is the burn, leaf is the regrowth. The chip
reads '🍃 rest' where the fire sits, the at-risk pulse stands down on the
chip only — the hero keeps its unchanged 'ends at midnight', because the
chip states a decision, not a promise.

Scope held deliberately small: today-only (no retroactive declaring), and
the flag stores from day one but renders only in the header — data outlives
UI, so if the leaf earns a place in History later, the record will already
be there. `rest:true` rides the per-day LWW exactly as `bw` does.

New suite `test-rest.js`, 25 assertions — the four lines, the toggle, the
chip, the sync carry, and that the declared state borrows no red. Two test
lessons re-learned: freeze RISK_HOUR against the wall clock (sessfmt again),
and never grep for `rest?` — it matches the ternary operator, not a
question.

## v3.3.78 (2026-07-25) — Page zoom off where the app is installed, chart zoom untouched

The viewport now pins scale: `maximum-scale=1, user-scalable=no`. iOS ignores
the directive in Safari tabs and honours it in standalone — which is exactly
the split wanted. The browser keeps zoom for anyone who needs it (the
accessibility objection is answered by the platform itself, where the public
first arrives), and only the installed app — where someone chose app
behaviour — behaves like an app. The failure this kills: an accidental pinch
mid-set leaving the app stuck half-zoomed with no obvious way back.

Chart pinch is unaffected. `.zoom` surfaces are `touch-action:none` with
their own gesture code; they never depended on browser zoom.

buildcheck gains a three-way coherence guard: the viewport must keep
`user-scalable=no`, `html` must keep `touch-action:manipulation`, and `.zoom`
must keep `touch-action:none`. The zoom doctrine is one decision expressed in
three files, and losing any leg half-applies it. Verified by breaking it.

One-line change, seventh guard, suite unchanged at green.

## v3.3.77 (2026-07-25) — One name field, honestly labelled

A First/Last split was proposed and declined. The app has exactly one
consumer of the name — the greeting — so a Last Name field would collect
data that feeds nothing, the same reason Height was cut from the You card in
v3.3.66. It would also encode Western name order: a family-name-first user
typing naturally into First/Last gets greeted by their surname, which is the
exact failure the split was meant to prevent.

The field's real identity is "what the app calls you", and now the label
says so. The note states the one rule — first word is used — and once a
name exists it shows the contract live: “Greets you as Sungjee.”

A test lesson worth keeping: the hostile-name assertion first failed against
the serialized HTML, which was the assertion's bug, not the app's —
attribute values legally carry '<' unescaped, so the input's value tripped
the regex. Injection checks must ask the DOM (is there a real <b> element
with the injected content?), not grep the serialization.

Suite at 57.

## v3.3.76 (2026-07-25) — The greeting learns the clock, and counts to a thousand

The greeting word now tracks five bands instead of three: Early (before 5),
Morning, Afternoon, Evening, Late (after 22). One word each. 4am deserved
better than 'Morning' and 11pm better than 'Evening', and a single dry word
is all the variation this card gets — anything chattier curdles by the third
read. `helloPart(hr)` is pure so the clock is testable.

The subline stays a receipt. Its one new behaviour: inside the last 75 days
before a round milestone it counts down — '928 days in · 72 to 1,000.' —
which is live for this archive today. A countdown is a fact; that is why it
gets in and a compliment does not. On the day itself the count rolls past
and the line goes quiet again.

The name still comes from Settings → You; the card has read it since
v3.3.66. Nothing prompts for it, deliberately.

An enforcement worth recording: the test asserts that no string literal in
the greeting functions contains an exclamation mark. The first draft of that
assertion tried to regex-subtract JS negation operators from the source and
failed on its own cleverness; it now extracts the string literals and checks
those. Guard the strings, not the syntax.

Suite at 53 — all five bands, full 24-hour coverage, the countdown window,
the rollover, and silence at zero.

## v3.3.75 (2026-07-25) — The legend behaves on a phone, and the card's labels become the legend

**In-app legend, three fixes from one screenshot.** It hijacked the tab swipe:
it scrolls sideways, so it joins the gesture blocklist beside `.ychips` and
`.heatcols` — the third time a horizontal scroller has needed this, each
found by swiping on a phone. It hid the current year: it now parks at its
right edge on render, the v3.3.42 heatmap rule (newest is the whole point).
And it was too loose: gap 10→6, chip padding trimmed, swatch 12→10, with
`flex:0 0 auto` on chips so flex can never crush them.

**The card's typography, reworked from the annotations.** The 132px headline
dropped to 96 — dominant over the 28px kicker without shouting — and the
legend row is deleted. The labels ARE the legend now: each past year sits at
its own line's end on the right margin as a muted '22-style tick, which is
where the eye already is when it follows a line; and this year carries
'2026 · 62%' in accent bold above its beacon. Endpoint labels nudge apart
when years finish at similar percentages, so nothing overlaps in any data.

The plot area grew in both directions from the space the legend and the
oversized headline gave back.

Suite at 53 — the 96px step-down, the legend row's absence, one tick per
past year, the '2026 · 62%' endpoint label, the collision nudge, the gesture
blocklist entry, and the park-at-right rule.

## v3.3.74 (2026-07-24) — The consistency chart ships as a card, and GIF is settled

**The caption moved behind the dot** — the `yoy` tip, 79 characters — and
"Share as image" took its place. Same overlay, same share path, same recording-
context test rig as the grid card.

The card is 1080×1080 with this year's percentage as the headline, every year's
curve beneath it, and the legend with final numbers. The current year is the
only saturated line, drawn last so it sits on top of the greys, at double
weight, with the beacon dot at its tip — the SVG's hierarchy, restated in
canvas. `yearCurves()` already lived in util.js, so unlike the grid there was
no arithmetic to extract; the card is a second painter over the same source,
which is the pattern working as intended.

**The GIF question is settled with receipts, and the answer is no.**
Instagram is unanimous across every source: a .gif upload posts as a static
first frame — feed, Reels, carousel — and the only animated route is
conversion to MP4. LinkedIn is genuinely mixed: GIFs in personal feed posts
have animated since mid-2024, but behaviour still differs between desktop,
the mobile app, and app versions, and several current guides still call it
static. So the format animates nowhere reliably — static on Instagram,
unreliable on LinkedIn — and the honest animated path is MP4, which is the
canvas→MediaRecorder route already ruled out on iOS in v3.3.72 (capture
tracks without valid capabilities, WebKit 181663's freeze on stop). A GIF
encoder dependency that produces a file Instagram freezes anyway is the
worst of both. Share cards stay still images; the loop, if ever, is a
post-Phase-1 question.

`test-sharecard.js` at 46 assertions — the yoy card's headline, one legend
entry per year, the current year boldest and drawn last, the caption gone
from the DOM, the tip within one breath.

## v3.3.73 (2026-07-24) — The grid explains itself behind a dot, and this month reads as unfinished

The paragraph under the month grid was 165 characters of prose sitting between
the data and the share button. It is the `mgrid` tip now, at 92 — inside the
41–94 range every other tip in the app occupies, and inside the 120-character
cap buildcheck started enforcing two versions ago. The cap did its job: the
original text could not have shipped as a tip without being cut.

**July reads as unfinished now.** It was tinted at full strength like any
completed month and merely outlined dashed, so a partial count looked like a
finished one — a month three days old sat as dark as a month of twenty-three.
Its fill is now dimmed to 45%, the dash is drawn in accent rather than muted so
it stays crisp against the lighter cell, and the number goes muted.

Dimming is expressed as **alpha, not a colour**, which is what makes it correct
in light and dark without a second rule. `mgAlpha(n,max,cur)` is shared by the
HTML grid and the canvas share card, so the two can never disagree about what
"in progress" looks like — the same reason `gridData()` was extracted last
version.

`test-sharecard.js` at 36 assertions. The dimming check had to be made
positional: the current month is the last in-range cell drawn, and membership
alone was not enough, because another month with the same day count produces
an identical full-strength alpha and the flat call log cannot tell the two
cells apart. The first version of that assertion passed by luck.

## v3.3.72 (2026-07-24) — The year grid as a 1:1 share card

The month grid is the most compelling thing this app owns — the whole history
on one screen — so it is the first block to leave the app as an image. Square,
1080×1080, because 1:1 is the one ratio every platform takes uncropped. The
report card stays 4:5, which reads better in a feed.

The day count leads the card. It is the app's authority number and it should
be the first thing a stranger's eye lands on, above a grid that proves it.
Footer carries the date span and the URL.

**Almost none of this was new.** `report.js` already had the canvas renderer,
the theme-var colour resolution, the `navigator.canShare({files})` path with a
download fallback, and — the expensive part — the v3.3.13 font rearm, because
canvas never inherits CSS faces. What was added: a square renderer, and
`showCard(drawFn,label)` so one overlay and one share path serve any card.

`gridData()` is extracted so the HTML grid and the canvas card read one source.
The paint is genuinely duplicated — canvas cannot reuse a `<span>` — but the
arithmetic is not, which is the half that actually drifts.

**The router bug that was sitting there.** `report.js` matched on
`e.target.id===` throughout — the exact pattern that cost real sets in the gym
in v3.3.58. `#repDo` has no children today, so it worked. It is `closest()`
now, and the test asserts the old form is gone from the file.

**New suite `test-sharecard.js`, 27 assertions, and it closes a blind spot.**
The harness stubs `getContext` to a no-op Proxy, which made every canvas
invisible to every test. This suite installs a RECORDING context instead: each
draw call and property set is logged, so the card is asserted structurally —
1080×1080; the day count drawn first; exactly one glyph per in-range month and
none outside; a tinted cell per month with days; alpha between .14 and .88 so
darker really is more; the current month dashed exactly once and the dash
cleared after; then the whole path from button to overlay to a named PNG
handed to `navigator.share`.

It still cannot tell you the card looks good. It can tell you it drew what it
said it drew.

Animation was considered and cut. Safari has had MediaRecorder since iOS 14.5
and writes MP4, but the canvas route specifically is unreliable there —
`captureStream` tracks come back without valid capabilities and WebKit 181663
has `stop()` freezing the page, with the blob never arriving. The realistic
fallback is a GIF encoder dependency in an app with a 2.7KB shell. Not worth it.

## v3.3.71 (2026-07-24) — One sentence

The `bw` tip was 367 characters, 62 words, four sentences. Measured against
the five tips that predate it — `goal` 41, `cumkm` 50, `sets` 60, `ready` 87,
`pace` 94 — it was **3.9x the longest text in the app**, and the bubble was
tall enough to cover the chart it was explaining.

    Your recorded weights over time — flat stretches are days you didn't measure.

77 characters. What it is, then the single non-obvious thing about it. The
rest was me writing the reasoning from the changelog into the product, which
nobody opens a fitness app to read.

Everything cut was already stated elsewhere: the axis labels mark the low and
high, the line visibly steps, and the editor already carries "silence means
unchanged" at the moment you're typing a number. The tip was the fourth place
the same idea appeared.

It is also inlined at the `iBtn` call site now, like the other five. The
`const tip=` indirection existed only because the text had grown too long to
sit in the call — which was itself the signal.

**buildcheck gains a sixth guard:** no `iBtn` tip may exceed 120 characters,
and no tip may be passed as a variable (which would hide its length from the
check). Verified by breaking it. Six guards now, and every one was added after
shipping the thing it catches.

## v3.3.70 (2026-07-24) — The weight tip explains the chart, not your numbers

The `bw` tip recited the reader's data: how many weigh-ins, the current weight,
the net delta, the date of the first entry. It was the only tip in the app
whose text changed with the log. Every other one describes the thing you are
looking at — "the tick marks where you should be today", "faster months sit
lower" — and interpolates nothing but the display unit.

It is now invariant: what the chart plots, why the line steps rather than
curves, what a flat stretch means, what the dashed lines mark, and the one rule
for entering a weight. The only thing that varies is kg/lb.

The net-change figure is gone from the copy entirely rather than relocated. The
labelled min/max gridlines and the value printed at the end of the line already
show it, and re-siting a number that the chart states twice is how a card gets
crowded. Its now-dead `delta` binding went with it — the same logic living in
two places is the same logic drifting in two places, and unread logic is just
the degenerate case.

The test asserts invariance directly: render the card against 1 weigh-in at
70 kg and against 3 ranging 77–92.6, and the bubble must come back
byte-identical. It must also contain no digit at all, and it must follow the
unit toggle. 52 assertions.

## v3.3.69 (2026-07-24) — The weight note goes behind the dot, and moves up

Two notes of prose sat under the weight chart explaining what a flat line
means. That is exactly what D1 in DESIGN.md exists to prevent: explanations
live behind a dot, where the sentence used to be. Both are now the `bw` tip on
the section title, using the same `iBtn` every other explained section uses.
The net-change figure went in with them — the labelled axis and the value at
the end of the line already carry that visually.

The editor keeps its one inline line ("silence means unchanged"), deliberately.
That is not an explanation of a chart you're looking at; it is the rule you
need at the instant you're typing a number, and burying it behind a tap would
be the wrong trade.

**Your weight moves above "Last 30 days, vs your usual."** It now sits directly
after the run records, before the part-by-part drift. The insertion point is
*before* the `if(drift.length)` conditional that owns that heading, so the card
renders whether or not you have drift rows — which the test fixture happens to
exercise, since it has none.

`test-bwcard.js` at 50 assertions: the tip carries the prose, no `.note`
survives under the chart, the editor keeps its inline rule, and the section
orders ahead of both Report card and the Records heading.

**Harness note:** the ordering assertion first failed against plain
`'secRecords'`, which matches the jump CHIP at the top of the view long before
the heading. Anchor ordering checks on the tag, not the id fragment — the same
class of error as the bare `.foo{` CSS regexes in v3.3.50 and v3.3.55.

## v3.3.68 (2026-07-24) — The weigh-in editor, and a chart that actually draws

**The bug, plainly: I broke the editor's layout in v3.3.67 and shipped it.**
`.btn` is `width:100%`. I put one in a flex row with `flex:0 0 auto`, which
resolves its basis to the FULL container width and then forbids it from
shrinking — so Save demanded the whole card, overflowed the right edge, and
crushed the field beside it to min-content, wrapping "WEIGHT TODAY (KG)" onto
three lines around a clipped input. `.btnrow` has existed in this app for
exactly this situation and is what I should have used.

The editor is now a full-width field with `.btnrow` beneath it: Cancel and
Save, both `flex:1`. Cancel is new — there was previously no way out of edit
mode without saving, which is its own small violation of "every state the app
walks into, it walks out of".

buildcheck gains a fifth guard: while `.btn` is `width:100%`, no `.btn` in any
JS source may carry `flex:0 0 auto`. Verified by breaking it on purpose. This
is the fourth guard added *after* shipping the bug it catches — jsdom has no
layout, so the DOM was flawless and every one of the 16 suites passed.

**The chart now draws from the first weigh-in, not the second.** Withholding
it at n=1 was wrong. "70 kg since January 2024" is not a pretend trend — it
is the actual shape of this history, flat because the weight held, and flat is
information. The note under it says so and names the day it will bend.

The axis is labelled now, which is the other half of why it read as
unsatisfying: dashed gridlines at the true min and max with their values, the
first date and "today" on the x, and the current weight printed at the end of
the line.

Still a line rather than bars, deliberately. A bar encodes magnitude from
zero: 68 against 70 kg drawn from zero is an invisible difference, and drawn
from a 66 baseline it lies about proportion. A step line over an explicit
non-zero axis is the honest form for a quantity that never goes near zero.

`test-bwcard.js` grows to 41 assertions — the flat single-entry line, the
axis labels, the end-of-line value, Cancel recording nothing, and a source
assertion that no `.btn` is pinned `flex:0 0 auto`.

**Harness note:** one of those new assertions failed for a reason worth
writing down. Inside a JS template literal `\(` collapses to `(`, so an
escaped-paren regex silently became a capture group and stopped matching. Use
`indexOf` for literal markup checks.

## v3.3.67 (2026-07-24) — The weight series, made visible

**A correction to what v3.3.66 claimed.** That entry said a Pull Up logged in
2024 was "valued at today's bodyweight". That is wrong, and I should have read
the call sites before writing it. Bodyweight sets store their own `w` (70 for
this archive), so past volume and past display were always correct. Every
consumer of the scalar was present-tense: the logger's default weight for a new
bodyweight set, and the live caption. The dated series is still the right shape
— but its payoff is a record going forward, not a repair of the past.

Both live sites now read `bwNow()`. No app-logic file reads
`DB.settings.bodyKg` any more; it survives only as the derived cache, written
by `setBw()`. The test asserts that directly against lift/stats/history/header,
so the scalar cannot creep back in.

**Stats gains a Your weight card**, and the weigh-in lives there rather than in
Settings — two taps from opening the app.

It draws a STEP line. Between two weigh-ins the app knows nothing, and
carry-forward is literally a step function; a smooth curve would draw days you
never measured, which is a lie a chart has no business telling. The note under
it says so: flat stretches are days you didn't measure, not days you didn't
change. The last weight extends to today rather than stopping at the last dot.

Degradation is deliberate. Zero entries: one quiet line and an Add. One entry:
the number and "unchanged since —", no chart, because a single point drawn as
a flat line pretends to be a trend. Two or more: the step. A near-flat series
clamps to a 2-unit window so a 0.2 kg move can't fill the box and read as
drama.

No goal line, no trend verdict, no red/green, and **no weigh-in prompt on
Today**. Arrival stays about training. The card is discoverable in Stats
without ever asking you for a number — an app that scores attendance has no
business nagging you about your body.

Entering the same number records nothing, which is the whole rule made
literal: enter a weight when it changes, and silence means unchanged.

New suite `test-bwcard.js` — 32 assertions including the step geometry itself
(interior segments must share an x), the flat-series clamp, the unchanged
no-op, and the streak guard re-checked through the real UI path.

**Ritual note:** the blanket count-based version bump nearly rewrote the
`// v3.3.66:` provenance comment in core.js. The assertion caught it. The
APP_VERSION bump is line-anchored from now on — same lesson as the CSS regexes
in v3.3.50 and v3.3.55.

## v3.3.66 (2026-07-24) — Bodyweight has a history, and the app knows your name

Bodyweight was a single number in Settings. That made a Pull Up logged in
2024 worth whatever you weigh today — a quiet correctness bug hiding inside
what looked like a missing feature.

A weigh-in is now an EVENT on a day: `DB.days[iso].bw`. Enter a weight and
it means "this changed today"; enter nothing and it means "unchanged".
Reads carry forward from the most recent entry, and reads before the first
entry backfill from the earliest one, so there is no window that answers
zero. `bwAt(iso)` is the only way to ask.

It deliberately reuses days rather than adding a structure beside them.
Days already sync per-day newest-wins, already export in Backup, already
restore, and already have past-day editing. A second store would have been
a second thing to drift — `resealDay()` and `foldSets()` were both born from
exactly that mistake.

`settings.bodyKg` survives as the derived CURRENT value, so lift.js and
loadLine() are untouched. v3.3.67 will switch them to bwAt() so historical
bodyweight lifts finally value correctly.

The migration seeds ONE entry at the first logged day from the old scalar,
which makes the whole archive read at that weight. For this archive that
isn't a guess: the v3.0.1 forensics found Pull Up/Dip = 70 in every
sheet-era year.

A weigh-in-only day carries no sets, and deriveAll() skips days with no
rows — so recording your weight can never inflate the day count. There is a
test that says so, because that number is the entire product.

**Personal.** Settings gains a "You" card: name, weight, sex. Onboarding
step 3 becomes "About you" and asks for a name. Height was requested and
deliberately left out — nothing in the app or the roadmap reads stature, and
a field that feeds nothing is how a log starts feeling like a form. Sex is
stored for strength standards later and says so plainly.

The greeting is a STATE, not a banner. It sits above Rhythm only while you
haven't trained yet, and it leaves the moment the first set lands — every
state the app walks into, it walks out of. A permanent "Hey Sungjee" would
be wallpaper by Thursday. Free text now reaches innerHTML, so `hesc()`
escapes it.

buildcheck gains a fourth structural guard: `.hello` must not wrap and the
name must be able to truncate, or a long name pushes the day count off a
360px screen. Same class of bug as the header wrap in v3.3.55.

New suite `test-bw.js` — 41 assertions covering carry-forward, backfill,
segment boundaries, clearing, the migration's idempotence, the LWW union,
name escaping, the greeting's arrival and departure, and the streak guard.

## v3.3.65 (2026-07-24) — One up button, everywhere
The calendar return pill becomes a general scroll-to-top control, available
on every tab whenever you're deep enough in a view for the top to be a trek
(past ~520px).

One element, and its LABEL always names where it will actually take you:
"↑ top" normally, "↑ calendar" while History has armed a jump-back after a
date tap. Two floating buttons would have been clutter and a coin-flip
about which does what; one whose text is honest costs nothing.

It moved from History into util.js since it belongs to the app, not to one
tab — History now just tells it that "up" temporarily means the calendar.
The scroll listener is rAF-throttled and passive, so it can't fight the
scroll it's watching. Right-anchored rather than centred so it never sits
over the text you're reading, and driven by [hidden] so a single boolean
controls it.

test-calreturn.js gains the app-wide cases: hidden at rest, appears when
scrolled deep, says "top" when that's the truth, works on Stats as well as
History, and hides again on return. The calendar-target cases all still
hold, including the v3.3.60 IO birth-report guard.


## v3.3.64 (2026-07-24) — The go-to card asks to be pressed
"When I open this in the morning, this should tempt me to press it. Nothing
happened."

Both halves were true, and they had different causes.

**Nothing happened, literally.** v3.3.57's entrance was armed only by a part
TAP. Opening the app restores the part from saved state with no tap at all —
so the one moment the invitation matters was the one moment it stayed still.
The trigger is now "the list you're looking at changed", compared against the
last rendered part. That covers the tap, the morning boot, and back-
navigation, while logging a set (same part) still never re-bounces.

**And it was too quiet to see.** 7px on a single-card list, where the stagger
contributes nothing, is imperceptible. Now 14px with a slight scale over
340ms — arrival, not a bounce.

**The card had no affordance at all.** Today's TRAIN NEXT says "Start →";
this said nothing — just text on a white card, giving the eye no reason to
believe it was pressable. Go-to cards now carry an accent → at their right
edge that leans forward on press. Same invitation, same colour, sized for a
glance.

Verified both ways: the new assertions fail on v3.3.63 at exactly the
restored-part case and the missing chevron.


## v3.3.63 (2026-07-24) — Repless rows with a real weight, gone too
v3.3.62 caught the empty GROUPS. These are empty ROWS inside a group that
has real sets — "12 kg" with no chips under eight legitimate presses.

foldSets dropped a marker only when it had no reps AND a near-zero weight.
A legacy row carrying 12 kg with reps:[] failed the weight half of that
test and survived, printing a bare weight with nothing beside it. Reps are
the content of a lift, so the weight clause is gone: no reps, no row —
whatever the number.

Run is the one exemption and now says so explicitly. A run is described by
its distance and time and legitimately carries no reps, so foldSets takes
the exercise name and never drops one. Both callers (History detail and
Lift's LAST TIME card) pass it.

Counts were already right — the press still reads 8 sets, because a
repless entry contributes zero. Only the row was lying.


## v3.3.62 (2026-07-24) — Empty legacy rows stop pretending to be sets
"There are no logged sets, but I still see these."

Two causes, one of them mine from yesterday.

**A v3.3.61 regression.** The old read path skipped a whole exercise group
when folding produced no rows (`if(!folded.length) return`). Rewriting that
block for edit mode dropped the skip, so groups with nothing to show still
printed their header and their "+ set" button. Restored, and it now applies
to both views.

**The set count counted entries, not reps.** `(reps||[]).length||1` scored
a bare marker row as one set — hence "1 set" above an empty group. A set is
a rep; a run is the one entry that is itself a set. The day summary already
counted correctly, so only the group headers were lying.

Also: a part whose only entry is an empty marker is no longer named in the
day summary — you didn't train Biceps because a dead row says so.

These markers are sheet-import residue: a weight with no reps, contributing
zero to every total. They're left in storage rather than silently migrated,
and commitPastDay() already sweeps them from any day you edit — so they
clear as you touch them, and nothing is rewritten behind your back.

Verified both ways: the new assertions fail on v3.3.61 exactly at the
empty-group case.


## v3.3.61 (2026-07-24) — Past sessions are editable
Edit, delete and add sets on any day the app holds locally.

**Deliberate, never accidental.** A day is inert until you tap its own
Edit control; only then do its sets become tiles you can tap or ✕. Past
data is a record — a thumb landing mid-scroll must never rewrite three
weeks ago. Done exits, and edit mode also clears itself on any re-render,
if the day empties out, and the moment you leave History: every state the
app walks into, it walks out of.

**Addressed by entry, so legacy rows work.** A set is identified by its
index in the day's stored array plus its index within that entry's reps,
so a sheet-imported row carrying reps:[30,30,30,30] is editable set by
set — not as one indivisible block.

**Changing one set's weight splits it out** rather than silently
re-weighing its siblings. Edit the second of four 16 kg presses to 20 kg
and you get three at 16 and one at 20, which is what actually happened in
the gym.

**One writer.** Every mutation funnels through commitPastDay(): it drops
emptied entries, deletes the day if nothing is left, re-seals it with
resealDay(), and re-runs deriveAll() — so the calendar, month totals and
part digests can never show numbers the data no longer supports. The test
asserts that re-derive explicitly, not just the array edit.

Older months that live only in the sheet show no Edit control: there are
no local entries to point at, and offering the button would be a lie.

test-pastedit.js: sixteen cases through the real handlers, including the
split-on-weight-change, the multi-rep delete, add-with-catalog-part-lookup,
and edit mode closing on a tab change.


## v3.3.60 (2026-07-23) — The return pill actually appears; the date lands visible
Two fixes to yesterday's calendar jump, both root-caused.

**"I don't see anything after tapping."** The pill was killing itself at
birth. IntersectionObserver fires a mandatory INITIAL callback with the
current state the instant observe() is called — and at tap time the
calendar is still on screen, so that first report said "intersecting" and
the auto-hide removed the pill before the smooth scroll had moved a pixel.
The birth report is now skipped; only a genuine re-entry of the calendar
dismisses. Proven both ways: the shimmed-IO test fails on v3.3.59 exactly
at the birth case and passes here.

**The tapped date landed hidden under the header.** The header is
position:sticky, and scrollIntoView(block:'start') aligns the target with
the top of the scrollport — which the sticky header then covers, hiding
the very date line you tapped for. Every History scroll target (.day
cards, and .cal for the pill's return trip) now carries
scroll-margin-top:calc(safe-area + 86px), so the browser itself reserves
the header's height. No JS offset math, works for both jump directions.


## v3.3.59 (2026-07-23) — A return ticket for the calendar jump
Tapping a calendar date teleports you down into that day's session — and
left you there. Now the way back appears exactly at that moment and
nowhere else: a floating "↑ calendar" pill above the tab bar.

It expires three ways, so it can never go stale:
- **Tap it** — glides back to the calendar and removes itself.
- **Scroll back yourself** — an IntersectionObserver watches the calendar;
  the moment it's back on screen the pill leaves (guarded, so environments
  without IO simply skip the auto-hide).
- **Any render or tab switch** — the pill lives on <body> (never clipped by
  the view), so render() and renderHistory() both kill it explicitly.

Accent, not red — it's navigation, not a live signal. No permanent chrome:
when you haven't jumped, History looks exactly as it did yesterday.

test-calreturn.js: eight cases through the real click handlers — absent
before any tap, present after, removed by its own tap / a re-render / a
tab switch, and rapid double-taps keep exactly one pill.


## v3.3.58 (2026-07-23) — Add set works with the preview showing
"When the letters appear in the button, a set is not registered."

Exactly right, and root-caused: the click router tested
`e.target.id==='addrep'` — an EXACT identity check. When updAddPreview
injects "→ 11,325 kg ▲4" into the button, the button gains a <span> and a
<b>; a tap landing on those makes e.target the span, the identity check
fails, and the tap dies. With no preview the button holds only a text
node, so e.target is the button itself — which is why it "works fine
without the letters".

Fixed at the class, not the instance: all 23 exact-id checks in the click
router became `e.target.closest('#id')` — a button's descendants must
count as the button. Only addrep had children TODAY, but only because the
preview adds them at runtime; any button that later gains a <b> or an icon
would have inherited this bug silently. The two input-event checks (wv,
rc) stay as identity: inputs have no children.

test-addsub.js drives the real handlers: types reps so the preview
renders, then clicks the inner <b>, the inner <span>, and the plain
button — all three must log. Verified in both directions: five-for-five
on this build, and the preview taps FAIL on v3.3.57, reproducing the gym
bug exactly.


## v3.3.57 (2026-07-23) — Exercises arrive when a part is chosen
"I'd love to see the exercises pop out a bit more. Shimmer? Drop shadow?
Animate?"

Answer: entrance motion, deliberately not the other two. Sheen already
means "selected / primary action" in this app — shimmering a whole list
would dilute the one signal it carries. A heavier drop shadow is permanent
decoration that makes every later visit heavier. But choosing a part is a
MOMENT, and the exercise list is its answer — so the cards now arrive:
each rises 7px and fades in over 260ms with a 40ms stagger (capped at ten,
so long lists don't trail off forever).

Once, and only once. The animation is armed by the part tap and consumed
by the next render, so logging a set mid-session never re-bounces the
list, and jumping straight into an exercise (Continue) can't leave the
flag primed to fire on some later, unrelated visit. Four-case test
(test-enter.js) pins exactly those semantics through the real click
handler.

fill-mode is `backwards`, never `both` — a finished card must leave no
transform and no stacking context (the v3.3.16 tip-bubble lesson).
prefers-reduced-motion turns the whole thing off.


## v3.3.56 (2026-07-23) — Rep tiles follow the weight
"If I increase the weight, the more likely my reps will decrease."

The rep tiles were weight-blind: one frequency-ranked list per exercise,
whatever the bar said. Now repChoices(ex, weight) builds them in two
layers:

1. **Evidence first.** Reps you actually did within 3% of the chosen
   weight, recency-weighted (the last year counts more). Truth outranks any
   model, so these fill tiles before anything predicted.
2. **Your strength curve fills the rest.** From the last 90 days' sets, an
   Epley estimate of the exercise's 1RM (median of the top five, so one
   grinder set can't skew it), inverted at the chosen weight:
   reps = 30·(1RM/w − 1). This is what answers a weight you've NEVER
   lifted — at 75 kg it offers honest singles-to-tens instead of the 20s
   it used to copy from your 50 kg work.

At real data: 35 kg → 25-35 reps, 50 kg → 16-27, 60 kg → 4-18, 75 kg
(never lifted) → 1-11. Bodyweight moves keep the frequency tiles — a
weight-independent movement shouldn't pretend otherwise.

The grid re-tiles through refreshLoad(), the funnel every weight change
already flows through — stepper, suggested-chip taps, Last Time rows, and
manual typing all update the tiles live, no re-render.

test-repweight.js: ten assertions, including the monotonic law itself
(median tiles at 75 < at 50 <= at 35), evidence priority at each lifted
weight, sane predictions at never-lifted weights, bodyweight indifference,
and the DOM re-tiling on manual input.


## v3.3.55 (2026-07-23) — The header is one row, always
A long exercise title ("Incline Barbell Bench Press") pushed the rest timer
and the gear button onto a second row, doubling the header's height.

Root cause: <header> was `display:flex; flex-wrap:wrap`. Nothing forbade a
second row — the wrap was the designed escape valve for exactly the case
that must never happen. Now `flex-wrap:nowrap`, with .brandrow taking
`flex:1 1 auto; overflow:hidden` (it yields) and .hbtns `flex:0 0 auto`
(the controls never shrink and never move).

The title itself also had `-webkit-line-clamp:2` inside a `max-width:56vw`
cap, so it could stand two lines tall on its own. It's now one line with an
ellipsis, and flex-shrink decides its width — which adapts to whether the
rest timer is showing, instead of guessing at 56vw.

Guard added to buildcheck: the header rule must not set flex-wrap:wrap,
must explicitly state nowrap, and .h-date must be able to truncate. All
three fire against the v3.3.54 stylesheet and pass on this one. Same
reasoning as the v3.3.49 clip guard — jsdom has no layout, so a rule that
can only break visually gets a structural assertion.

(The .h-date regex needed line-anchoring to avoid matching
`header.live .h-date{color:#fff}` — the same trap the .lastset geometry
check hit in v3.3.50.)


## v3.3.54 (2026-07-23) — Info returns to an "i" beside its title
Position and label only; the tap-for-tip behaviour is untouched.

Every info affordance now sits directly beside its section title as a small
circular "i" (17px, lowercase — an uppercase I-dot reads as a letter). Five
were living at the bottoms of their cards and moved up: Readiness, Logged
today, the year goal (its note row keeps only "Change goal"), Year over
year, and Pace by month. Suggested's own button was already beside its
title and only changed label.

The .notei wrapper loses its note-row top margin and its margin-left
override — both were for the old placement under card content; beside a
title the button's own 6px gap is the right one.

The portaled tip (v3.3.16) needed no changes: the open handler is
document-delegated on .tipi and the bubble mounts on <body>, so it works
identically from inside an h2. Asserted from the new position: the dot is
in the zonehead, labelled "i", and clicking it fills #tipFloat.


## v3.3.53 (2026-07-23) — Revert v3.3.52
Sungjee's call, same day: the full cumulative chart inside the Rhythm card
comes back out, and the two-bar this-year-vs-last comparison returns, with
its "+N points vs the same day last year" sentence. Byte-for-byte the
v3.3.51 UI under a new version stamp.

Recorded, as ever, as a trial worth having run: the chart reads well in
Stats where you go to study, but the Rhythm card is a glance surface, and
two bars answer "am I ahead of last year" faster than five lines do.

v3.3.52's consistencyChartHTML() extraction dies with the revert (Stats
returns to its inline chart). If the shared-renderer shape is ever wanted
again, the v3.3.52 commit (6b28ee6) has it whole.


## v3.3.51 (2026-07-22) — The logger loses a third of its height
Three densifications off two gym screenshots.

- **Rep tiles: 12 → 8, one row.** Twelve square tiles cost two rows for
  options 9-12 that the frequency ranking had already marked as rare. Eight
  fit one line at ~37px each — dense-grid tappable — and the tiles drop the
  square ratio for a fixed 40px height. The grid goes from ~110px to 40px.
- **Stepper 60 → 48px, load line slimmer.** Same thumb targets, less tower.
- **Suggested chips denser.** Padding and gaps come down; the dismiss badge
  shrinks with them. The v3.3.50 geometry check re-run with the new numbers:
  the reps still clear the badge by 3px, and the clip guard stays green.

Log a Set drops roughly 90px all told; Suggested drops a chip-row's worth
on a six-suggestion day.


## v3.3.50 (2026-07-22) — Dismiss badge, seated for good
v3.3.49 stopped the clip but seated the × on top of the reps. Now it's
fully inside the chip's top-right corner with real room made for it: the
chip's text gets 28px of right padding, so "65 kg × 20" ends 7px before the
badge begins. No overhang (the v3.3.49 clip guard still passes), no overlap.

I first tried a right-only overhang to tuck it tighter — and my own
buildcheck guard from v3.3.49 rejected it, correctly: a right overhang
clips at the app's edge for a long enough value on a narrow enough phone.
Kept the guard strict and made honest room instead. The no-overlap geometry
(text padding >= badge width + offset) is now checked arithmetically, not
by eye.


## v3.3.49 (2026-07-22) — Dismiss badge clip, actually fixed
Third attempt, first correct one. v3.3.46 and v3.3.47 both read this as a
missing-space problem and added padding. It was never space.

Root cause: #app sets `overflow-x:clip`. Per the CSS spec, you cannot pair
`clip` on one axis with `visible` on the other — the visible axis computes
to `auto`. So #app clips VERTICALLY too, and the dismiss badge, sitting at
`top:-7px` above its chip near the top of the scrolled content, got shaved
by that clip. No amount of padding on the chip or the list could help,
because the clipping element was a distant ancestor, not a nearby gap.

Fix: the badge no longer overhangs anything. It's seated INSIDE the chip's
top-right corner (top:3px right:3px), the chip gets right padding so the ×
doesn't sit on the numbers, and the v3.3.47 headroom hack is reverted since
it was treating the wrong cause.

Guard added to buildcheck: if #app clips and the dismiss badge has any
negative offset, the build fails. Verified it fires on the exact v3.3.46-48
markup and passes on this fix. This is the check that would have stopped me
shipping the wrong fix twice — a structural assertion matching the real
failure mode, since jsdom has no layout and no behavioral test could see it.


## v3.3.48 (2026-07-22) — Weekday chart un-broken
The weekday bars rendered as giant overlapping blocks. My fault, from
v3.3.46: to make that chart testable I gave its SVG <rect>s the class
`wdbar` — not knowing an old, dead `.wdbar{flex:1;width:100%}` HTML-bar rule
was still in the stylesheet from a previous chart iteration. `flex` and
`width:100%` on an SVG rect inside a flex-free SVG is what ballooned them.
jsdom has no layout, so every behavioral test passed while the chart was
visibly broken on the phone.

Three things done, not one:
- Renamed the rect hook to `wd-col`, which nothing styles.
- Deleted the dead `.wdbars/.wdcol/.wdp/.wdbar` block — five rules with zero
  live consumers, confirmed by grep across every module before removal.
- Added a buildcheck guard: any SVG rect class that also matches a CSS rule
  setting flex or width now fails the build. This is the exact seam no
  behavioral test can see, so it belongs in the structural checks. Verified
  it fires on the offending pattern and passes once clean.

Also froze test-sessfmt.js, which started failing today for an unrelated
reason: its fixture keyed off "the first details.day" and placed a prior
session at today−5, so when the real date rolled to 7/22 the dates
collided and a phantom group appeared. Now scoped to today's card by
data-d and the prior session pushed to today−40. Confirmed the frozen test
passes on every stage back to v3.3.43 — the grouping was always correct;
the test was rotting against the wall clock.


## v3.3.47 (2026-07-21) — Dismiss badge, corrected
v3.3.46 read the clip as horizontal and added a right margin. It was
vertical: the dismiss ✕ sits 7px above its chip and the suggested list gave
it no headroom, so the card's top edge shaved it. Fixed by adding 8px of
top padding to the list — one more than the overhang — and trimming the
v3.3.46 right margin from 7px back to 2px, since that was the wrong axis and
left the right side looking loose.


## v3.3.46 (2026-07-21) — Four bits of polish
Straight off four screenshots.

- **Heatmap outline no longer clips.** Today's cell carries a 2px outline
  with 1px offset; the scroller had no room on its trailing edge, so the
  right side of the box was shaved. Added padding to the right and top.
- **Weekday chart highlights TODAY, not the strongest day.** The accent was
  marking your statistically strongest weekday. Now it marks the weekday
  you're actually in — today — because that's the row you're reading the
  chart from. The strongest day still shows, but quietly: a small ▲ above
  its bar, with a legend note. One loud colour, and it belongs to now.
- **Share button font fixed.** The report overlay is mounted on <body>,
  outside #app, so its buttons were inheriting the OS font instead of IBM
  Plex — "Share" and "Close" ended up in different faces. The overlay now
  sets font-family explicitly.
- **Dismiss × no longer clipped.** The suggested-set badge sits at
  right:-7px and the card edge was cropping it; the chip gains a matching
  right margin.

test-statspolish.js pins the two that are logic, not just pixels: the
accent bar is today's column (not the strongest), the ▲ marks the strongest
and never sits over today, and the overlay carries the app font.


## v3.3.45 (2026-07-21) — Rhythm takes the top; Daily Fire is gone
Daily Fire is deleted, and Rhythm moves into the slot it occupied at the
top of Today.

The pre-gym branch of Today already opened with Rhythm, so this makes the
tab consistent: Rhythm is the first card whether or not you've logged
anything. It also removes a duplicate — Rhythm was rendering twice in the
logged branch's lifetime, once at the bottom of the screen and (now) once
at the top.

A LIVE session still leads with the part digest. That's the one thing more
urgent than rhythm while you're mid-set, and it's where v3.3.40 put it.
Consequence worth naming: Rhythm is not on screen during a live session,
only once the day seals. Easy to change if that's wrong.

Removed with the card, since nothing else used any of it: dailyFireHTML(),
fireGlide(), the _fireGl glide state, the pointer scrub handlers, the
.firecard/.firerank/.firegain/.firedot styles and the gainfloat keyframe.

**Kept deliberately: fireDist().** lift.js:710 uses the same distribution
for its own comparison, so the data helper stays even though the card that
introduced it is gone. Deleting it would have taken the exercise view down
with it.

today.js drops ~4.1KB, app.css ~0.7KB.


## v3.3.44 (2026-07-21) — Settings stop disappearing
Root cause of the vanishing bodyweight. Two defects, compounding.

**1. The push forged a timestamp.** cloudPush stamped the cloud document
with `DB.settingsAt||Date.now()`. A context that had never recorded WHEN
its settings changed minted a brand-new timestamp at push time — so its
STALE settings outranked every other context's real ones. Any second
context (an old tab, a backgrounded PWA, a laptop) could push settings it
had never updated, stamped "now", and the next pull would overwrite good
settings with them. Now `||0`: a device that doesn't know when its settings
changed must never claim they changed just now.

**2. Thirteen call sites forgot save(true).** Of 25 sites that mutate
DB.settings, only 12 marked the change. The rest left settingsAt stale, so
the edit lost the very next pull — custom exercises and onboarding state
included. Rather than patch 13 call sites and wait for the 26th to forget,
save() now notices when settings actually changed (signature diff, ignoring
lastCloud/lastSync, which change every sync and are not edits) and stamps
them itself.

The settings merge moved into adoptRemoteSettings(), which is a real
function instead of four lines buried in a try/catch — so it can be tested,
and so adopting the cloud's settings records the new signature and isn't
mistaken for a local edit on the following save.

**Why bodyweight specifically?** It wasn't. barKg and smithKg fall back to
`??20`, so a wiped settings object still renders "20 / 20" and looks
healthy. bodyKg has no sensible default, so it alone renders as "—". Every
other setting was equally at risk and equally silent.

test-settings.js: 15 assertions covering both defects, including that a
stale unstamped remote cannot overwrite, that local-only keys survive an
adopt, and that the push no longer forges a timestamp.


## v3.3.43 (2026-07-21) — Sessions open, and read like the Last Time card
**Open by default.** Every day in History's session list now renders
expanded. No tapping to see what you did. The calendar tap still scrolls a
date into view, but it no longer collapses the other days — with everything
open, that would have hidden exactly what this release stops hiding.

**Grouped, not one row per set.** Detail now uses the LAST TIME card's
format: weight on the left, reps as chips. Today's session goes from 20
flat rows to 3 exercise blocks with 5 weight rows.

The grouping rule matters. Exercises are grouped GLOBALLY, by first
appearance — not by consecutive runs. Supersets alternate Side Raise /
Front Raise / Side Raise, so consecutive grouping would have read *worse*
than the flat list it replaces. Within one exercise, folding stays
consecutive, so returning to a weight later still gets its own line and
that exercise keeps its narrative.

**One formatter, two screens.** foldSets() and setRows() move to util.js;
Lift's LAST TIME card and History's detail both render through them, with
a flag for tappability (Lift rows set a weight; History rows are inert).
Fourteen inline lines in lift.js become two. This is the resealDay lesson
applied before the bug rather than after: the same logic in two places is
the same logic drifting in two places.

Side effect worth naming: the dangling "14 kg ×" on legacy sets with empty
reps is gone. foldSets drops bare marker rows, so they never reach the DOM.


## v3.3.42 (2026-07-21) — The heatmap opens on today
The Last 6 Months strip runs oldest → newest, so its default scroll
position showed January and pushed the current week off the right edge —
every visit to Stats started with a manual scroll to find today. Both
scrollers (.heatcols and .heat) are now parked at their right edge after
render. scrollLeft on the element itself, never scrollIntoView, which would
also drag the page vertically — same rule as v3.3.39's year strip.

Caught while in there: the tab-swipe blocklist named .heat but not
.heatcols, which is the element that actually scrolls. Swiping on the
month-label rail could hop tabs mid-drag. Both are excluded now, and
test-scrollpos.js asserts the blocklist covers every sideways scroller in
the app so the next one added can't quietly repeat this.


## v3.3.41 (2026-07-21) — The digest drops what it was repeating
Two removals, marked in red on a gym screenshot.

- **The PR rows are gone.** Three exercises with best-set and lifetime set
  counts. They answered an exercise-level question inside a part-level
  card, and the exercise view already answers it better.
- **"261 sessions" is gone.** It restated the number already printed on the
  chip directly above it ("Shoulder 261d") — the same figure twice, one
  card apart.

What the footer says instead is what the chip cannot: **5,061 sets all
time**. Run, which has no sets, states total distance — also new, since its
chip already carries the day count.

Deleted with them, since nothing else used any of it: partExSets(), the
exSets parameter, and the .prlist/.prrow styles. partDigest(part,sess,opts)
is now a three-argument function.


## v3.3.40 (2026-07-21) — Last Time leads; Today's hero goes part-level
**Exercise view: Last Time above Progression.** Last Time is what you act
on between sets — the numbers you're about to match. Progression is context
you read once. The terminal Complete button stays last, so the screen now
runs template → context → action.

**Today's live hero is the PART digest, not the exercise chart.** The
exercise chart already sits at the bottom of the exercise view; showing the
identical chart on Today taught nothing new. The part digest answers a
question that screen cannot: how does today's whole Shoulder session
compare to the last fourteen — with cadence, growth, and the part's PRs.
Today's bar is red while the session is live (it carries .lbNow, so it
breathes too) and settles to accent once sealed. Daily Fire still returns
when the day is done.

partDigest() gained an optional opts {head, live}; History's call site is
untouched and passes nothing, so one card serves both tabs.

Measured rather than assumed: at the real 918-day archive size, allDays()
costs 3.6ms and the new live hero renders in 60ms against Daily Fire's
71ms — the replacement is CHEAPER than what it replaced, so no caching was
added. (jsdom numbers; a phone is far quicker. perf.js kept as a tool.)

Observed, not fixed: History session rows for legacy sets with no reps
render a dangling "14 kg ×". Real bug, wrong release — say the word.


## v3.3.39 (2026-07-21) — The red bar bug, closed properly
Three fixes from gym use.

**The red header, third occurrence — root-caused this time.** Removing a
whole exercise with its ✕ left the header red on a finished day. The
predicate itself was fine; the problem is that it lived in THREE removal
paths and data-dropex never got the v3.3.20 correction. Extracted to
resealDay(t) in util.js, called by all three. It also now drops seals for
exercises that no longer exist, which the inline copies never did. The
inline duplicates are gone, so a fourth path can't drift. Eleven-case
regression test (test-reseal.js) built from the real day shape: a sealed
Shoulder, a Run sealed at PART level, and an open exercise being removed.

**Swipe no longer steals the year strip.** The tab-swipe handler already
excluded horizontally scrolling surfaces; .ychips just wasn't on the list
because it didn't exist when the list was written.

**The selected year is visible without hunting for it.** After render the
strip centres its active chip — via scrollLeft, not scrollIntoView, which
would also drag the page vertically to reach it.


## v3.3.38 (2026-07-21) — History gets dense; the digest counts sets
Four notes off the first real use of the part axis.

- **Years on one line.** The row goes nowrap with horizontal scroll and
  smaller chips. Scroll rather than shrink-to-fit because 2027 is coming
  and a grid that fits six will not fit ten; the row now degrades by
  scrolling instead of by wrapping.
- **Months smaller.** Padding, gaps and both type sizes come down; the
  12-chip grid loses roughly a third of its height.
- **Body parts smaller.** Same density treatment as the years, which fits
  four per row instead of three.
- **Sets, not just the biggest workout.** The chart caption now reads
  "last 14 · biggest 9,886 kg · 214 sets", each PR row carries its
  lifetime set count, and the all-time line reads "199 sessions · 4,102
  sets". Run keeps its own vocabulary throughout — runs, longest, no set
  counts, because a distance isn't a set.

The three selector rows are navigation, not content, and they were eating
the screen before any data appeared. This is the same reasoning as
v3.3.36's shorter calendar, applied one level up.


## v3.3.37 (2026-07-21) — History gets a second axis: body part
"I can either select the date from the calendar or body parts... so I can
see how consistent I've been and whether I've grown."

A Body part chip row (All + every part with history, each with its lifetime
day count) sits between the month chips and the calendar. Selecting one
filters EVERY date surface below it rather than replacing them — month
counts, the calendar's blue days, the month totals line, and the session
list, which also narrows to that part's sets inside each day. So the two
selectors compose: pick Shoulder, then walk the months and watch the
calendar answer. Tapping the active part again clears it.

Above the calendar, a digest card answers the two questions directly:
- **Consistency** — days trained this year, median cadence over the last
  365 days ("every ~6d"), and days since.
- **Growth** — last 14 sessions as bars with the latest in accent, plus
  the mean of the last 5 sessions vs the 5 before it as one signed
  percentage. Five is enough to survive one light day and short enough to
  still mean "lately". It needs 10 sessions of history before it will
  claim a trend at all.
- **PRs** — the part's three most-trained exercises with their best set.
  Run has no PR rows (a distance isn't a lifted weight) but keeps its
  chart in km.

Data note: built off allDays(), not SEED.partDays — deriveAll caps partDays
at 365 days for the frequency logic, and History has to see all 918.

Also in this release's sibling v3.3.36: the calendar lost a third of its
height, which is what made room for all of the above.


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
