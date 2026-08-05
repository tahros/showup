# Information Disclosure Audit — v3.3.152

Per the Mobile Information Disclosure Rulebook. Component: all triggers are the
(i) `iBtn` → portaled `#tipFloat` popover. Decisions before edits.

| Screen / component | Trigger | Current copy (abridged) | Decision | New copy or action | Reason |
| --- | --- | --- | --- | --- | --- |
| Lift · part · Last time | (i) plast | "Last Legs session, in the order you did it. Tap an exercise to pick up where its bar is loaded — ✓ marks…" | INLINE | Remove icon. Inline: "Tap an exercise to use its previous weight. A checkmark means you completed it today." ✓ gets aria-label. | Rulebook's own correction: 3 ideas, covers list, first clause repeats heading |
| Lift · exercise · Suggested | (i) sug | tap-to-log + ✕-dismiss + ordering | TOOLTIP | "Tap a set to log it again." | One question (what happens if I tap); ✕ self-evident |
| Lift · exercise · This session | (i) sess | "Today on top, last time dimmed below. EDIT to remove or change a set." | REMOVE | — | EDIT is a labelled control; layout self-evident from LAST TIME head; Undo self-surfaces (v3.3.150) |
| Run · Run | (i) run | "Every run you have logged — total…this year's…streak." | REMOVE | — | Repeats the three labelled tiles beside it |
| Run · Next milestone | (i) nextms | "The next round distance you will cross, and how far is left." | REMOVE | — | Card already reads "80.2 km to 2,500" |
| Run · goal (set) | (i) goal | "The tick marks where you should be today." | TOOLTIP | unchanged | One nonstandard mark, one sentence, already compliant |
| Run · goal (unset) | (i) goal2 | "Set a distance target for the year and this becomes a pace bar." | TOOLTIP | "Set a yearly distance target to turn this into a pace bar." | Optional feature, one sentence |
| Run · Every week | (i) eweek | dashes=avg, filled=this week | TOOLTIP | "Distance per week. Dashed line: your average; filled bar: this week." | Chart-reading, 2 short sentences, ≤160ch |
| Run · Distance | (i) cumkm | cumulative by day of year | TOOLTIP | "Cumulative km by day of year. This year is still running." | Already compliant, deticked |
| Run · Pace | (i) pace | lower=faster, red=fastest, blue=this month | TOOLTIP | "Minutes per km for timed runs — lower is faster. Red marks your fastest month." | Colour meanings must be named somewhere; trimmed |
| Run · Records | (i) runrec | best run per measure | REMOVE | — | Repeats the table's own row labels |
| Stats · Weight | (i) bw | flat stretches = unmeasured days | TOOLTIP | "Flat stretches are days you didn't weigh in." | The one non-obvious fact; heading covers the rest |
| Stats · KPIs | (i) kpis | describes the four labelled tiles | REMOVE | — | Repeats visible labels; describes placement |
| Stats · Part mix | (i) pmix | volume per part; runs excluded | TOOLTIP | "Volume per body part per day. Runs excluded — km don't add to kg." | Exclusion is a real question; trimmed |
| Stats · Consistency | (i) yoy | % days per year, bold=this year | TOOLTIP | "Percent of days trained, per year. The bold line is this year." | Chart-reading, trimmed |
| Stats · Last 6 months | (i) heat | column per week, filled=trained | TOOLTIP | "One column per week. Filled squares are trained days." | Trimmed |
| Stats · Days by month | (i) dbm | dashed marks 20; month filling | TOOLTIP | "The dashed line marks 20 days." | Heading covers the rest; one mark, one sentence |
| Stats · Weekdays | (i) wd | accent=today, caret=strongest | TOOLTIP | "▲ marks your strongest weekday. Blue is today." | Symbol named in text per copy rules |
| Stats · Every month | (i) mgrid | darker=more; dashed=current; tap opens | TOOLTIP | "Darker means more days. Tap a month to open it." | Split to two short sentences; ≤160ch |
| Stats · Report card | (i) rep | rotate then send; same numbers reframed | TOOLTIP | "Swipe to a card, then share it as an image." | Second sentence was filler |
| Stats · Records | (i) prs | heaviest set per exercise + day | REMOVE | — | Repeats heading and table columns |
| Today · onboarding card | onbcard | first-run intro | KEEP (out of scope) | — | First-use education, one card, dismissible; rule 17: unrelated |

Component changes (apply to all retained tips): body face 15px/1.45 (was mono
13px); prefer opening ABOVE the trigger so the content below the heading is
never covered, flip below near the top edge; 44px hit area via inset pseudo;
specific aria-labels per trigger; aria-expanded toggled; role=status for
announcement; single-open and tap-outside-dismiss already held.

Ambiguous per rulebook's required report: none — every meaning was resolvable
from the code.
