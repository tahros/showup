# v3.3.483 — Selected Today blue

Scope: one CSS fill override, plus version stamps and release documentation.
No completion-flow, storage, navigation layout or recovery changes.

- Buildcheck passes; all 63 Node suites pass.
- New selector test covers 48 combinations of app theme, bar appearance,
  selected tab and day state. Removing the override makes that test fail.
- Isolated browser fixture imports the real CSS and navigation markup, without
  executing app scripts or touching workout data. It supplies horizontal row
  geometry separately, because it does not run the v482 layout recovery.
- Chromium rendered selected completed Today on a Dark bar as #4C6BE3 in
  the dark app and #2F4BD8 in the light app. Switching to Train restores the
  existing #95A4E8 fill. Reselecting Today restores the main blue.
- Existing pale-ink contrast tests remain applicable to the default states;
  they do not certify the new saturated-blue exception. Its lower contrast
  is the tradeoff of using the exact requested main blue on the unchanged
  grey selection capsule.

Reproduce: serve the repository, open tools/nav-blue-browser.html, select
Dark bar and completed day, then toggle the app theme and Today/Train tabs.
This is desktop Chromium verification, not a physical-phone test.
