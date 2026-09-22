# Working agreement

Three of us change this repo:

- **Sungjee** — owner. Decides what ships.
- **Codex** (OpenAI, from the laptop) — pushes to `main`, keeps `CHANGELOG.md`.
- **Claude** (Anthropic, from a cloud session) — pushes to `main` through a git
  bundle copied to the laptop, then `git push` from there.

Both agents push to the same branch, hours apart, without seeing each other.
On 2026-09-21 that cost a morning: Claude built for three hours on a base
eleven versions stale, rewrote `pwTodayHTML` while Codex had already rewritten
it, and the only thing that stopped a force-push over the other's work was the
push being rejected. These rules exist so that doesn't repeat.

## Before you write code

1. **Fetch first.** `git fetch origin && git log --oneline -3 origin/main`.
   If `origin/main` moved since you last looked, rebase your *plan* onto it
   before writing, not your diff afterwards. Read what changed in the files
   you are about to touch.
2. **Claim it.** Add a line under *In flight* below for anything that will
   take more than a few minutes. One line: date, who, what, which files.
   Delete it when you ship.

## Before you push

3. **Version numbers come from the fetched `main`**, never from memory.
   `python3 tools/bump.py . <old> <new>`.
4. **Gates, all of them:** `bash tools/runsuite.sh .` and
   `python3 tools/buildcheck.py .` must exit 0, plus any `tools/check-*.cjs`
   covering what you changed — those drive real Chromium and need a local
   server; each file's header says how to run it.
5. **A `CHANGELOG.md` entry in the same commit**, newest at the top.
6. **Never force-push `main`.** A rejected push means your base is stale:
   fetch, rebase, re-run the gates, re-bump, push again.
7. **Leave `main` green.** If you find it red and it isn't yours, say so in
   your next message to Sungjee rather than silently fixing or ignoring it.

## In flight

_nothing_

## Known red

Carried from v4.6.84–v4.6.93 (Codex), still failing as of v4.6.101. Verified
pre-existing by running each against the unmodified commit.

Suites (`bash tools/runsuite.sh .`):

- `test-rest.js` — 4: the `Rest.` greeting, the undo button reading, the rest
  state after it, and `--rest` appearing outside rest rules
- `test-theme.js` — 2
- `test-plan.js` — 1: the undo button reading
- `test-planner.js` — 1: workspace default vs the legacy Write toolbar

Chromium checks (run by hand, see each file's header):

- `check-session-comparison.cjs` — `.sc-result` is absent where it expects one
- `check-live-workout.cjs` — the live bar's meta no longer reads `4 sets`

`smoke.js` was red the same way from v4.6.93 (Codex): adding `js/retro.js`
left its script count at 23. That one is a stale constant with no intent to
guess at, so it is fixed at 24 rather than listed here — the whole suite was
crashing on it.

Claude has not touched these; they are someone's in-flight intent, and
guessing at it would do more harm than leaving them.

Several `check-*.cjs` files hard-coded a Windows Chromium path and a port.
Those now read `PW_CHROME` and `PW_PORT` first and fall back to what they
had, so either of us can run them.
