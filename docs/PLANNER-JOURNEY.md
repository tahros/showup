# Planner journey — v4.6.0

Objective: make planning easy to edit and preserve enough evidence for a
future learning engine to compare the accepted plan with the actual workout.

## Visible flow

Today → Plan → Dates → editable day overview → individual day → Save → Done.
Preferences are accessible through step 0 and through Settings. Paste can replace
the active routine, or explicitly apply to all selected dates. Saved plans are
not altered until Save is pressed.

The connected stepper remembers completed stages. A changed date selection
disables Edit/Done until the original editing dates are restored or a new draft
is generated. Editing dates have a light-blue pulse independent of the saved-plan
dot and selection fill. Reduced motion shows a static outline.

Day overview supports workout reordering without moving dates, expansion and
direct multi-day Save. Individual days support exercise reordering, grouped
set-line edits, set/exercise addition, adjacent-day navigation and whole-day
workout history. A changed set total is a pending request, not a silently applied
routine change: regenerate before saving.

Clear distinguishes removing a date from clearing its routine for manual editing.
Saving any zero-set day requires confirmation; it becomes No plan. Logged sets
are never deleted by this action.

## Off-screen data

- Preferences: existing synced settings, with per-key clocks.
- Draft: existing owner-scoped local planner storage. Drafts are not cloud plans.
- Accepted routines: existing plan/week compatibility storage.
- Immutable accepted revisions and individual planned targets:
  `DB.planTracking`, documented in PLAN-LINKAGE.md.
- Actual values and target references: logged workout rows. Mid-workout plan
  edits do not change the original targets.

No new service or database. This uses the current checked writer; it does not
implement long-term feedback memory, automatic adaptive progression, or the
AI-engine quality gate. Those remain separate work.

## Verification

Synthetic-only journey and linkage tests, legacy parser/safety coverage, mobile
light/dark browser interaction tests, and PWA offline reload. No live user account
or paid model calls are used in these tests. Real AI plan quality and simultaneous
offline multi-device day edits are not proven by this UI release.
