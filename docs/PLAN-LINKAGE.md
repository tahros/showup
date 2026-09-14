# Stage 1 — plan-to-workout linkage

Implemented for v4.5.33. Checked origin/main and header at e167a02 / v4.5.32.
No provider calls, AI policy changes or new database tables.

## Storage

The existing account JSON document gains:

- planTracking.v = 1
- planTracking.revisions[id]: immutable saved content, targets, date,
  acceptedAt (time observed/saved on this version), parentId and source.
- planTracking.heads[date]: current revision reference, fingerprint and clock.
- days[date].planBasis: the revision snapshot present at the first new log,
  or an explicit null revision if there was no saved plan.
- Each newly logged row receives setId. Strength/hold rows may also carry
  planRef {revisionId, setId, target, method}. Actual load/reps stay in w/reps.

All stored strength loads remain kg. Display conversion never changes them.
The existing parser still does not model running distance/time targets;
running logs receive identity, not an invented strength target.
Unparsed notes are retained in revision content, never turned into guessed sets.
Older sets are not backfilled. Saving a plan never touches DB.days.
Drafts remain in the existing local draft store; only saved plans are archived.
Opening/rendering a comparison does not write records.

## Logging behavior

The next available compatible target for the exercise is the default
(method next-in-order). Tapping a target selects it explicitly (method
explicit) and loads its values without logging. Extra set leaves the next
actual unassigned. Load and reps need not equal the target: deviations are
facts, not failures. Rep and hold targets cannot cross-match.

Once logging starts, edits to the saved plan create another revision but do
not change the workout's basis. The comparison explains this. A plan added
after a workout began without one does not retroactively claim its sets.
Targets show a neutral dash when no linked result exists; no missed/failed
classification or compliance score is computed.

Deletion removes the actual link and makes its slot selectable again.
Undo restores the same ID/link. Editing load/reps preserves the original
target. Adding multiple entries through the set editor keeps the first
identity and creates unplanned extras with distinct IDs. Moving an exercise
preserves its actual identity, detaches an incompatible target and retains
previousPlanRef for provenance.

## Sync and compatibility

Local persistence and JSON backup include the entire DB. cloudPushNow includes
planTracking; cloudPull unions immutable revisions and merges dated heads.
Days retain the existing last-write-wins policy. This stage does not promise
conflict-free simultaneous offline editing of the same workout on two devices.
For identical timestamped facts, additive IDs and links survive a legacy
round-trip. New metadata is excluded from legacy deduplication signatures.
The frozen revision travels inside the day as well as in revision history.

Older builds cannot understand the new fields; use the updated build on all
devices before relying on revision history. A legacy device can still discard
unknown top-level history when replacing the cloud document. Do not delete
linkage data as a rollback: disabling the comparison must retain provenance.

## Verification

- tools/test-planlink.js: immutable revisions, legacy preservation, changed
  loads/reps, deletion/Undo, explicit/extra sets, holds, profile preservation,
  metadata merge, real Add set UI, multi-entry edits and moves.
- tools/test-planlink-browser.cjs: isolated synthetic light/dark flows at
  320/393/430px, actual clicks, readable columns, 44px controls, reload and
  a real service-worker offline reload.
- Existing planner, plan-sync, session, import, Undo and readback suites.
- The legacy inferred-dial renderer remains covered separately by
  test-planzone; the new comparison is tested without that legacy stub.

No live user data, production writes or paid model calls are used in tests.
