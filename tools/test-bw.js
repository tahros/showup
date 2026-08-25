// test-bw.js DIR — v3.3.66: bodyweight as a dated series, and the profile.
// The rule under test: entering a weight means "it changed today"; entering
// nothing means "unchanged". Reads carry forward; reads before the first entry
// backfill from the earliest one. A weigh-in must never look like a workout.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage66";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const ok = (name, cond) => {
  console.log((cond ? "PASS" : "FAIL"), name, "\u2192", cond);
  if (!cond) fail++;
};
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

// Fixtures are anchored to fixed PAST dates so they cannot rot when the wall
// clock rolls over (test-sessfmt taught us that one).
const SET = `{part:'Chest',ex:'Chest Press',w:40,reps:[10]}`;
const fresh = `DB.days={
  '2024-01-10':{w:[${SET}]},
  '2024-06-15':{w:[${SET}]},
  '2025-03-01':{w:[${SET}]}
}; DB.settings.bodyKg=70; delete DB.settings.bwSeeded; SEED=deriveAll();`;

// ---- 1. no series yet: the old scalar still answers -----------------------
run(fresh);
check("empty series falls back to settings.bodyKg", `bwAt('2024-06-15')`, 70);

// ---- 2. carry-forward is the whole idea -----------------------------------
run(`${fresh} setBw('2024-06-15', 72);`);
check("the entry day reads its own value", `bwAt('2024-06-15')`, 72);
check("a later day carries it forward", `bwAt('2025-03-01')`, 72);
check("silence for years still carries forward", `bwAt('2030-12-31')`, 72);

// ---- 3. before the first entry: backfill, never zero ----------------------
check("a day BEFORE the first entry backfills", `bwAt('2024-01-10')`, 72);

// ---- 4. two entries partition the timeline --------------------------------
run(`setBw('2025-03-01', 68);`);
check("early segment keeps the early weight", `bwAt('2024-06-15')`, 72);
check("the day before a change still reads the old weight", `bwAt('2025-02-28')`, 72);
check("the change day reads the new weight", `bwAt('2025-03-01')`, 68);
check("and everything after it", `bwAt('2026-01-01')`, 68);
check("two entries recorded, not three", `bwDays().length`, 2);
check("bwLast() names the most recent change", `bwLast()`, "2025-03-01");

// ---- 5. the derived current value stays in step ---------------------------
check("settings.bodyKg tracks the latest entry", `DB.settings.bodyKg`, 68);
check("bwNow() agrees with it", `bwNow()`, 68);

// ---- 6. clearing an entry removes it, and the reads fall back -------------
run(`setBw('2025-03-01', 0);`);
check("clearing drops the entry", `bwDays().length`, 1);
check("...and later days revert to the earlier weight", `bwAt('2026-01-01')`, 72);

// ---- 7. THE STREAK GUARD: a weigh-in is not a workout ---------------------
// deriveAll() skips days with no rows. If that ever changes, 926 days of
// attendance silently inflates — the one number the whole product rests on.
run(`${fresh} const before=deriveAll().totals.sessions;
     setBw('2024-09-09', 71); SEED=deriveAll();
     globalThis.__before=before;`);
check("a weigh-in-only day is stored", `DB.days['2024-09-09'].bw`, 71);
check("...but adds NO training day", `SEED.totals.sessions === __before`, true);
check("...and never enters the derived sessions", `!!SEED.sessions['2024-09-09']`, false);
check("...while still being readable", `bwAt('2024-10-01')`, 71);

// ---- 8. migration seeds the archive from the old scalar -------------------
run(`${fresh}`);
check("migrateBw seeds once", `migrateBw()`, 1);
check("...at the FIRST logged day, so the whole archive reads at it",
      `DB.days['2024-01-10'].bw`, 70);
check("...which is what old bodyweight lifts are now valued at", `bwAt('2024-06-15')`, 70);
check("...and it is idempotent", `migrateBw()`, 0);
run(`delete DB.settings.bwSeeded;`);
check("...even if the flag is lost, an existing series is not overwritten",
      `migrateBw()`, 0);

// ---- 9. a weigh-in survives the unstamped LWW union -----------------------
run(`${fresh} DB.days['2024-06-15'].w=[${SET}]; delete DB.days['2024-06-15'].upd;`);
run(`(function(){ const lv=DB.days['2024-06-15'], rv={w:lv.w.map(s=>({...s})), bw:73};
      const seen=new Set(lv.w.map(sig));
      for(const s of rv.w||[]) if(!seen.has(sig(s))) lv.w.push(s);
      if(rv.bw&&!lv.bw) lv.bw = rv.bw; })();`);
check("remote bw is adopted when neither side is stamped", `DB.days['2024-06-15'].bw`, 73);
const coreSrc = fs.readFileSync(path.join(dir, "js/core.js"), "utf8");
const unionCarries = /if\(rv\.bw&&!lv\.bw\)/.test(coreSrc);
console.log((unionCarries?"PASS":"FAIL"), "core.js union branch carries bw →", unionCarries);
if (!unionCarries) fail++;

// ---- 10. the profile: escaping and first name -----------------------------
run(`DB.settings.name='  Sungjee  Kim ';`);
check("firstName takes the first token", `firstName()`, "Sungjee");
run(`DB.settings.name='<img src=x onerror=alert(1)>';`);
check("a hostile name is escaped, not executed",
      `firstName().indexOf('<')===-1`, true);
run(`DB.settings.name=null;`);
check("no name is the empty string, not 'null'", `firstName()`, "");

// ---- 11. the greeting is a STATE: present on arrival, gone once logged ----
run(`${fresh} DB.settings.name='Sungjee'; SEED=deriveAll();
     delete DB.days[todayISO]; view='today'; renderToday();`);
check("greeting shows before the first set", `/class="hello"/.test($('#view').innerHTML)`, true);
check("...and it uses the first name", `/Sungjee/.test($('#view').innerHTML)`, true);
check("...with the day count beside it", `/days in\./.test($('#view').innerHTML)`, true);

run(`day(todayISO).w=[${SET}]; renderToday();`);
check("greeting LEAVES once a set is logged",
      `/class="hello"/.test($('#view').innerHTML)`, false);

run(`${fresh} DB.settings.name=null; delete DB.days[todayISO]; renderToday();`);
check("nameless greeting still renders (strangers get one too)",
      `/class="hello"/.test($('#view').innerHTML)`, true);
/* v3.3.319: this regex was BROKEN, and had been since it was written. Inside
   a template literal `\.` collapses to `.` before the vm ever sees it, so the
   sandbox received /, ./ — comma, space, ANY character. It passed only
   because Today's markup happened to contain no commas at all; the moment
   the plan's tip text arrived ("for today only, is never written...") it
   fired on prose. The v3.3.68 lesson, in a second place.
   Scoped to the greeting too: a stray comma in the HELLO is what this ever
   cared about, not commas anywhere on the tab. */
check("...and carries no stray comma",
      `/,\\s*\\./.test(document.querySelector('.hello').innerHTML)`, false);

// ---- 11b. the clock, in five dry words (v3.3.76) --------------------------
check("4am is Early, not Morning", `helloPart(4)`, "Early");
check("8am is Morning", `helloPart(8)`, "Morning");
check("1pm is Afternoon", `helloPart(13)`, "Afternoon");
check("7pm is Evening", `helloPart(19)`, "Evening");
check("11pm is Late, not Evening", `helloPart(23)`, "Late");
check("the bands cover every hour", `[...Array(24).keys()].every(h=>helloPart(h))`, true);

// the subline is a receipt, never a compliment
check("plain day count outside a milestone window", `helloSub(700)`, "700 days in.");
check("inside 75 of a round thousand it counts down", `helloSub(928)`, "928 days in \u00b7 72 to 1,000.");
check("the milestone day itself rolls to the next window", `helloSub(1000)`, "1,000 days in.");
check("...and 1500 is a milestone too", `helloSub(1460)`, "1,460 days in \u00b7 40 to 1,500.");
check("zero days is silence, not zero", `helloSub(0)`, "");
const todaySrc = fs.readFileSync(path.join(dir, "js/today.js"), "utf8");
const helloRaw = (todaySrc.match(/function helloPart[\s\S]*?function renderToday/) || [""])[0];
/* v3.3.106: strip COMMENTS before hunting string literals. The extractor
   pairs up apostrophes, so a single "can't" or "doesn't" in a comment opens
   a phantom string that swallows the code after it \u2014 including any
   legitimate `if(!el)` \u2014 and this guard then fails for a reason that has
   nothing to do with the greeting. The assertion is about what the greeting
   can SAY, so it must read strings only. */
const hello = helloRaw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const strings = [...hello.matchAll(/'[^']*'|`[^`]*`/g)].map(m => m[0]).join("");
ok("no exclamation mark can reach the greeting (its strings carry none)",
   !strings.includes("!"));

// ---- 12. Settings exposes the fields it claims to ------------------------
run(`${fresh} renderSync();`);
const sv = () => run(`$('#view').innerHTML`);
for (const [id, label] of [["youName","name"],["youBw","weight"],["youSave","save"],["barW","bar"]]) {
  const ok = sv().includes(`id="${id}"`);
  console.log((ok?"PASS":"FAIL"), `settings renders the ${label} field →`, ok);
  if (!ok) fail++;
}
// v3.3.77 — one name field, and the first-word rule is stated
run(`DB.settings.name='Sungjee Kim'; renderSync();`);
const nameNote = sv();
ok("the settings card states what it will call you",
   /Greets you as <b>Sungjee<\/b>/.test(nameNote));
ok("...and there is exactly ONE name field, not First/Last",
   (nameNote.match(/id="youName"/g) || []).length === 1 && !/[Ll]ast [Nn]ame/.test(nameNote));
run(`DB.settings.name=null; renderSync();`);
ok("...nameless, it explains the first-word rule instead",
   /Only the first word is used/.test(sv()));
run(`DB.settings.name='<b>Hax</b> Kim'; renderSync();`);
// Ask the DOM, not the serialized string: injection would produce a real <b>
// element containing exactly 'Hax'; escaping renders it as visible text. The
// serialized form is a trap — attribute values legally carry '<' unescaped.
ok("...and the note escapes a hostile name too",
   run(`![...$('#view').querySelectorAll('b')].some(b=>b.textContent==='Hax')`));
run(`DB.settings.name=null; renderSync();`);
const hasSex = /data-sex="m"/.test(sv()) && /data-sex="f"/.test(sv());
console.log((hasSex?"PASS":"FAIL"), "settings renders the sex segment →", hasSex);
if (!hasSex) fail++;
const gone = /id="bodyW"/.test(sv());
console.log((gone?"FAIL":"PASS"), "the old bodyW field is retired →", !gone);
if (gone) fail++;

process.exit(fail ? 1 : 0);
