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
check("...and wears the muted restchip class", `$('#hStreak').classList.contains('restchip')`, true);
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
const chipRule = (cssSrc.match(/#hStreak\.restchip\{[^}]*\}/) || [""])[0];
ok("the rest chip is muted \u2014 red is LIVE only, and no one-off green enters the palette",
   /var\(--muted\)/.test(chipRule) && !/--live|--record|green|#0f0|#00ff00/i.test(chipRule), chipRule);

process.exit(fail ? 1 : 0);
