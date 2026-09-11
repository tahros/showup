# Show Up mascot integration

## Approved source

Geometry and the original shows.jump/hello/dance keyframes come from:
C:/Users/sungj/Documents/Codex/2026-09-02/new-chat/showup-soft-charcoal-site/source.html

Final review: showup-cooling-blue-pulse.html in the parent visualization folder.
B plates are 20% narrower, structural lines shortened/thin, Soft Charcoal,
white face (dark face on White), alpha background and original contact shadow.
The renderer contains the extracted geometry and unchanged pose conversion.
No screenshot reconstruction, bloom, motion blur, or replacement app layout.

## Ownership

- js/mascot.js: markup, static image preload, theme/settings lifecycle,
  completion metrics and explicit-completion milestone stamp.
- js/mascot-renderer.js: createMascot(stage, {mode, theme, still}).
  Returns pause/resume/update/dispose/capture. Approved timing and squash stay here.
- css/mascot.css: local decorative slots and completion/milestone presentation.
- assets/mascot-{charcoal,white}.png: transparent 720×440 stills.
- assets/mascot-mark-{charcoal,white}.png: transparent 512×512 identity crops.
- favicon-32.png: charcoal browser default, switches to White for dark content.
- vendor/three-r169.module.min.js and three-LICENSE.txt: Three.js 0.169.0, MIT.
  Source distribution: https://cdn.jsdelivr.net/npm/three@0.169.0/

Installed OS home-screen assets are deliberately unchanged. These receive OS
masks/background compositing and are not transparent in-page mascot slots.

## States

Hello plays once. Active bounces continuously with a 3.2-second red pulse.
Completion uses the original 2.7-second jump. The 25-day milestone uses the
original dance and a 5×5 sequence of attendance boxes. Completed Today jumps
once, then rests while its material breathes blue over 4.8 seconds.
On the 25th day, completion offers See your milestone; that explicit button
opens the separate milestone beat within the existing accessible dialog.
Keep showing up returns to Today, and Share still opens the unchanged receipt.

White on dark content; Soft Charcoal on light. Only Active and Completed Today
interpolate to approved red/blue palettes. The transparent scene and bottom
contact shadow never tint the page or add a halo.

Two WebGL contexts maximum; lazy import and viewport observer; dispose removed,
offscreen and hidden instances. Reduced motion/Still use a PNG with no renderer.
WebGL failure/context loss leaves a PNG. Off removes decorative slots.
No screen-reader content is hidden by a mascot; all slots are aria-hidden.

## Workout facts

Only the user's explicit Complete action writes completedAt. Duration starts
at the earliest logged set timestamp, with entered run duration subtracted
from a run's log timestamp. It ends at completedAt, not at render time.
This cannot know a lifting set's physical start before the user logged it.
Any untimed/invalid row makes duration unknown; do not substitute now or zero.
Count every rep-array entry as a set, a Run as one, distinct part/exercise pairs
as exercises. Completion edits/reopens do not erase rows.

mascot25Date is stamped only when explicitly closing the 25th recorded
training day, and only if not already awarded. Derivation/import/navigation
never award it. Replays are read-only; later days never automatically replay it.
Existing 100-day celebrations are preserved.

## Regeneration and verification

No build step is introduced. For local browser checks run a localhost server
from the repository on 8768. Install/use Playwright in an isolated tooling
location; set NODE_PATH to it and CHROMIUM_PATH to a local Chromium executable.

- node tools/render-mascot-assets.cjs http://127.0.0.1:8768
- node tools/test-mascot.js .
- node tools/test-mascot-browser.cjs
- node tools/test-mascot-offline.cjs
- node tools/test-daydone.js .
- node tools/test-completion-489.js .
- node tools/test-daycard.js .
- node tools/smoke.js .
- python tools/buildcheck.py .

Browser tests use synthetic records and a fresh isolated browser context, never
the user's browser profile. Browser screenshots go to ../mascot-qa or the
MASCOT_QA_DIR environment directory. Offline test exercises the real SW cache.
On Windows use PYTHONUTF8=1 for the existing import test.

## Rollback

Settings → Mascot → Off restores non-mascot in-app layout and old completion
summary without altering a workout or plan. Still retains static identity.
For a full release rollback, revert the mascot feature commit; do not reset
shared main, remove logs, or revert unrelated planner/header changes.
