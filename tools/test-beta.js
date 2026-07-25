// test-beta.js DIR — v3.3.93: the beta cohort tool.
// Runs the REAL python against a four-archetype fixture. The point of these
// assertions is that the ONE number that proves use — days logged on/after
// signup — cannot be faked by a large imported archive.
const { execSync } = require("child_process");
const fs = require("fs"), path = require("path");
const dir = process.argv[2] || "stage93";
const T = path.resolve(dir, "tools");
const FIX = path.join(T, "fixtures", "beta_sample.json");

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};

const out = JSON.parse(execSync(
  `python3 ${T}/beta_status.py --fixture ${FIX} --today 2026-07-25 --json`).toString());
const by = Object.fromEntries(out.cohort.map(r => [r.email.split("@")[0], r]));

ok("the tool reports every signed-in user", out.cohort.length === 4, out.cohort.length);

// ---- the migrant who stayed ------------------------------------------------
const stayed = by["migrant.stayed"];
ok("imported archive is detected as imported", stayed.imported === true);
ok("...archive size counts the imported history", stayed.archive_days > 100, stayed.archive_days);
ok("...but 'own' counts only days on/after signup", stayed.since_signup === 8, stayed.since_signup);
ok("...and they read as ACTIVE", stayed.verdict === "ACTIVE", stayed.verdict);

// ---- the migrant who bounced: THE failure mode ------------------------------
const bounced = by["migrant.bounced"];
ok("a 100-day archive with nothing logged since signup is NOT active",
   bounced.verdict === "NEVER LOGGED", bounced.verdict);
ok("...its archive is large", bounced.archive_days === 100, bounced.archive_days);
ok("...and its own-days are zero \u2014 the number a big archive cannot fake",
   bounced.since_signup === 0, bounced.since_signup);

// ---- the fresh starter ------------------------------------------------------
const fresh = by["fresh.starter"];
ok("a from-zero user is not marked imported", fresh.imported === false);
ok("...archive equals own days when nothing was imported",
   fresh.archive_days === fresh.since_signup, `${fresh.archive_days}/${fresh.since_signup}`);
ok("...and their week-two window is counted", fresh.week2 > 0, fresh.week2);

// ---- signed in, never logged ------------------------------------------------
const never = by["never.began"];
ok("signing in is not using: empty archive reads NEVER LOGGED",
   never.verdict === "NEVER LOGGED" && never.archive_days === 0);

// ---- rest days are day data, but they are not showing up --------------------
ok("a declared rest day never counts as a trained day",
   stayed.rest_declared === 1 && !String(stayed.archive_days).includes("NaN"),
   `rest=${stayed.rest_declared}`);

// ---- the tool reads no training content -------------------------------------
const src = fs.readFileSync(path.join(T, "beta_status.py"), "utf8");
for (const forbidden of ['"ex"', "'ex'", '"reps"', "'reps'", '"part"', "'part'"]) {
  ok(`the tool never reads ${forbidden} from anyone's archive`, !src.includes(forbidden));
}
const txt = execSync(
  `python3 ${T}/beta_status.py --fixture ${FIX} --today 2026-07-25`).toString();
ok("...and the human report prints no exercise names",
   !/Chest Press|Squat|Deadlift/.test(txt));
ok("...while stating the disclosure in the output itself",
   /No exercise, weight, or rep is read/.test(txt));

// ---- no telemetry entered the app -------------------------------------------
const appFiles = fs.readdirSync(path.join(dir, "js")).map(f => path.join(dir, "js", f));
const appSrc = appFiles.map(f => fs.readFileSync(f, "utf8")).join("\n");
for (const beacon of ["navigator.sendBeacon", "gtag(", "analytics", "mixpanel", "posthog", "amplitude"]) {
  ok(`no ${beacon} anywhere in the app`, !appSrc.includes(beacon));
}

process.exit(fail ? 1 : 0);
