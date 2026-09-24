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
4b. **Regenerate the update manifest, last, after every other edit:**
   `python3 tools/build-dist.py . && python3 tools/build-ota.py .` (or
   `npm run build:ota`). `ota.json` lists the SHA-256 of every shipped file;
   the iOS app installs an over-the-air update only if every hash matches, so
   a stale manifest means phones silently skip the release. buildcheck fails
   on a stale one and names the file. Commit `ota.json`; `dist/` stays ignored.
5. **A `CHANGELOG.md` entry in the same commit**, newest at the top.
6. **Never force-push `main`.** A rejected push means your base is stale:
   fetch, rebase, re-run the gates, re-bump, push again.
7. **Leave `main` green.** If you find it red and it isn't yours, say so in
   your next message to Sungjee rather than silently fixing or ignoring it.

## In flight

**Claude — iOS App Store track.** Sungjee wants ShowUp on the App Store, with
the listing live before the day-1,000 Show HN post. This is a native Capacitor
shell around the existing static app, so most of the work lands in this repo
and some of it changes the web build too. Landed and planned:

- v4.6.104 — IBM Plex self-hosted (done). Also fixes an offline bug in the PWA.
- v4.6.105 — `dist/` pipeline, Capacitor config, service worker gated out of
  the native shell (done). `npm run build:dist && npm run check:dist`; both are
  guarded in buildcheck. `dist/`, `ios/` and `node_modules/` are gitignored.
- v4.6.106 — the durable record (done). Read the block comment above `durable`
  in js/core.js before touching save/load/flushSave: four rules, each guarded
  in buildcheck and proven in tools/test-durable.js. **`localStorage` is not
  legacy; it is the write-ahead log.** Do not remove it.
- v4.6.110 — over-the-air web updates for the iOS app (done): js/ota.js,
  tools/build-ota.py, ota.json. Adding a native plugin to package.json fails
  build-ota until it is named in PLUGIN_JS — on purpose (see the file header).
- v4.6.111 — Google sign-in inside the iOS app (done): PKCE through the
  in-app Safari sheet, back via `co.yooooooooo.showup://login`. Read the
  block above `AUTH_SCHEME` in js/core.js. The web path is untouched. The
  scheme is registered by tools/ios-config.py, which `npm run sync:ios` runs
  after `cap sync` (ios/ is gitignored, so Info.plist edits live in that
  script, not by hand in Xcode). buildcheck ties the two schemes together.
  `sync:ios` no longer runs check:dist: it needs Playwright, which the Mac
  does not have. Run check:dist here, before pushing.
- v4.6.113 — account deletion (done): Settings → Delete account…, server in
  supabase/functions/delete-account (deployed by deploy-fn.yml, no secrets).
  Sign-out and deletion both go through forgetDevice() in js/core.js.
  Any new Edge Function must allow `capacitor://localhost` (buildcheck).
- v4.6.114 — OTA updates now install: js/ota.js applies a newer queued bundle
  at launch (otaApplyPending). Read its header before touching the updater
  calls; the fake in tools/test-ota.js models the plugin's delay rules and
  must keep doing so.
- Next: Sign in with Apple (App Review 4.8, forced by the Google provider);
  in-app account deletion (4.9/5.1.1(v)); HealthKit write + local
  notifications (4.2 minimum functionality).

If you touch `index.html`'s head, `sw.js`'s SHELL, `css/fonts.css`, or the
sign-in/settings flow, say so here first — those are the files this track is
standing on.

## Resolved test debt (v4.6.102)

2026-09-22: all 110 suites exit 0. The historical failures listed below are
resolved: assertions now follow the approved Rest day / Undo rest day copy,
the no-plan Plan entry, and computed theme colors (real palette checked in
Chromium). View-transition stubs return finished promises. The two Chromium
checks now follow the outcome checkmark, asynchronous edit transition and
current-session count after reopening; both pass. No workout behavior changed.
Header glass, Rest chrome, and Retro checks also pass. Local test dependencies:
jsdom 26, canvas, TypeScript 6 (7 no longer exposes the compiler API used here).
The header's absolute material layer is the sole approved backdrop-blur
exception (4px; Normal Light 8px as of v4.6.103); nav/fixed-element blur remains prohibited. iOS device QA is
still advisable given the older fixed-chrome issue.

Historical record (not current failures):

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

## Cardio (v4.6.108)

`CARDIO_EX` in js/core.js is the single source for cardio. Two rules:
- **Shape, not name.** Use `isCardio(s)` / `isCardioR(r)` — a cardio exercise
  with NO reps. A legacy "Cycling 45 lb × 5" row has reps and must keep
  reading as a set. Never test `ex==='Run'` to mean "distance/time row".
- **`ex==='Run'` means running.** Lifetime km, monthly km, milestones, the
  distance race and the day-done km are running-only on purpose. `part` stays
  `'Run'` (the Cardio part's key); `partLabel()` makes it say Cardio.

## Known flaky

- `tools/check-session-comparison.cjs` fails intermittently with `0 == 1`: 2 of
  4 runs on unmodified v4.6.106, passing the rest. Found by Claude while
  confirming v4.6.107 did not cause it. Not fixed; flagged here for the owner.
- Browser checks write screenshots with `../` paths, i.e. into the repo root.
  `.gitignore` now covers `session-live-*.png` and `live-workout-*.png`;
  `header-glass-live-qa.png` is tracked, so a check run leaves it modified —
  `git checkout -- header-glass-live-qa.png` before committing.
