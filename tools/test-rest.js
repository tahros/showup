// test-rest.js DIR — v3.3.79: the declared rest day.
// The four agreed lines, each enforced: (1) never touches streak math,
// (2) undeclared rest stays first-class, (3) training always wins,
// (4) the app never asks.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage79";

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
const ok = (name, cond, extra) => {
  console.log((cond ? "PASS" : "FAIL"), name, extra === undefined ? "" : "\u2192 " + extra);
  if (!cond) fail++;
};
const check = (name, expr, want) => { const got = run(expr); ok(name, String(got) === String(want), got); };

const SET = `{part:'Chest',ex:'Chest Press',w:40,reps:[10]}`;
// yesterday..3 days back trained, so a streak exists and today is at risk
const FIX = `(function(){
  DB.days={}; DB.settings.name='Sungjee';
  const d=new Date(todayISO+'T00:00');
  for(let i=1;i<=3;i++){
    const dd=new Date(d); dd.setDate(dd.getDate()-i);
    DB.days[dd.toISOString().slice(0,10)]={w:[${SET}]};
  }
  SEED=deriveAll(); return currentStreak();
})()`;

// ---- 0. the toggle itself -------------------------------------------------
run(FIX);
run(`view='today'; render();`);
ok("the button is offered when nothing is logged",
   /id="restBtn"/.test(run(`$('#view').innerHTML`)));
ok("...reading '\u{1F343} Rest day', unlit", /\u{1F343} Rest day/u.test(run(`$('#view').innerHTML`)));
run(`$('#view').querySelector('#restBtn').click();`);
check("tap declares: the flag lands on today", `!!DB.days[todayISO].rest`, true);
check("...with a fresh stamp for LWW", `DB.days[todayISO].upd>0`, true);
ok("...and the button flips to the undo reading",
   /Resting today \u00b7 tap to undo/.test(run(`$('#view').innerHTML`)));
run(`$('#view').querySelector('#restBtn').click();`);
check("tap again walks out: flag gone", `!!DB.days[todayISO].rest`, false);

// ---- 1. LINE ONE: the streak math is untouched ----------------------------
run(FIX); run(`globalThis.__s0=currentStreak(); globalThis.__n0=SEED.totals.sessions;`);
run(`day(todayISO).rest=true; day(todayISO).upd=Date.now(); SEED=deriveAll();`);
check("declaring rest changes the streak not at all", `currentStreak()===__s0`, true);
check("...and adds no training day", `SEED.totals.sessions===__n0`, true);
check("...and the rest-only day never enters derived sessions",
      `!!SEED.sessions[todayISO]`, false);
// streakAtRisk gates on the wall clock (RISK_HOUR=18); freeze it so this
// suite cannot rot with the hour it runs at — the test-sessfmt lesson.
run(`RISK_HOUR=0;`);
check("streakAtRisk() still tells the truth underneath", `streakAtRisk()`, true);

// ---- the header chip: leaf where the fire sits, chip ONLY -----------------
run(`renderHeader();`);
check("the chip shows the leaf", `$('#hStreak').textContent`, "\u{1F343} rest");
check("...and drops the at-risk pulse (the chip states a decision)",
      `$('#hStreak').classList.contains('atrisk')`, false);
// v3.3.80: the chip's BASE rule is record-red (the fire earns it, the leaf
// must not inherit it). jsdom sees no colour, so assert the mechanism: the
// class flips, and its rule reads muted with no red variable in it.
check("...and wears the restchip class", `$('#hStreak').classList.contains('restchip')`, true);
// v3.3.81: the header takes the mirror-of-live wash while the leaf is up
check("...and the header wears .resting \u2014 the mirror of .live",
      `document.querySelector('header').classList.contains('resting')`, true);
check("...never both states at once", `document.querySelector('header').classList.contains('live')`, false);
run(`view='today'; render();`);
ok("SCOPE: the hero still says 'ends at midnight' \u2014 header chip only, no soothing",
   /ends at midnight/.test(run(`$('#view').innerHTML`)));
run(`day(todayISO).rest=false; delete DB.days[todayISO].rest; renderHeader();`);
check("undeclared, the fire returns", `$('#hStreak').textContent`, "\u{1F525} 3d");
check("...and sheds the restchip class with it", `$('#hStreak').classList.contains('restchip')`, false);

// ---- 2. LINE TWO: undeclared rest is first-class --------------------------
// an undeclared rest day and a declared one are indistinguishable in every
// derived total; the flag exists nowhere in deriveAll's outputs
run(FIX);
run(`day(todayISO).rest=true; day(todayISO).upd=Date.now();`);
const withFlag = run(`JSON.stringify([SEED.totals, Object.keys(SEED.sessions).length])`);
run(`delete DB.days[todayISO].rest; SEED=deriveAll();`);
const without = run(`JSON.stringify([SEED.totals, Object.keys(SEED.sessions).length])`);
ok("declared and undeclared rest produce identical derived numbers", withFlag === without);

// ---- 3. LINE THREE: training always wins ----------------------------------
run(FIX);
run(`day(todayISO).rest=true; day(todayISO).upd=Date.now();`);
run(`day(todayISO).w.push({part:'Chest',ex:'Chest Press',w:40,reps:[10],at:Date.now()}); save(true);`);
check("the first set clears the flag through save() \u2014 no call-site audit",
      `!!DB.days[todayISO].rest`, false);
run(`renderHeader();`);
ok("...and the header shows the fire again, not the leaf",
   run(`$('#hStreak').textContent`).includes("\u{1F525}"));
check("...and sheds the resting wash with it",
      `document.querySelector('header').classList.contains('resting')`, false);
run(`view='today'; render();`);
ok("...and the button is gone with the whole unlogged branch",
   !/id="restBtn"/.test(run(`$('#view').innerHTML`)));
// but a weigh-in does NOT clear it: you can weigh yourself on a rest day
run(`DB.days[todayISO]={rest:true,w:[],upd:Date.now()}; setBw(todayISO,70); save(true);`);
check("a weigh-in save leaves a declared rest day standing",
      `!!DB.days[todayISO].rest`, true);
run(`setBw(todayISO,0);`);

// ---- 4. LINE FOUR: the app never asks -------------------------------------
for (const f of ["js/today.js", "js/app.js", "js/header.js"]) {
  const src = fs.readFileSync(path.join(dir, f), "utf8");
  const strings = [...src.matchAll(/'[^'\n]*'|`[^`]*`|"[^"\n]*"/g)].map(m => m[0].toLowerCase()).join(" ");
  // NB: no bare /rest\?/ — it matches the ternary `_rest?'...'`, an operator,
  // not a question. Ask for question-shaped phrases only.
  ok(`${f} carries no rest prompt (no 'taking a rest', no 'are you sure')`,
     !strings.includes("taking a rest") && !strings.includes("are you sure") &&
     !strings.includes("confirm rest") && !strings.includes("rest day?") &&
     !strings.includes("resting today?"));
}

// ---- sync: the flag rides the per-day LWW like bw does --------------------
run(`DB.days['2024-06-15']={w:[${SET}]}; delete DB.days['2024-06-15'].upd;`);
run(`(function(){ const lv=DB.days['2024-06-15'], rv={w:lv.w.map(s=>({...s})), rest:true};
      const seen=new Set(lv.w.map(sig));
      for(const s of rv.w||[]) if(!seen.has(sig(s))) lv.w.push(s);
      if(rv.bw&&!lv.bw) lv.bw=rv.bw;
      if(rv.rest&&!lv.rest) lv.rest=rv.rest; })();`);
check("a remote rest flag is adopted in the unstamped union", `!!DB.days['2024-06-15'].rest`, true);
const coreSrc = fs.readFileSync(path.join(dir, "js/core.js"), "utf8");
ok("core.js union branch carries rest", /if\(rv\.rest&&!lv\.rest\)/.test(coreSrc));

// ---- the leaf is never red ------------------------------------------------
const cssSrc = fs.readFileSync(path.join(dir, "css/app.css"), "utf8");
const restRule = (cssSrc.match(/\.restbtn\.on\{[^}]*\}/) || [""])[0];
ok("the declared state borrows no red (--live/--record stay out of it)",
   restRule.length > 0 && !/--live|--record/.test(restRule), restRule);
// v3.3.81: green is PROMOTED to a semantic colour — --rest — with exactly one
// meaning, mirroring red. Assert the discipline: --rest is defined in both
// themes, the chip and header.resting use it, and it appears in NO rule that
// isn't a rest rule (one colour, one meaning, nowhere else).
const chipRule = (cssSrc.match(/#hStreak\.restchip\{[^}]*\}/) || [""])[0];
ok("the chip wears the one green", /var\(--rest\)/.test(chipRule) && !/--live|--record/.test(chipRule), chipRule);
ok("--rest is defined in both themes", (cssSrc.match(/--rest:#/g) || []).length === 2);
ok("header.resting exists and washes with --rest",
   /header\.resting\{[^}]*var\(--rest\)/.test(cssSrc));
// keyframe stops (0%,100%,50%) inside restbreathe* blocks ARE rest rules;
// strip those blocks first, then demand every remaining user of --rest be
// rest-named. A keyframes block nests one level: outer{ stops{...} }.
const KF = /@keyframes restbreathe[^{]*\{(?:[^{}]*\{[^}]*\})*[^}]*\}/g;
const kfBlocks = cssSrc.match(KF) || [];
const stripped = cssSrc.replace(KF, "");
const restUses = [...stripped.matchAll(/^[^\n{]*\{[^}]*var\(--rest\)[^}]*\}/gm)].map(m => m[0].split("{")[0].trim());
ok("...and --rest appears ONLY in rest rules (one meaning, nowhere else)",
   restUses.length > 0 && restUses.every(sel => /rest/i.test(sel)), restUses.join(" | "));

// ---- v3.3.82: the wash breathes, slowly, and can be stilled ---------------
const breathe = (cssSrc.match(/header\.resting\{[^}]*animation:restbreathe ([\d.]+)s[^}]*\}/) || []);
ok("the resting header breathes", breathe.length > 0);
ok("...at a resting pace \u2014 at least 4x slower than the 1.6s live pulse",
   breathe[1] && parseFloat(breathe[1]) >= 6.4, breathe[1] + "s");
ok("...in both keyframe branches (solid and frosted)",
   /@keyframes restbreathe\{/.test(cssSrc) && /@keyframes restbreathe-frost\{/.test(cssSrc));
ok("...never animating transform or opacity of content \u2014 background only",
   kfBlocks.length === 2 && kfBlocks.every(b => !/transform|opacity/.test(b)));
// the reduced-motion kill must come AFTER the @supports frost branch, or the
// frost animation re-wins the cascade \u2014 assert document order, not presence
const killAt = cssSrc.indexOf("header.resting{animation:none}");
const frostAt = cssSrc.indexOf("restbreathe-frost 7s");
ok("...and the reduced-motion kill exists", killAt > -1);
ok("...placed after the frost branch so animation:none actually wins",
   killAt > frostAt && frostAt > -1, `frost@${frostAt} kill@${killAt}`);
// SCOPE: the hero card stays uncoloured — facts don't take moods
run(FIX); run(`day(todayISO).rest=true; day(todayISO).upd=Date.now(); view='today'; render();`);
ok("the hero card takes no rest tint (no rest-class inside the view)",
   !/class="[^"]*rest[^"]*"[^>]*>[^<]*streak/.test(run(`$('#view').innerHTML`)) &&
   !run(`!![...$('#view').querySelectorAll('.zone,.card,.hero')].find(el=>[...el.classList].some(c=>/rest/i.test(c)&&c!=='restbtn'))`));
run(`delete DB.days[todayISO].rest;`);

process.exit(fail ? 1 : 0);
