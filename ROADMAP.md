# ShowUp — Product Roadmap
*Last updated: 2026-07-18 · Owner: Sungjee · Living document*

## Mission
Days > volume. ShowUp exists to make **showing up** the thing people optimize,
measure, and celebrate — for people who already own their training story and
want a tool worthy of it.

## Who it's for
Lifters/runners with **3+ years of history** who log everything — organized,
30–50s, "J-type" people whose data currently lives in notebooks and Excel files
transcribed from notebooks. Niche by design. They don't want an app to tell them
who they are; they want one that finally reflects it.

## Product principles
1. **The user's history is the engine.** Suggestions, tiers, readiness, nudges —
   all derived from what the user actually does, never from templates we impose.
2. **Six-part taxonomy is the universal default** (Chest/Back/Legs/Shoulder/
   Biceps/Triceps + Run + custom). Alternative splits (upper/lower, PPL,
   full-body) are *data-structure additions*, not rewrites.
3. **Free logs forever.** Monetize depth (intelligence, automation, routines) —
   never the user's own data or their streak.
4. **Serverless as long as possible.** GitHub Pages + Supabase, zero ops.
   A server appears only when 10+ committed users exist and need it.
5. **Data leaves freely.** Export is a right, not a feature.
6. Rules before pixels; diffs before rewrites; verify before ship.

---

## v3.0 — The Foundation  *(SHIPPED 2026-07-18: v3.0 → v3.0.3)*
The seed leaves index.html. All stats derive at boot from raw days; the Supabase
archive merges into `days` as the single source of truth.
- Boot-time derivation of all stat maps, gated on a **diff harness** proving
  derived == embedded across all 7,845 rows before cutover.
- Archive → days migration, stamped for per-day LWW sync.
- index.html shrinks ~75%; push payload stops carrying the duplicate archive.
- Seed retained one release as dormant fallback; stripped in v3.0.1.
**Gate:** harness byte-exact ✅ (all 13 maps, 7,845 rows) · gym-week daily-drive: IN PROGRESS (counts from 07-18, post unit corrections).
Shipped along the way: v3.0.1 true kilometers (sheet runs were miles → 2,377.8 km);
v3.0.2 true weights (per-equipment ledger decoding, benchmark-calibrated → 6,522,091 kg,
Squat PR 120.2); v3.0.3 History de-duplication + consumer audit.
**v3.0.4 (pending gate): strip embedded SEED0 → ~75% file shrink.**

## v3.1 — Clean Slate  *(SHIPPED 2026-07-18; gate open: first unassisted friend install)*  *(minor · the hand-off build)*
A new Google account boots to an honest, welcoming empty app.
- Empty states for every screen; nothing assumes history exists.
- 3-screen chip onboarding: pick parts (six-part default, editable), custom
  exercise names, units + bodyweight.
- **Demo mode**: clearly-labeled sample data to feel the app before logging.
- INSTALL.md rewritten for a non-technical installer.
**Gate:** one friend/family member installs unassisted and logs a real workout.

## v3.2 — The Daily Fire  *(minor · motivation layer II)*
- **Today-vs-every-day graph:** today's cumulative volume drawn live against the
  distribution of all past days — every set visibly climbs the ranks
  ("already your 61st-biggest day"). Daily granularity, per-set animation.
- Streak-at-risk styling when today is unlogged and the streak is alive.
- **Monthly report card:** one shareable image — days shown up, km, PRs.
**Gate:** Sungjee reports reaching for it mid-workout unprompted.

## v3.3 — Your Data, Yours  *(minor)*
- CSV export returns as a user right: share-sheet download, per-year or full.
- One-time "Export to Google Sheet" (existing OAuth, minimal scopes).
- Local backup file (download / restore).
*(The auto-updating Sheet with charts is v5 — broader scopes, sync semantics.)*

## v4.0 — The Routine Engine  *(major)*
Routines become data on top of the six-part default.
- Routine = named parts, split style (parts / upper-lower / PPL / full-body),
  movement membership, dormancy rules, target cadence overrides.
- Suggestion engine parameterized: tiers, readiness, session meter, nudges all
  consult the active routine.
- Save / switch / export routines; templates-from-history ("my usual Chest day");
  importable routine files (the future marketplace artifact).
**Gate:** a PPL user and a calisthenics user both feel native without code edits.

## v5.0 — Ways In and Out  *(major)*
- **Paste-import** from Excel/Sheets with column mapping — ≤4 steps from
  spreadsheet to full history. This is THE intake path for the target audience.
- Chip-survey routine builder for analog-notes people (no AI chat yet).
- **Auto-updating Google Sheet** the user owns: tables + charts, refreshed on
  sync. The flagship "your data outside the app" feature.
**Gate:** a stranger's 2+ years of Excel history imports cleanly in <10 minutes.

## v6.0 — Show Up Together  *(major · first server components, if 10+ users)*
- Premium: free = unlimited logging + core stats forever; paid = intelligence
  (progression, readiness, nudges, report cards), automation (auto-Sheet),
  routines/marketplace, multi-device niceties. Pricing form (lifetime vs sub): open.
- **Cheering-first social:** opt-in, pseudonymous cohorts (age-band/area/
  modality), a feed of people showing up, milestone celebrations, buddy streaks.
  Ranks de-emphasized; the verb is *cheer*, not *beat*.
- Marketplace seeds: coach-made routine files; AI-generated routines considered
  only here.
**Gate:** 10 committed users; social ships only if cheering can't be gamed into
competition.

---

## Explicitly deferred / declined
- AI-chat intake (cost + server; chip survey wins for now)
- Rankings-first leaderboards (against the mission)
- Storage-capped free tier (punishes the exact behavior we celebrate)

## Standing decisions log
- 2026-07-17: Six-part taxonomy = universal default (Sungjee)
- 2026-07-17: Monetize depth, never data (Sungjee + Claude)
- 2026-07-17: Serverless until 10+ committed users (Sungjee)
- 2026-07-17: Cohorts pseudonymous, cheering-first (Sungjee)
- 2026-07-18: Sheet-era units decoded per equipment (miles; smith=kg, dumbbell=lb-of-kg-iron, barbell=per-side-lb+45lb bar, stacks=lb); benchmark week = 07-13 onward (Sungjee)
- 2026-07-18: Historical corrections are stamped in-app migrations with pre-conversion backups — never manual data edits (pattern)
- 2026-07-18: Rest is ABSENCE, never declared — "absence IS a choice." An empty today is unwritten until midnight; no rest-marking UI, ever (Sungjee)


## Execution order — locked 2026-07-18 (post v3.1.4)

**Wave 1 — ship now, no gates (retention fuel before hand-off):**
1. v3.2.3 Streak-at-risk: evening + unwritten today + streak alive → calm visual
   urgency (never calls it rest; "streak ends at midnight" framing). Tiny.
2. v3.2.4 Monthly report card: shareable image — days trained, volume, km,
   streak, month heat-strip. Feeds the daily-writing distribution habit. Medium.
3. v3.3 Data out: CSV export + local backup file (download/restore) + one-time
   Google Sheet export. The "leaving is easy" pillar gets a UI — trust proof
   BEFORE asking friends to invest days. Medium.

**Then STOP building and hand off. GTM Phase 1 governs everything after.**

**Wave 2 — gated on first friends (their confusion is the backlog):**
4. v3.1.x onboarding fixes from watching real installs.
5. v3.4 Custom exercises — triggered by the first real catalog gap, not before.

**Wave 3 — gated on Phase 1 retention (week-two gate):**
6. v4.0 Routine Engine: named session templates, learned per-part ordering.
7. v5.0 Import: paste-your-spreadsheet wizard (reuse the per-equipment unit
   forensics from the v3.0.2 decoding as an import feature) + auto-updating
   Sheet mirror. The wedge for 3+yr J-type loggers.

**Wave 4 — gated on Phase 2 (public launch traction):**
8. v6.0 Premium (depth, never data) + pseudonymous cheering-first cohorts.

**Standing watch-items:** 2,400 km milestone (~fires this week); 2026 km goal
revisit (owner: Sungjee); true-units sanity during gym week; PAT revocation.


## Upcoming versions — planned changes (written 2026-07-18, post v3.1.15)

Each entry = what WILL change. When shipped, the CHANGELOG entry records what
DID change and which request drove it.

### v3.2.3 — Streak-at-risk (tiny)
- After 18:00, today unwritten, streak alive: flame + streak count shift to a
  warm at-risk tone; dashed today-square warms to match; rhythm board gains
  one line: "streak ends at midnight." Nothing else. Never calls today rest.

### v3.2.4 — Monthly report card (medium)
- Shareable image (canvas → PNG → share sheet): month heat-strip, days
  trained, volume, km, streak, and the consistency-grid row for the month.
  Inherits the D1 decluttered aesthetic — ships AFTER D1.

### v3.3 — Data out (medium) — SHIPPED v3.3.0
- Settings → "Your data": CSV of all sets; JSON backup download + restore
  (safety copy + LWW re-stamp); Sheets via clipboard TSV instead of the
  Sheets API — new OAuth scopes rejected in favour of one paste.

### ── HAND-OFF: URL to friend #1. Wave 2 is written by their confusion. ──

### v3.4 — Custom exercises (gated on first real catalog gap)
- Add-exercise flow per part; custom entries flow through derive/sync/catalog.

### v4.0 — Routine Engine (gated on Phase-1 week-two retention)
- Named session templates; learned per-part exercise ordering; one-tap
  "run my usual Chest day."

### v5.0 — Import (gated on Phase 2)
- Paste-your-spreadsheet wizard; per-equipment unit decoding (the v3.0.2
  forensics, productized); optional auto-updating Sheet mirror.

### v6.0 — Premium + cohorts (gated on Phase 2 traction)
- Depth paid, data never; pseudonymous cheering-first cohorts.

### Design workstream (parallel — see DESIGN.md)
- D1 Declutter (Tesla pass) → D2 Juice (game feel) → D3 Touchable data.
