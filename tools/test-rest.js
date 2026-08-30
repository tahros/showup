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
    DB.days[dd.toLocaleDateString('en-CA')]={w:[${SET}]};
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
/* v3.3.379: the leaf follows the word now, rather than leading it -- the
   chip reads "rest 🍃". The squares carry the count, so the chip is a LABEL
   rather than a count-with-an-icon, and a label puts its noun first. */
check("the chip shows the leaf", `$('#hStreak').textContent`, "rest \u{1F343}");
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
// v3.3.90: the card follows the day's state too
run(`view='today'; render();`);
/* v3.3.319: Rhythm left Today with the maker's move to the plan, and the
   card went with it. The property it carried — a declared rest day is
   ANNOTATED, in one place, never soothed at — now lives entirely in the
   header chip, which is asserted just above. */
check("...and the day's state is carried by the header alone",
      `document.querySelector('header').classList.contains('resting')
         && !document.querySelector('#view .rhythm')`, true);
run(`view='today'; render();`);
/* the phrase lived in the rhythm card; with the card gone the SCOPE claim
   is stronger, not weaker — the body says nothing about the rest day at all,
   which is what "header chip only, no soothing" was always defending. */
ok("SCOPE: the body offers no rest-day copy at all — header chip only",
   !/take the day|well earned|you deserve|rest up/i.test(run(`$('#view').innerHTML`)));
run(`day(todayISO).rest=false; delete DB.days[todayISO].rest; renderHeader();`);
/* v3.3.379 RESTATES: the fire is LIVE MODE now, not the streak. It says "you
   are training right now", which is something the app never said with a
   symbol before, and it is absent when no session is open -- so an undeclared
   rest day returns the plain numeral. The streak itself is drawn as squares
   beside the date. */
check("undeclared, the numeral returns", `$('#hStreak').textContent`, "3d");
check("...and the fire stays out of it while nothing is live",
      `/\u{1F525}/u.test($('#hStreak').textContent)`, false);
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
// v3.3.92: the chip writes in INK grade. Wash and ink are the same hue at
// different lightness; using the wash as text scored 1.69:1 on itself.
ok("the chip wears the rest INK (text grade), not the wash",
   /var\(--rest-ink\)/.test(chipRule) && !/--live|--record/.test(chipRule), chipRule);
ok("--rest-ink is defined in both themes", (cssSrc.match(/--rest-ink:#/g) || []).length === 2);

// ---- v3.3.90: louder wash, and an honest boundary on what turns green -----
const washPct = (cssSrc.match(/header\.resting \.hglass\{background:color-mix\(in srgb,var\(--rest\) (\d+)%/) || [])[1];
ok("the wash is loud enough to register (\u226540%)", +washPct >= 40, washPct + "%");
const kfPcts = [...cssSrc.matchAll(/@keyframes restbreathe\{[^}]*?(\d+)%,var\(--ground\)\)\}\s*50%\{background:color-mix\(in srgb,var\(--rest\) (\d+)%/g)];
const breatheRule = (cssSrc.match(/@keyframes restbreathe\{[\s\S]*?\}\}/) || [""])[0];
const nums = [...breatheRule.matchAll(/var\(--rest\) (\d+)%/g)].map(m => +m[1]);
ok("...and still breathes below its peak", nums.length === 2 && nums[1] < nums[0], nums.join("\u2192"));
/* LIVE must remain the louder of the two states — rest may whisper, live
   never. v3.3.242: live is now FULLY solid (the header carries no glass at
   all), so it is louder by construction; the check reads the solid form. */
const liveSolid = /header\.live \.hglass\{background:var\(--live\)/.test(cssSrc);
const livePct = liveSolid ? 100
  : +((cssSrc.match(/header\.live \.hglass\{background:color-mix\(in srgb,var\(--live\) (\d+)%/) || [])[1]);
ok("LIVE stays louder than REST", livePct > +washPct, `live ${livePct}% vs rest ${washPct}%`);

// the boundary: today-numbers go green, PAST TRAINED DAYS DO NOT
const restCard = cssSrc.match(/\.rhythm\.resting[^{]*\{[^}]*\}/g) || [];
const joined = restCard.join(" ");
/* v3.3.91 reverses v3.3.90's recolouring: the numbers stay accent and the
   FRAME carries the state. Tried, judged by use, reverted — the record
   stays. What survives from 90 is the boundary it established. */
ok("the card is FRAMED green while resting, not recoloured",
   /border-color/.test(joined) && /var\(--rest\)/.test(joined), joined.slice(0,90));
ok("...and the numbers keep accent (no colour rule on .big/.rpct)",
   !/\.rhythm\.resting[^{]*\.(big|rpct)[^{]*\{[^}]*color:var\(--rest\)/.test(cssSrc));
ok("...today's pending strip cell still marks the declared rest",
   /strip i\.pend/.test(joined));
ok("...but filled strip cells (.on = a day TRAINED) are never repainted",
   !restCard.some(r => /\.strip i\.on/.test(r.split("{")[0])),
   restCard.map(r => r.split("{")[0].trim()).join(" | "));
/* the breath must stay a breath: same slow tempo, readable swing. v3.3.242:
   there is one branch now, so the solid keyframes carry this requirement. */
const frostRule = (cssSrc.match(/@keyframes restbreathe\{[\s\S]*?\}\}/) || [""])[0];
const fN = [...frostRule.matchAll(/var\(--rest\) (\d+)%/g)].map(m => +m[1]);
ok("the breath keeps a readable amplitude (\u226520 points)",
   fN.length === 2 && (fN[0] - fN[1]) >= 20, fN.join("\u2192"));
ok("...and the solid branch too",
   nums.length === 2 && (nums[0] - nums[1]) >= 20, nums.join("\u2192"));
const secs = (cssSrc.match(/animation:restbreathe ([\d.]+)s/) || [])[1];
ok("...at an unchanged resting tempo (\u22656.4s, 4\u00d7 the live pulse)",
   +secs >= 6.4, secs + "s");
ok("--rest is defined in both themes", (cssSrc.match(/--rest:#/g) || []).length === 2);
// one-meaning discipline extends to the ink
const inkUses = [...cssSrc.matchAll(/^[^\n{]*\{[^}]*var\(--rest-ink\)[^}]*\}/gm)].map(m => m[0].split("{")[0].trim());
ok("--rest-ink appears ONLY in rest rules too",
   inkUses.length > 0 && inkUses.every(sel => /rest/i.test(sel)), inkUses.join(" | "));
/* v3.3.245: the wash lives on the absolute .hglass child now — the fixed
   header itself must declare no background at all, or Safari 26 tints and
   blurs the status bar from it. */
ok("the resting wash is painted on the glass child",
   /header\.resting \.hglass\{[^}]*var\(--rest\)/.test(cssSrc));
ok("...and the fixed header itself paints nothing",
   /\n  header\{[^}]*background:transparent/.test(cssSrc.replace(/\r/g,"")));
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
const breathe = (cssSrc.match(/header\.resting \.hglass\{[^}]*animation:restbreathe ([\d.]+)s[^}]*\}/) || []);
ok("the resting header breathes", breathe.length > 0);
ok("...at a resting pace \u2014 at least 4x slower than the 1.6s live pulse",
   breathe[1] && parseFloat(breathe[1]) >= 6.4, breathe[1] + "s");
/* v3.3.242: ONE branch now. The header stopped being frosted glass — a
   backdrop blur at the top of the viewport has nothing above it to sample
   and washed out the status-bar strip — so restbreathe-frost is gone with
   it and the solid keyframes are the only ones left. */
ok("...in its one keyframe branch", /@keyframes restbreathe\{/.test(cssSrc));
ok("...with no frosted twin left behind", !/@keyframes restbreathe-frost\{/.test(cssSrc));
ok("...never animating transform or opacity of content \u2014 background only",
   kfBlocks.length === 1 && kfBlocks.every(b => !/transform|opacity/.test(b)));
// the reduced-motion kill must come AFTER the @supports frost branch, or the
// frost animation re-wins the cascade \u2014 assert document order, not presence
const killAt = cssSrc.indexOf("header.resting .hglass{animation:none}");
const restAt = cssSrc.lastIndexOf("animation:restbreathe ");
ok("...and the reduced-motion kill exists", killAt > -1);
ok("...placed after every rule that starts the breath, so animation:none wins",
   killAt > restAt && restAt > -1, `breath@${restAt} kill@${killAt}`);

// ---- v3.3.242: the header carries no glass ------------------------------
ok("the header never uses a backdrop filter",
   !/(^|\})\s*header[^{}]*\{[^}]*backdrop-filter/.test(cssSrc.replace(/\r/g,"")),
   "header must stay opaque at the viewport's top edge");
ok("...and every header state is opaque",
   [...cssSrc.replace(/\r/g,"").matchAll(/\n\s*header(?:\.\w+)?\{([^}]*)\}/g)]
     .every(m => !/background:[^;}]*,\s*transparent\)/.test(m[1])));
ok("...while nav keeps its frost, where a backdrop exists to blur",
   /nav\{background:color-mix[^}]*transparent\)[^}]*\}/.test(cssSrc.replace(/\r/g,"").replace(/\n\s*/g," "))
   || /backdrop-filter/.test(cssSrc));
/* SCOPE, revised in v3.3.90. v3.3.81 asserted the hero card took NO rest
   colour at all, on "facts don't take moods". v3.3.90 narrows rather than
   abandons that: the card's BACKGROUND is still never tinted — no mood is
   painted over the data — but the today-state numbers follow today's state,
   and the historical strip is untouched. The surviving rule is the sharper
   one: colour may describe TODAY, never repaint the RECORD. */
run(FIX); run(`day(todayISO).rest=true; day(todayISO).upd=Date.now(); view='today'; render();`);
ok("the rhythm card's background is still never tinted (facts take no mood)",
   !(cssSrc.match(/\.rhythm\.resting[^{]*\{[^}]*\}/g) || [])
     .some(r => /background/.test(r)),
   (cssSrc.match(/\.rhythm\.resting[^{]*\{[^}]*\}/g) || []).join(" | "));
ok("...and no OTHER card in the view picks up a rest class",
   !run(`!![...$('#view').querySelectorAll('.card')].find(el=>
      [...el.classList].some(c=>/^rest/i.test(c)) && !el.classList.contains('rhythm'))`));
run(`delete DB.days[todayISO].rest;`);


// ---- v3.3.243: the header must sit OUTSIDE the scrolling content ---------
// iOS fades the top edge of scrolling content under the status bar. A sticky
// header rides inside that scroller and washes out — measured on a real
// screenshot, the date glyphs' TOPS came back at 192 grey against 27 at their
// bottoms, while the fixed nav at the opposite edge measured a clean 83.
const hdrRule = (cssSrc.replace(/\r/g,"").match(/\n  header\{([^}]*)\}/) || ["",""])[1];
ok("the header is fixed, not sticky", /position:fixed/.test(hdrRule) && !/position:sticky/.test(hdrRule), hdrRule.slice(0,60));
ok("...pinned to the top edge and centred like nav",
   /top:0/.test(hdrRule) && /max-width:520px/.test(hdrRule) && /margin:0 auto/.test(hdrRule));
ok("...and #app reserves its height, as it already does for nav",
   /padding-top:var\(--hdr-h\)/.test(cssSrc.replace(/\r/g,"")));
ok("...with a first-paint default before JS measures",
   /--hdr-h:calc\([^)]*env\(safe-area-inset-top/.test(cssSrc.replace(/\r/g,"")));
const utilSrc = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
ok("...kept exact by measurement, not a hard-coded number",
   /function syncHeaderHeight/.test(utilSrc) && /getBoundingClientRect/.test(utilSrc));
ok("...and re-measured when the bar changes shape",
   /ResizeObserver/.test(utilSrc) && /watchHeaderHeight/.test(utilSrc));
ok("...called from renderHeader, so every state change updates it",
   /syncHeaderHeight\(\)/.test(fs.readFileSync(path.join(dir, "js/header.js"), "utf8")));


// ---- v3.3.247: clearance for the iOS standalone edge fade ----------------
// Measured on device: a standalone web app's top ~100pt is faded by iOS; the
// same page in Safari is flat from the first pixel. The fade cannot be
// disabled, so the header's content starts below it — but only where the
// problem actually exists.
const utilSrc247 = fs.readFileSync(path.join(dir, "js/util.js"), "utf8");
ok("the guard requires standalone AND a non-zero safe-area inset",
   /display-mode: standalone/.test(utilSrc247) && /--sat/.test(utilSrc247)
   && /sat>0/.test(utilSrc247));
ok("...so Safari, desktop and a re-installed icon are left alone",
   /standalone&&sat>0\) de\.dataset\.edgefade='1'; else delete/.test(utilSrc247.replace(/\s+/g," ").replace(/ ;/g,";")) 
   || /else delete de\.dataset\.edgefade/.test(utilSrc247));
ok("the clearance is real — past the measured 99pt fade",
   /:root\[data-edgefade="1"\] header\{padding-top:calc\(env\(safe-area-inset-top,0px\) \+ 44px\)\}/
     .test(cssSrc.replace(/\r/g,"")));
ok("...and --sat is exposed for JS to read the inset",
   /--sat:env\(safe-area-inset-top/.test(cssSrc.replace(/\r/g,"")));
ok("the status-bar style no longer puts content under the status bar",
   /content="default"/.test(fs.readFileSync(path.join(dir,"index.html"),"utf8")));

/* v3.3.379: THE WEEK, AT A FIXED COLUMN. The streak had a number and no
   picture; it has one now -- the tail of the heatmap, in the same square at
   the same ratio and the same two fills. Literally the last seven days, so
   the header can show a GAP: a display that can only show success is a
   trophy, and this app is a record. */
{
  const week = () => run(`(function(){const w=document.getElementById('hWeek');
    return w?[...w.children].map(i=>i.className).join('|'):'(absent)';})()`);

  run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
    const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
    for(const n of [0,1,2,4,5,6]) DB.days[D(n)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    SEED=deriveAll(); renderHeader();})()`);
  check("the header shows seven days", `(document.getElementById('hWeek')||{}).childElementCount`, 7);
  /* trained 6,5,4,2,1 and 0 days ago -- the gap is 3 days ago, which is the
     FOURTH square of seven, not the third. My first version had it in the
     wrong slot and failed for the right reason. */
  check("...trained days filled, the gap left grey",
        `${week()==="hwd on|hwd on|hwd on|hwd|hwd on|hwd on|hwd on tod"}`, "true");
  check("...and today is the last of them, ringed",
        `${/tod$/.test(week())}`, "true");

  /* a rest day is drawn like any other untrained day -- the acknowledgement
     is the WORD, not a third fill. Green would have had to spread to the
     heatmap or contradict it, and would have made one fact wear two colours
     depending on when you looked. */
  run(`(function(){DB.days[todayISO]={w:[],rest:1,upd:1}; SEED=deriveAll(); renderHeader();})()`);
  check("a declared rest day is not a filled square",
        `${/hwd tod$/.test(week())}`, "true");
  check("...and no third fill exists anywhere in the week",
        `${!/hwd rest|hwd green/.test(week())}`, "true");

  /* the window never grows: a long streak is still seven squares */
  run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
    const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
    for(let n=0;n<41;n++) DB.days[D(n)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
    SEED=deriveAll(); renderHeader();})()`);
  check("a 41-day streak is still seven squares",
        `(document.getElementById('hWeek')||{}).childElementCount`, 7);
  /* that fixture has sets logged today and nothing marked done, so the
     session IS live -- and the flame appearing is the feature, not a fault.
     Both halves asserted rather than one. */
  check("...with the count still stated exactly, and the fire because it is live",
        `$('#hStreak').textContent`, "41d \u{1F525}");
  run(`(function(){DB.days[todayISO].doneAll=true; renderHeader();})()`);
  check("...and the fire goes out the moment the session closes",
        `$('#hStreak').textContent`, "41d");

  /* the column is FIXED: the date swings 45px across the year, so the squares
     are pinned by a min-width on the date rather than by where the text ends.
     jsdom computes no layout, so the rule that prevents the wobble is what
     gets asserted. */
  const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  /* v3.3.380: THIS ASSERTION SHIPPED THE BUG. It checked min-width on
     .h-date -- the element I had reasoned about -- while the squares actually
     follow the block that STACKS the date and the subtitle, and that block is
     as wide as the wider of the two. The subtitle is always wider. So the
     week followed the parts you trained, the wobble was worse than before,
     and the check was green the whole time because it was measuring an
     element that does not decide anything.
     It measures the deciding element now: the wrapper the week sits beside. */
  /* v3.3.383 RESTATES: the wrapper's fixed width was only still doing one
     job -- clipping the SUBTITLE to 132px, which cut "NOTHING LOGGED YET" to
     "NOTHING LOGGED Y...". The week is pinned by position (below), so the
     only thing that must respect the column edge is the DATE, which shares
     its line with the squares. */
  check("the date is capped at the column edge it shares with the squares",
        `${/\.h-date\{[^}]*max-width:132px/.test(css)}`, "true");
  check("...and the wrapper no longer cages the line beneath",
        `${/\.h-idcol\{[^}]*flex:1 1 auto/.test(css) && !/\.h-idcol\{[^}]*width:\d+px/.test(css)}`, "true");
  /* v3.3.382: the week row is pinned by POSITION at the column edge, and the
     count lives inside it so "6d" hugs the last square instead of sitting
     orphaned at the far right by the gear. The maker drew the guides. */
  check("the week row is pinned at the column edge by position",
        `${/\.h-weekrow\{position:absolute;left:132px/.test(css)}`, "true");
  check("...and the count sits in that row, right after the squares",
        `(function(){const r=document.querySelector('.h-weekrow');
          const w=document.getElementById('hWeek'), s2=document.getElementById('hStreak');
          return !!r && !!w && !!s2 && r.contains(w) && r.contains(s2)
              && !!(w.compareDocumentPosition(s2) & 4);})()`, true);
  check("...and the subtitle truncates only at the header's edge",
        `${/\.h-subrow \.h-sub\{[^}]*text-overflow:ellipsis/.test(css)}`, "true");
  check("...while the date still truncates too",
        `${/\.h-date\{[^}]*text-overflow:ellipsis/.test(css)}`, "true");
  /* the ring must not eat its neighbours: a 4px box-shadow spread on a 10px
     square is an 18px footprint inside a 5px gap */
  /* the first version of this matched "header.live .h-week .hwd.tod{outline:"
     as well, because the prefix was not anchored -- so deleting the base rule
     left it green on the strength of the live variant. It checks EVERY rule
     that styles today's square now: each must draw an outline, none may
     spread a box-shadow into the 5px gap. */
  check("today's ring is drawn outside the box, not spread into the gap",
        `${(function(){const ms=css.match(/\.h-week \.hwd\.tod\{[^}]*\}/g)||[];
          return ms.length>=2 && ms.every(r=>/outline-offset/.test(r) && !/box-shadow/.test(r));})()}`, "true");
  /* and the count is ink: red belongs to at-risk alone */
  check("the streak count is ink, not the alarm colour",
        `${/\.streak\{[^}]*color:var\(--chalk\)/.test(css)}`, "true");
  check("...and at-risk is still the one thing that reddens it",
        `${/#hStreak\.atrisk\{color:var\(--record\)/.test(css)}`, "true");
}

process.exit(fail ? 1 : 0);
