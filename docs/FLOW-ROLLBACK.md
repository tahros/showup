# TODAY and TRAIN layout rollback

## Immediate, per device

Open Settings, find **TODAY & TRAIN layout**, choose **Previous**.
Choose **Refined** to try the approved layout again.

Both use the same workout and plan data. Nothing is restored from an old
backup, and nothing is deleted. Each device keeps its own choice. Previous
restores the pre-trial rows, plan styling and Last Time fold behavior. The
small layout selector remains so the choice can always be reversed.

As of v3.3.517, Previous also disables the refined tab shimmer and restores
the earlier tile/row treatment. The shared compact age wording and neutral
header count are separate corrections and remain in both layouts.

## Whole-release rollback for the maintainer

Baseline is commit `efe0fd6`, tag `v3.3.515-pre-flow-refinement`.

Prefer a forward release setting the `flowLayout` default to `previous` while
retaining the opt-in selector. If removing the implementation instead, revert
the refinement commit on a new branch from the **current** main. Review any
conflicts against Claude's later work. Never reset main to the old tag and
never restore workout backups as part of a UI rollback.

In either case, bump to a NEW version with `tools/bump.py`, add the changelog
entry, run the full suites and buildcheck, then merge through a pull request.
Do not deploy the old service-worker version: a new cache stamp is required
so installed phones receive the rollback.

The trial has no database migration and no server changes. Its only new
storage keys are `showup:flow-layout` and `showup:flow-last-fold`. The original
Last Time preference remains in `DB.settings.plFold`, untouched by Refined.
