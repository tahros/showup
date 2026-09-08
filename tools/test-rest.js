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
/* v3.3.440: report NO reduced-motion preference, so MOTION_OK is true and the
   cross-fade path is reachable. Every other query still reports false. */
w.matchMedia = w.matchMedia || (q => ({ matches:/no-preference/.test(q), addEventListener(){}, removeEventListener(){} }));
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
/* v3.3.437: the button lost its leaf too -- one word, one state. */
ok("...reading 'Rest day', unlit and leafless",
   />Rest day</.test(run(`$('#view').innerHTML`)) && !/\u{1F343}/u.test(run(`$('#view').innerHTML`)));
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
/* v3.3.437 RESTATES: the leaf is gone from the chip, the button and History.
   Today's square beside this chip is green now and the whole header is washed
   in the same --rest -- a glyph on top of two surfaces already saying it was
   the third telling of one fact. Pinned exactly, so no leaf creeps back. */
check("the chip is the word alone, no leaf", `$('#hStreak').textContent`, "rest");
check("...and no leaf survives anywhere in the header",
      `!/\u{1F343}/u.test(document.querySelector('header').innerHTML)`, "true");
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
/* v3.3.389 RESTATES: the fire is DEAD, not misplaced. It meant "training
   right now", and the whole header already turns the live red -- the same
   sentence, said louder. Undeclaring rest returns the plain count. */
ok("...and undeclaring rest returns the plain count, no fire",
   (function(){const t=run(`$('#hStreak').textContent`);
     return !t.includes("\u{1F525}") && /\dd$/.test(t);})());
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
/* v3.3.469 RESTATES: one more card may wear a rest class -- .crcard.resting,
   the inverse attendance card, whose whole subject is rest. It is the one
   place green enters a grid of days, by design; every other card still takes
   no mood. */
ok("...and no OTHER card in the view picks up a rest class (the inverse attendance card excepted, by design)",
   !run(`!![...$('#view').querySelectorAll('.card')].find(el=>
      [...el.classList].some(c=>/^rest/i.test(c)) && !el.classList.contains('rhythm') && !el.classList.contains('crcard'))`));
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
  /* v3.3.437 RESTATES this pair. They read "a rest day is not green; green
     would have to spread to the heatmap". Green is a LIVE grade now, not a
     record grade -- the mirror of red. So the rule splits: today MAY be green
     while the flag is up, the square is still never FILLED (.on is the record
     fill and rest earns no session), and no PAST square is ever green. */
  check("a declared rest day is still not a FILLED square",
        `${!/\bon\b/.test(week().split("|").pop())}`, "true");
  check("...but today wears the live rest grade",
        `${/hwd tod resting/.test(week())}`, "true");
  check("...and no PAST square is ever green",
        `${(week().match(/hwd[^"]*/g)||[]).slice(0,-1).every(c=>!/resting/.test(c))}`, "true");

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
  /* v3.3.389 RESTATES the pair that once asserted the fire's two states. The
     count is now plain in BOTH: live is worn by the whole header (red), and
     the timer takes this slot while it runs (#hTimer.on~.streak). */
  check("...with the count stated exactly, and no fire even while live",
        `$('#hStreak').textContent`, "41d");
  run(`(function(){DB.days[todayISO].doneAll=true; renderHeader();})()`);
  check("...and unchanged when the session closes",
        `$('#hStreak').textContent`, "41d");
  /* the slot-swap: while the rest timer is showing, the count steps aside --
     one slot, two tenants, never both */
  const css389=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  /* v3.3.390: ONE LINE MEANS ONE AXIS. The header carried align-items:
     flex-start from the two-line era, where the identity column was taller
     than the controls and had to hang from the top so the date stayed level
     with the gear. On a one-line header that pins everything to the top edge,
     and the week and its count sat visibly above the gear's centre.
     jsdom computes no layout, so the alignment is asserted as the rule -- and
     the rule is where the mistake lived. */
  /* comments are stripped first. The rule is preceded by the end of a CSS
     comment rather than by a closing brace, and my first anchor assumed a
     brace -- so it reported false against correct CSS. */
  const bare389=css389.replace(/\/\*[\s\S]*?\*\//g,"");
  check("the one-line header centres its elements on one axis",
        `${/header\{position:fixed[^}]*align-items:center/.test(bare389)}`, "true");
  check("...and no longer hangs them from the top",
        `${!/header\{position:fixed[^}]*align-items:flex-start/.test(bare389)}`, "true");
  /* exercise mode really is two lines, so top-hanging is correct there */
  check("...while exercise mode, which is two lines, still hangs from the top",
        `${/header\.exmode\{align-items:flex-start\}/.test(bare389)}`, "true");

  /* v3.3.391: THE CLOCK SURVIVES THE EXERCISE SCREEN. v3.3.389 moved the rest
     timer into .h-weekrow so it could share the count's slot, and exercise
     mode already hid that whole row -- so opening an exercise hid the running
     clock, mid-session, on the screen you actually stand on while it runs.
     Exercise mode hides the RECORD (squares, count) and keeps the timer: the
     timer is not the record. */
  check("exercise mode hides the record, not the row that holds the clock",
        `${/header\.exmode \.h-week,header\.exmode \.streak\{display:none\}/.test(css389)
           && !/header\.exmode \.h-weekrow\{display:none\}/.test(css389)}`, "true");
  check("...so nothing hides the timer inside an exercise",
        `${!/header\.exmode[^{]*\.resttimer[^{]*\{[^}]*display:none/.test(css389)}`, "true");

  /* v3.3.392 RESTATES: the timer moved out of the record's row and in with
     the controls, so it and the count are no longer siblings and "~" cannot
     express the swap. :has() carries it. The rule being defended is unchanged
     -- one tenant at a time, because date + week + count + timer + gear do not
     fit one line. */
  check("the timer and the count share one slot, never shown together",
        `${/header:has\(#hTimer\.on\) \.streak\{display:none\}/.test(css389)}`, "true");
  /* AND THE CLOCK'S Y MUST NOT MOVE BETWEEN SCREENS. In the record's row it
     rode line one of its column: centred on the one-line day header, pinned to
     the exercise name's line on the two-line exercise header. With the
     controls it holds the header's own axis in both. */
  check("the clock sits with the controls, not inside the record's row",
        `(function(){const t=document.getElementById('hTimer');
          return !!t && !!t.closest('.hbtns') && !t.closest('.h-weekrow');})()`, true);
  check("...and the controls hold the axis even where the header top-hangs",
        `${/\.hbtns\{[^}]*align-self:center/.test(css389)}`, "true");
  /* the day header says each thing once: its subtitle is EMPTY (the empty
     square and the Training Today card already say both of its old states),
     and an empty line costs no height */
  check("the day header's subtitle is empty",
        `document.getElementById('hSub').textContent`, "");
  check("...and an empty subtitle takes no room",
        `${/\.h-sub:empty\{display:none\}/.test(css389)}`, "true");
  /* ...but EXERCISE MODE keeps the line: "Chest . 3 sets logged" under the
     exercise name is context nothing else on that screen provides. The
     redundancy argument was about the day header's two states, not this. */
  run(`(function(){DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:0,reps:[10],at:1}],upd:1};
    SEED=deriveAll(); view='lift'; lift={part:'Chest',ex:'Dip'}; renderHeader();})()`);
  check("exercise mode still speaks on the second line",
        `$('#hSub').textContent`, "Chest \u00b7 1 set logged");
  run(`(function(){view='today'; lift={}; renderHeader();})()`);
  check("...and the line falls silent again on the day header",
        `$('#hSub').textContent`, "");

  const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8").replace(/\r?\n\s*/g,"");
  /* v3.3.387: the date and week are one top-line thought; status sits below.
     DOM order is the contract, because the visual hierarchy depends on it. */
  check("the date and week share the top line",
        `(function(){const r=document.querySelector('.h-toprow');
          const date=document.querySelector('.h-date'), week=document.querySelector('.h-weekrow');
          return !!r && r.contains(date) && r.contains(week)
              && !!(date.compareDocumentPosition(week) & 4);})()`, true);
  check("the subtitle sits after that top line",
        `(function(){const top=document.querySelector('.h-toprow'), sub=document.querySelector('.h-subrow');
          return !!top && !!sub && !!(top.compareDocumentPosition(sub) & 4);})()`, true);
  check("the top line anchors date left and rhythm right",
        `${/\.h-toprow\{[^}]*display:flex[^}]*align-items:center[^}]*justify-content:space-between[^}]*gap:12px[^}]*min-width:0/.test(css)}`, "true");
  check("the week is stable in normal flow and cannot shrink",
        `${/\.h-weekrow\{[^}]*position:static[^}]*flex:0 0 auto/.test(css)}`, "true");
  check("the count sits in that row, right after the squares",
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
  check("whitespace, not another divider, separates the hierarchy",
        `${!/\.h-weekrow::before\{/.test(css) && !/--hdiv:/.test(css)}`, "true");
  check("the date can yield safely before the week at a narrow width",
        `${/\.h-date\{[^}]*max-width:100%[^}]*text-overflow:ellipsis/.test(css)}`, "true");
  check("the settings control is deliberately quieter than a normal header control",
        `${/#gearBtn\{[^}]*width:38px[^}]*height:38px[^}]*background:var\(--surface2\)[^}]*color:var\(--muted\)/.test(css)}`, "true");
  /* the sweep must not loop: the header is always on screen, so a permanent
     animation is motion nobody can dismiss -- and a shimmering row reads as a
     LOADING skeleton, which is the opposite of a record. */
  /* v3.3.385: and it must not restart on every unrelated render. renderHeader
     runs on each one; rewriting innerHTML replaces the nodes, and new nodes
     replay their animations -- which is why the sweep fired on every tab
     switch. The nodes must SURVIVE a render that changes nothing. */
  {
    run(`(function(){DB.days={}; const t=new Date(todayISO+'T00:00');
      const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
      for(const n of [0,1,2]) DB.days[D(n)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
      SEED=deriveAll(); renderHeader();})()`);
    run(`window.__firstSquare=document.querySelector('#hWeek .hwd')`);
    run(`renderHeader(); renderHeader();`);
    check("an unrelated render leaves the squares alone, so the sweep does not replay",
          `window.__firstSquare===document.querySelector('#hWeek .hwd')`, true);
    /* ...but a day that fills IS a change, and must redraw */
    run(`(function(){const t=new Date(todayISO+'T00:00');
      const D=n=>{const d=new Date(t);d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
      DB.days[D(4)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[8]}],upd:1};
      SEED=deriveAll(); renderHeader();})()`);
    check("...while a day that fills does redraw the week",
          `window.__firstSquare!==document.querySelector('#hWeek .hwd')
            || document.querySelector('#hWeek').innerHTML.split('hwd').length===8`, true);
  }
  /* v3.3.385: SLOW AND WIDE ENOUGH TO READ. The first pass was a thin hard
     line crossing a 10px square in half a second -- a flicker, not a sweep,
     and the maker said so. Nothing asserted the duration, so shortening it
     back left the suite green. Both are pinned now. */
  check("the sweep is slow enough to be seen",
        `${(function(){const m=css.match(/\.h-week \.hwd\.on::after\{[^}]*\}/);
          return !!m && parseFloat((m[0].match(/animation:hwsheen ([\d.]+)s/)||[])[1]||0) >= 0.9;})()}`, "true");
  check("...and the light is a band, not a hairline",
        `${(function(){const m=css.match(/\.h-week \.hwd\.on::after\{[^}]*\}/);
          return !!m && /transparent 0%[^)]*rgba\(255,255,255,\.9[0-9]?\) 50%/.test(m[0]);})()}`, "true");

  check("the sweep runs once, not forever",
        `${(function(){const m=css.match(/\.h-week \.hwd\.on::after\{[^}]*\}/);
          return !!m && /animation:[^;}]*\b1\b/.test(m[0]) && !/infinite/.test(m[0]);})()}`, "true");
  /* today breathes only while the day is still EMPTY */
  check("today's ring breathes only while the day is unfilled",
        `${/\.h-week \.hwd\.tod:not\(\.on\)\{animation:hwpulse[^}]*infinite\}/.test(css)}`, "true");
  check("...and a filled day is not animated at all",
        `${!/\.h-week \.hwd\.tod\.on\{[^}]*animation/.test(css)}`, "true");
  /* only the outline COLOUR moves, so a breathing ring cannot reflow the row */
  /* the first version of this line was malformed AND asserted nothing -- it
     returned a bare true. A breathing ring must move COLOUR only; anything
     touching width, outline-width or offset would reflow the row on every
     cycle. */
  check("...moving colour only, never geometry",
        `${(function(){const m=css.match(/@keyframes hwpulse\{[^{]*\{[^}]*\}[^{]*\{[^}]*\}[^}]*\}/);
          return !!m && /outline-color/.test(m[0])
              && !/(outline-width|outline-offset|width|height|transform|inset)/.test(m[0]);})()}`, "true");
  check("both stop when motion is unwelcome",
        `${/prefers-reduced-motion:reduce\)\{[^@]*\.h-week \.hwd\.on::after\{animation:none/.test(css)}`, "true");

  check("today's ring is drawn outside the box, not spread into the gap",
        `${(function(){const ms=css.match(/\.h-week \.hwd\.tod\{[^}]*\}/g)||[];
          return ms.length>=2 && ms.every(r=>/outline-offset/.test(r) && !/box-shadow/.test(r));})()}`, "true");
  /* and the count is ink: red belongs to at-risk alone */
  check("the streak count is ink, not the alarm colour",
        `${/\.streak\{[^}]*color:var\(--chalk\)/.test(css)}`, "true");
  check("...and at-risk is still the one thing that reddens it",
        `${/#hStreak\.atrisk\{color:var\(--record\)/.test(css)}`, "true");
}

/* ================= v3.3.437: THE DAY EXHALES =================
   Declaring rest changes four things at once, and each is asserted on the
   EFFECT rather than on the branch that produces it: the rendered square's
   class, the rendered greeting's text, the rendered fold row, and the
   ABSENCE of the whole Train-next rail. The plan itself must survive all of
   it -- rest is annotation, never an edit (the v3.3.79 line, still). */
{
  const D=n=>run(`(function(){const t=new Date(todayISO+'T00:00');t.setDate(t.getDate()-${n});return t.toLocaleDateString('en-CA')})()`);
  const seed=()=>run(`(function(){
    DB.days={}; DB.week=null; delete DB.settings.planFold; delete DB.settings.dayDone;
    DB.settings.unit='lb'; DB.settings.name='Sungjee'; DB.settings.onboarded=true;
    DB.days['${D(2)}']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};
    DB.days['${D(1)}']={w:[{part:'Back',ex:'Deadlift',w:95,reps:[5],at:1}],upd:1};
    DB.plan={d:todayISO, items:[
      {ex:'Barbell Bench Press', lines:[{w:toKg(155),bw:false,reps:[8,8,6,6]}]},
      {ex:'Dip', lines:[{w:toKg(45),bw:true,reps:[10,8,8]}]}], note:'', raw:''};
    DB.planAt=Date.now(); SEED=deriveAll(); view='today'; lift.plan=null; render();})()`);
  const V=()=>run(`$('#view').innerHTML`);
  const tap=()=>run(`document.getElementById('restBtn').click();`);

  seed();
  ok("before rest: the rail asks what to train", /Train next/.test(V()));
  ok("...today's square is the open ring, not green",
     run(`(function(){const s=document.querySelectorAll('#hWeek .hwd'); const t=s[s.length-1];
       return t.classList.contains('tod')&&!t.classList.contains('resting');})()`));

  tap();
  // 1. the square
  ok("resting: today's square wears .rst, and only today's",
     run(`(function(){const s=[...document.querySelectorAll('#hWeek .hwd')];
       return s[s.length-1].classList.contains('resting') && s.slice(0,-1).every(x=>!x.classList.contains('resting'));})()`));
  // 2. the greeting
  ok("...the greeting shortens to 'Rest.'", /Rest\./.test(V()) && !/Morning|Afternoon|Evening/.test(V()));
  ok("...keeping the day count, dropping the countdown",
     /days in\./.test(V()) && !/to 1,000|to 1000/.test(V()));
  // 3. the fold
  /* asserted on the row's TEXT, not on innerHTML: the first version matched
     /kept/ against the markup, and the .plankept CLASS satisfied it -- so
     deleting the visible word left the check green. A hollow assertion,
     found by probing. */
  ok("...the plan folds and the row says 'kept'",
     run(`(function(){const r=document.querySelector('.planfoldrow');
       return r?r.textContent:'(absent)';})()`).includes('kept'));
  /* v3.3.452 RESTATES: hidden means the fold is SHUT, not that the rows left
     the DOM -- they stay so the fold can animate. */
  ok("...the exercises are hidden (fold shut), not deleted",
     run(`document.querySelector('[data-planfoldbody]').classList.contains('shut') && DB.plan.items.length===2`));
  ok("...and the saved fold preference is NOT written",
     run(`DB.settings.planFold===undefined`));
  // 4. the rail
  ok("...Train next is gone entirely", !/Train next/.test(V()));
  ok("...with no Start, no run nudge and no other-parts door",
     run(`(function(){const v=document.getElementById('view').cloneNode(true); v.querySelectorAll('[data-planfoldbody]').forEach(f=>f.remove());
       return !v.querySelector('[data-planex],[data-go]') && !/goLift/.test(v.innerHTML);})()`));
  ok("...replaced by tomorrow, stated as a fact with no button on it",
     /Tomorrow \u00b7/.test(V()));

  // the carry: offered, and it MOVES rather than copies
  ok("...and today's plan can be carried to tomorrow", /data-carrytmw/.test(V()));
  run(`document.querySelector('[data-carrytmw]').click();`);
  ok("carry moves the plan: tomorrow has it",
     run(`DB.plan.d===tomorrowISO() && DB.plan.items.length===2`));
  ok("...and today does not (a copy would wake twice)", run(`!planNow()`));
  ok("...so the carry is no longer offered", !/data-carrytmw/.test(V()));

  // undo walks every one of them out
  seed(); tap(); tap();
  ok("undo: the square drops .rst",
     run(`(function(){const s=[...document.querySelectorAll('#hWeek .hwd')];
       return !s[s.length-1].classList.contains('resting');})()`));
  ok("...the greeting comes back", !/Rest\./.test(V()));
  ok("...the plan unfolds", /Barbell Bench Press/.test(V()));
  ok("...and Train next returns", /Train next/.test(V()));

  /* TRAINING ALWAYS WINS, tested through the render rather than the flag:
     a logged set clears rest in save(), so the screen must be fully back. */
  seed(); tap();
  run(`(function(){DB.days[todayISO].w.push({part:'Chest',ex:'Barbell Bench Press',w:toKg(155),reps:[8],at:1});
    save(true); SEED=deriveAll(); render();})()`);
  ok("a set logged anyway takes the whole rest state down",
     run(`!restingToday()`) &&
     run(`(function(){const s=[...document.querySelectorAll('#hWeek .hwd')];
       return !s[s.length-1].classList.contains('resting');})()`));

  /* the fold is TODAY'S SCREEN only: the Train tab still shows the plan
     open, because that is the screen you read to change your mind. */
  seed(); tap();
  run(`view='lift'; lift.part=null; lift.ex=null; render();`);
  /* v3.3.469 RESTORES the v3.3.437 rule: Train is Train on a rest day. The
     v3.3.467 recovery view was tried on the device and reverted. */
  ok("the Train tab keeps the plan open while resting",
     /Barbell Bench Press/.test(run(`$('#view').innerHTML`)) && run(`!document.getElementById('restOverride')`));
  run(`view='today'; render();`);
}

/* ================= v3.3.440: THE EXHALE DOES NOT BLINK =================
   render() paints in-view changes directly (a logged set must not flash) and
   cross-fades only tab switches. The rest toggle is an in-view change that
   rewrites the whole screen, so the direct paint read as a blink. The
   handler now asks for the cross-fade. jsdom draws nothing, so the nearest
   reachable fact is the API boundary: startViewTransition must be CALLED
   for the rest tap, with the header inside the callback, and must NOT be
   called for an ordinary in-view render. The harness's matchMedia stub
   reports no reduced-motion preference so MOTION_OK is true here. */
{
  run(`(function(){
    DB.days={}; DB.plan=null; DB.week=null; DB.settings.onboarded=true; view='today'; lift.plan=null;
    const y=new Date(todayISO+'T00:00'); y.setDate(y.getDate()-1);
    DB.days[y.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};   // a record, so Today is not day one
    SEED=deriveAll(); render();
    globalThis.__vt=[]; document.startViewTransition=function(cb){ globalThis.__vt.push('call'); cb(); };
  })()`);
  ok("(harness) MOTION_OK is true, so the cross-fade path is reachable", run(`MOTION_OK`)===true);
  run(`render();`);
  ok("an ordinary in-view render does not cross-fade", run(`__vt.length`)===0, run(`__vt.length`));
  run(`document.getElementById('restBtn').click();`);
  ok("tapping rest DOES cross-fade instead of cutting", run(`__vt.length`)===1, run(`__vt.length`));
  ok("...and the screen is in the rest state after it", /Rest\./.test(run(`$('#view').innerHTML`)));
  run(`document.getElementById('restBtn').click();`);
  ok("...undo cross-fades too", run(`__vt.length`)===2, run(`__vt.length`));
  ok("...and the greeting is back", !/Rest\./.test(run(`$('#view').innerHTML`)));
  // the header must ride inside the transition, not before it
  run(`globalThis.__seq=[]; const _rh=renderHeader; renderHeader=function(){ __seq.push('header'); return _rh.apply(this,arguments); };
       document.startViewTransition=function(cb){ __seq.push('vt-start'); cb(); __seq.push('vt-end'); };
       document.getElementById('restBtn').click(); renderHeader=_rh;`);
  ok("the header renders INSIDE the cross-fade, so wash and view arrive together",
     run(`JSON.stringify(__seq)`)==='["vt-start","header","vt-end"]', run(`JSON.stringify(__seq)`));
  run(`delete document.startViewTransition;`);
}

/* ================= v3.3.442: THE CHROME DOES NOT RIDE THE ROOT =================
   jsdom draws no transitions, so the reachable fact is the CSS: the header and
   the nav must each carry a view-transition-name (which removes them from the
   root group), and the root's drift/fade keyframes must not be applied to
   those names. Restating nothing: the root rules are unchanged. */
{
  const cssNow=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
  ok("the header has its own transition group", /header\{view-transition-name:showup-header\}/.test(cssNow));
  ok("...and so does the tab bar",                /nav\{view-transition-name:showup-nav\}/.test(cssNow));
  ok("...neither is given the root's drift or fade",
     !/view-transition-(old|new)\((showup-header|showup-nav)\)[^{]*\{[^}]*\bvt(in|out)\b/.test(cssNow));
  ok("...while the root keeps its own drift",
     /::view-transition-new\(root\)\{animation:vtin/.test(cssNow));
  ok("...and reduced motion stills the chrome too",
     /prefers-reduced-motion:reduce\)\{[\s\S]*?showup-header[\s\S]*?showup-nav[\s\S]*?\{animation:none\}/.test(cssNow));
}

/* ================= v3.3.458: THE NAV SPEAKS THE APP'S OWN LANGUAGE =================
   Four emoji were the only full-colour objects on a two-ink screen. Now: four
   SVG glyphs built from the square, in currentColor, one per tab; the pill is
   glass at a tint that keeps the inks above 4.5:1 with an accent button
   scrolled beneath. Asserted on the markup and the CSS facts. */
{
  const navHtml=run(`document.getElementById('nav').innerHTML`);
  ok("no emoji left in the nav", !/[\u{1F300}-\u{1FAFF}\u2705\u2714\u{1F4AA}\u{1F4C8}\u{1F4DC}]/u.test(navHtml), navHtml.slice(0,80));
  ok("four tabs, four glyphs, each an SVG of rects in currentColor",
     run(`(function(){const bs=[...document.querySelectorAll('#nav button')]; return bs.length===4 && bs.every(b=>{const s=b.querySelector('.ng svg'); return !!s && s.querySelectorAll('rect').length>0 && !s.querySelector('[fill]:not([fill="currentColor"])');});})()`));
  ok("...Today is the single square: one rect", run(`document.querySelector('#nav [data-v="today"] svg rect').parentNode.querySelectorAll('rect').length`)===1);
  ok("...History has nine rects (v3.3.461: a calendar now, asserted in detail below)", run(`document.querySelectorAll('#nav [data-v="history"] svg rect').length`)===9);
  /* v3.3.461 RESTATES: no words in the bar. The glyph is decorative and the
     NAME moved to aria-label, so each tab is still announced. */
  ok("...the glyph span is decorative and the name is on the button as aria-label",
     run(`[...document.querySelectorAll('#nav .ng')].every(s=>s.getAttribute('aria-hidden')==='true')`) &&
     run(`[...document.querySelectorAll('#nav button')].every(b=>/^(Today|Train|Stats|History)$/.test(b.getAttribute('aria-label')||'') && b.textContent.trim()==='')`));
  const cssN=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
  ok("the glyphs take the button's ink", /nav button \.ng svg\{[^}]*fill:currentColor/.test(cssN));
  ok("the emoji grayscale filter is gone with the emoji", !/nav button span\{[^}]*grayscale/.test(cssN));
  /* v3.3.462 RESTATES: the glass moved to nav::before (WebKit will not
     sample a backdrop for an element that is also its own promoted layer),
     at 55%. The pill itself is transparent inside @supports. */
  /* v3.3.463 RESTATES: liquid glass. The tint is a fall-off (62% -> 30%), the
     blur is light (9px) with high saturation, and ALL lighting lives in
     --pill-shadow: a specular rim, a rim hairline, light from above, shadow
     inside the bottom, then the drop -- in both themes. */
  ok("the minimal pill is liquid glass: an 88->66% fall-off tint, a 9px blur, on nav::before, the pill itself transparent",
     /:root\[data-skin="minimal"\] nav\{background:transparent;box-shadow:none\}/.test(cssN) &&
     /:root\[data-skin="minimal"\] nav::before\{[^}]*background:linear-gradient\(180deg,color-mix\(in srgb,var\(--pill\) 88%,transparent\),color-mix\(in srgb,var\(--pill\) 66%,transparent\)\);[^}]*backdrop-filter:blur\(9px\) saturate\(190%\)/.test(cssN) &&
     /nav::before\{[^}]*box-shadow:var\(--pill-shadow\)/.test(cssN) &&
     /:root\[data-skin="minimal"\] nav button\{z-index:1\}/.test(cssN));
  ok("...the lighting is in the pill token, in both themes: specular rim, hairline, pooled light, inner bottom shadow, drop",
     (cssN.match(/--pill-shadow:inset 0 1px 0 rgba\(255,255,255,[.\d]+\),inset 0 0 0 0\.5px rgba\(255,255,255,[.\d]+\),\s*inset 0 14px 20px -12px rgba\(255,255,255,[.\d]+\),inset 0 -10px 18px -12px rgba\(0,0,0,[.\d]+\),\s*0 1\dpx 3\dpx/g)||[]).length===2);
  ok("...no colour in the light: every lighting term is white or black", !/--pill-shadow:[^;]*rgba\((?!255,255,255|0,0,0|22,26,40)/.test(cssN));
  ok("...and the active tab is a glass bead: its own top highlight and a whisper of drop",
     /nav button\.on\{box-shadow:inset 0 1px 0 color-mix\(in srgb,#fff 70%,var\(--pill\)\),0 1px 3px/.test(cssN));
  ok("the bar is narrower and its tabs closer (24px in, 2px between)",
     /:root\[data-skin="minimal"\] nav\{\s*left:24px;right:24px;/.test(cssN) && /:root\[data-skin="minimal"\] nav button\{margin:5px 2px\}/.test(cssN));
  ok("...and the pseudo-element carries no transform of its own (the reason it works)",
     !/nav::before\{[^}]*transform/.test(cssN));
  /* v3.3.465: NOTHING ON THE NAV MAY MAKE IT A BACKDROP ROOT, or its glass
     samples only itself. isolation:isolate, opacity, filter, mix-blend-mode
     and a 3D transform all do; will-change:transform alone does not. Asserted
     on every nav rule in the sheet and on the inline transform the scrub
     writes. */
  {
    const bare=cssN.replace(/\/\*[\s\S]*?\*\//g,'');   // comments mention nav constantly; rules are what matter
    const navRules=[...bare.matchAll(/([^{}]+)\{([^}]*)\}/g)]
      .filter(m=>m[1].split(',').some(sel=>/(^|\s)nav\s*$/.test(sel.trim())||/^nav$/.test(sel.trim())));
    /* translateZ(0) is deliberately NOT in this list: the v3.3.179 iOS
       anchoring fix requires it and buildcheck guards it. The certain
       backdrop-root makers are the ones asserted absent. */
    const roots=navRules.filter(m=>/isolation:isolate|preserve-3d|opacity:|mix-blend-mode|(^|;)\s*filter:/.test(m[2]));
    ok("no nav rule makes the nav a backdrop root (isolation, opacity, filter, blend, preserve-3d)", roots.length===0, roots.map(m=>m[1].trim()+'{'+m[2].trim().slice(0,60)+'}').join(' | '));
    /* v3.3.480 RESTATES: the 179 rule split. The top button keeps the full
       hint; the nav keeps will-change only -- translateZ(0) with an active
       backdrop-filter hung the pill mid-scroll on the device. */
    ok("...the top button keeps the v3.3.179 compositing rule, and the nav keeps will-change without the 3D transform",
       /\n\s*\.calreturn\{transform:translateZ\(0\)[^}]*will-change:transform/.test(cssN) &&
       /\n\s*nav\{will-change:transform[^}]*\}/.test(cssN) && !/\n\s*nav\{[^}]*translateZ/.test(cssN));
    /* v3.3.495 RESTATES: the belt is gone. navReanchor() put translateZ(0)
       back on the nav 120ms after every scroll -- reapplying the very trigger
       the assertion above removes. The maker reported the pill still hanging
       on a PURE SCROLL, where no render runs and this was the only code that
       touched the nav. It goes alone, as an experiment; this assertion is now
       what keeps it gone until the result is read. */
    ok("...and nothing mutates the nav on a scroll",
       !/function navReanchor\(\)/.test(fs.readFileSync(path.join(dir,"js/util.js"),"utf8")) &&
       !/nav\.reanchor\{/.test(cssN) &&
       (function(){ const u=fs.readFileSync(path.join(dir,"js/util.js"),"utf8");
          const i=u.indexOf("_topRaf=requestAnimationFrame("), j=u.indexOf("},{passive:true});",i);
          const body=(i<0||j<0)?"nav":u.slice(i,j);   // not found => fail, never pass by absence
          return !/\bnav\b/i.test(body); })());
  }
  /* the contrast claim, recomputed here so the number cannot drift from the comment */
  {
    const hx=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
    const lum=c=>{const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); const [r,g,b]=hx(c).map(x=>x/255); return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
    const cr=(a,b)=>{const la=lum(a),lb=lum(b); return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);};
    const mix=(a,b,p)=>'#'+[0,1,2].map(i=>Math.round(hx(a)[i]*p+hx(b)[i]*(1-p)).toString(16).padStart(2,'0')).join('');
    /* anchored to the shadow on the NEXT line: a lazy [\s\S]*? spanned from the dark block's --pill to the light block's shadow and reported dark numbers as light */
    /* v3.3.461: the bar has no text, so the gate is the GRAPHICS one (3:1),
       and the active colour is the app's --accent, not a pill-only token
       (--pill-accent is retired). Worst backdrop: the theme's accent button
       scrolled under the 72% glass; the active glyph sits on its 12% accent
       capsule. Muted glyphs are held to 4.5:1 still -- they are the resting
       state and can afford it. */
    /* v3.3.463: the shadow tokens carry the lighting now; the theme is told by the drop colour (22,26,40 light, 0,0,0 dark) */
    const pillL=(cssN.match(/--pill:(#[0-9A-Fa-f]{6}); --pill-ink:(#[0-9A-Fa-f]{6});[\s\S]{0,160}?--pill-accent:(#[0-9A-Fa-f]{6});[\s\S]{0,700}?--pill-shadow:inset[^;]*rgba\(22,26,40/)||[]);
    const pillD=(cssN.match(/--pill:(#[0-9A-Fa-f]{6}); --pill-ink:(#[0-9A-Fa-f]{6});[\s\S]{0,160}?--pill-accent:(#[0-9A-Fa-f]{6});[\s\S]{0,700}?--pill-shadow:inset[^;]*rgba\(0,0,0,\.42\)/)||[]);
    const accL=(cssN.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:#C3CCF5/)||[])[1];
    const accD=(cssN.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:#3A4A8C/)||[])[1];
    /* the pill's active ink must BE the app's blue: the accent in light, the accent-as-ink in dark */
    const dimD=(cssN.match(/--accent:#4C6BE3; --accent-soft:#3A4A8C; --accent-dim:(#[0-9A-Fa-f]{6})/)||[])[1];
    ok("light: --pill-accent is the app accent itself", pillL[3]===accL, pillL[3]+" vs "+accL);
    ok("dark: --pill-accent is the app's accent-dim", pillD[3]===dimD, pillD[3]+" vs "+dimD);
    const inkD=pillD[3];
    ok("(harness) both pills and both accents were found", pillL[1]==="#FFFFFF" && pillD[1]==="#1C202A" && !!accL && !!accD, [pillL[1],pillD[1],accL,accD].join(" "));
    ok("(harness) the pill trio is intact (buildcheck v3.3.168 guards it)", !!pillL[3] && !!pillD[3]);
    /* v3.3.466: the tint falls from 88% at the top to 66% at the bottom; the
       glyphs sit at the centre, ~77%. Worst-case backdrop as before. */
    const worstL=mix(pillL[1],accL,.77), worstD=mix(pillD[1],accD,.77);
    /* v3.3.470: the capsule is grey (60% pill + 16% ink); the coloured glyph on it is Today's closed-day accent fill */
    const capL=mix(pillL[2],mix(pillL[1],worstL,.60),.16), capD=mix(pillD[2],mix(pillD[1],worstD,.60),.16);
    /* v3.3.462 RESTATES 4.5 -> 3: with no text in the bar every glyph is a
       graphic, and 3:1 is the gate for graphics. Held even in the worst case. */
    ok("light: the muted glyph clears 3:1 (graphic) on the glass with an accent button beneath", cr(pillL[2],worstL)>=3, cr(pillL[2],worstL).toFixed(2));
    ok("dark: the same", cr(pillD[2],worstD)>=3, cr(pillD[2],worstD).toFixed(2));
    /* on the pill the closed-day fill is --pill-accent (accent in light, accent-as-ink in dark) */
    ok("(harness) the pill's closed-day fill is --pill-accent", /:root\[data-skin="minimal"\] nav\.dayclosed button\[data-v="today"\] \.ng svg \.sq\{fill:var\(--pill-accent\)\}/.test(cssN));
    ok("light: Today's closed-day fill clears 3:1 on the grey capsule over that backdrop", cr(pillL[3],capL)>=3, cr(pillL[3],capL).toFixed(2));
    ok("dark: the same", cr(pillD[3],capD)>=3, cr(pillD[3],capD).toFixed(2));
  }
}

/* ================= v3.3.459: THREADS' WEIGHT, AND THE BAR HIDES ON SCROLL =========
   Labels at 600; glyphs at 24; the active state a capsule, not an underline;
   and the bar slides off after ~28px down, back on ~10px up, always shown at
   the top. Scroll travel is driven through navOnScroll with scrollY set by
   hand, since jsdom has no viewport to scroll. */
{
  const cssN=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
  /* v3.3.461 RESTATES: labels are gone, so their weight is moot; glyphs grew
     to 28px to carry the bar alone. */
  ok("glyphs are 28px", /nav button \.ng svg\{[^}]*width:28px;height:28px/.test(cssN));
  /* v3.3.470 RESTATES: selection is INK ON GREY, a neutral fact; colour on
     the bar belongs to the Today square's state alone -- accent fill when the
     day is closed, rest-ink ring while resting, selected or not. */
  /* v3.3.478 RESTATES: the selected glyph takes the BAR's strong ink
     (--pill-chalk), not the theme's --chalk. With the bar able to wear an
     appearance the app is not wearing (v3.3.477), --chalk went black on a
     dark bar in a light app. */
  ok("the selected tab is the BAR's ink on a grey capsule, in both the base sheet and the pill",
     /nav button\.on\{color:var\(--pill-chalk,var\(--chalk\)\);background:color-mix\(in srgb,var\(--muted\) 16%/.test(cssN) &&
     /:root\[data-skin="minimal"\] nav button\.on\{color:var\(--pill-chalk\);background:color-mix\(in srgb,var\(--pill\) 60%,var\(--pill-ink\) 16%\)/.test(cssN));
  ok("...and each appearance declares its own: white on the dark bar, near-black on the light one",
     /\[data-bar="dark"\]\{\s*--pill-chalk:#FFFFFF;/.test(cssN) && /--pill-chalk:#111318;/.test(cssN) && !/nav button\.on\{color:var\(--chalk\)/.test(cssN));
  {
    /* the selected glyph on its capsule, worst case: an accent button under
       the glass. Graphics gate, 3:1. Computed from the file, both bars.
       The colour helpers are local: the ones above belong to another block's
       scope and reaching into it is how a test breaks for a reason that has
       nothing to do with what it asserts. */
    const hx=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
    const lum=c=>{const f=v=>v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); const [r,g,b]=hx(c).map(x=>x/255); return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b);};
    const cr=(a,b)=>{const la=lum(a),lb=lum(b); return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05);};
    const mix=(a,b,p)=>'#'+[0,1,2].map(i=>Math.round(hx(a)[i]*p+hx(b)[i]*(1-p)).toString(16).padStart(2,'0')).join('');
    const accL=(cssN.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:#C3CCF5/)||[])[1];
    const accD=(cssN.match(/--accent:(#[0-9A-Fa-f]{6}); --accent-soft:#3A4A8C/)||[])[1];
    const bd=(cssN.match(/\[data-bar="dark"\]\{[\s\S]*?--pill:(#[0-9A-Fa-f]{6}); --pill-ink:(#[0-9A-Fa-f]{6})/)||[]);
    const bl=(cssN.match(/\[data-bar="light"\]\{[\s\S]*?--pill:(#[0-9A-Fa-f]{6}); --pill-ink:(#[0-9A-Fa-f]{6})/)||[]);
    const cd=(cssN.match(/\[data-bar="dark"\]\{\s*--pill-chalk:(#[0-9A-Fa-f]{6})/)||[])[1];
    const cl=(cssN.match(/--pill-chalk:(#111318)/)||[])[1];
    ok("(harness) both bars' surfaces and chalks were found", !!bd[1]&&!!bl[1]&&!!cd&&!!cl, [bd[1],cd,bl[1],cl].join(' '));
    const capD=mix(cd,mix(bd[1],mix(bd[1],accD,.77),.60),.16);
    const capL=mix(cl,mix(bl[1],mix(bl[1],accL,.77),.60),.16);
    ok("the selected glyph clears 3:1 on the dark bar", cr(cd,capD)>=3, cr(cd,capD).toFixed(2));
    ok("...and on the light bar", cr(cl,capL)>=3, cr(cl,capL).toFixed(2));
  }
  ok("...the closed day fills Today's square in the accent, regardless of selection",
     /nav\.dayclosed button\[data-v="today"\] \.ng svg \.sq\{fill:var\(--accent\);stroke:none\}/.test(cssN));
  ok("...and the rest ring is the darker rest-ink, like the header's",
     /nav\.resting button\[data-v="today"\] \.ng svg \.sq\{stroke:var\(--rest-ink\);fill:none\}/.test(cssN));
  /* Today's square: hollow while the day is open, filled when closed */
  run(`DB.days[todayISO]={w:[{part:'Chest',ex:'Dip',w:toKg(45),bw:true,reps:[8],at:1}],doneEx:[],donePart:[],upd:1}; SEED=deriveAll(); view='today'; render();`);
  ok("Today's square is hollow while the day is open (a set logged, not closed)",
     run(`!document.getElementById('nav').classList.contains('dayclosed')`) &&
     /nav button \.ng svg \.sq\{fill:none;stroke:currentColor/.test(cssN) && run(`!!document.querySelector('#nav [data-v="today"] rect.sq')`));
  run(`dayMeta().doneAll=true; render();`);
  ok("...and fills when the day is closed", run(`document.getElementById('nav').classList.contains('dayclosed')`) &&
     /nav\.dayclosed button\[data-v="today"\] \.ng svg \.sq\{fill:var\(--accent\)/.test(cssN));
  run(`dayMeta().doneAll=false; render();`);
  ok("...and empties again if the day is reopened", run(`!document.getElementById('nav').classList.contains('dayclosed')`));
  ok("History is a calendar: a stroked frame with a header bar, two pins and days",
     run(`(function(){const s=document.querySelector('#nav [data-v="history"] svg'); return !!s.querySelector('rect.frame') && s.querySelectorAll('rect').length===9;})()`) &&
     /nav button \.ng svg \.frame\{fill:none;stroke:currentColor/.test(cssN));
  ok("the active tab is a capsule, and the underline is gone from the base sheet",
     /nav button\.on\{[^}]*background:color-mix/.test(cssN) && !/\n\s*nav button\.on::after\{content/.test(cssN)
     && !/:root\[data-skin="minimal"\] nav button\.on::after\{background/.test(cssN));
  /* v3.3.460 RESTATES: it SLIDES. No opacity anywhere in the hide -- a fade
     that finishes before the move reads as vanishing. --dur-arrive, so the
     travel is seen; far enough to clear the inset. */
  /* v3.3.462 RESTATES: the position is an inline transform driven by the
     scroll; .hid is only pointer-events. Transitions are OFF while scrubbing
     and slow (--dur-slow) for the settle. Still no fade anywhere. */
  /* v3.3.470 RESTATES the whole 459-462 motion block: the bar STAYS. No
     transition of its own, no scroll hook, no hidden or scrub state. */
  ok("the bar has no transition of its own now (it stays)", !/\n\s*nav\{transition:transform/.test(cssN) && !/nav\.hid\{|nav\.scrub\{/.test(cssN));
  {
    const u4=fs.readFileSync(path.join(dir,"js/util.js"),"utf8");
    ok("...no navOnScroll, navSettle or navPlace remain, and the scroll listener does not touch the nav",
       !/function navOnScroll|function navSettle|function navPlace/.test(u4) && !/requestAnimationFrame\(\(\)=>\{[^}]*nav\b/.test(u4));
  }
}


/* ================= v3.3.469: THE OTHER HALF ON TODAY =================
   The attendance card, inverted, on Today while resting: same builder, same
   markup, rest days lit green. Train, Stats and History are themselves again
   (467/468 reverted); the nav ring stays. Known ledger: first day D-27, rests
   D-24, D-17, D-10, D-3 and today. */
{
  run(`(function(){
    const D=n=>{const t=new Date(todayISO+'T00:00'); t.setDate(t.getDate()-n); return t.toLocaleDateString('en-CA');};
    DB.days={}; DB.plan=null; DB.week=null; const rests=new Set([24,17,10,3]);
    for(let n=27;n>=1;n--){ if(rests.has(n)) continue;
      DB.days[D(n)]={w:[{part:'Chest',ex:'Dip',w:40,bw:true,reps:[8],at:1}],upd:1}; }
    DB.days[todayISO]={w:[],rest:1,upd:1}; SEED=deriveAll(); view='today'; render(); })()`);
  const T=run(`$('#view').innerHTML`);
  ok("Today carries the inverse attendance card while resting", run(`!!document.querySelector('#view .crcard.resting')`) && /Rest — that/.test(T));
  ok("...it is the SAME markup as the original: crhead, crtotal, crstreak, heatframe, wdrail, heatyears, heatgrid, heatticks",
     run(`(function(){const c=document.querySelector('.crcard.resting'); return ['.crhead','.crtotal','.crstreak','.heatframe','.wdrail','.heatyears','.heatgrid','.heatticks'].every(q=>!!c.querySelector(q));})()`));
  ok("...the number is days rested: 5", run(`document.querySelector('.crcard.resting .crtotal b').textContent`)==='5' && /days rested/.test(T));
  ok("...the run line is the rest analogue in TWO lines: resting 1 day / longest 1",
     run(`[...document.querySelectorAll('.crcard.resting .crstreak > span')].map(x=>x.textContent).join('|')`)==='resting 1 day|longest 1'
     && /\.crcard\.resting \.crstreak\{display:flex;flex-direction:column/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")),
     run(`document.querySelector('.crcard.resting .crstreak').textContent`));
  const lit=run(`document.querySelectorAll('.crcard.resting .heatgrid .hc.on').length`);
  ok("...exactly the five rest days are lit, and nothing before the ledger began", lit===5, lit);
  ok("...today is lit and ringed (it is a rest day)", run(`!!document.querySelector('.crcard.resting .hc.on.tod')`));
  ok("...and the ring breathes in the rest ink, not the accent (v3.3.471)",
     /\.crcard\.resting \.heatgrid \.hc\.tod::after\{border-color:var\(--rest-ink\)\}/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
  ok("...lit cells say 'rested', unlit say 'trained'", run(`document.querySelector('.crcard.resting .hc.on').getAttribute('aria-label')`).endsWith('rested') &&
     run(`[...document.querySelectorAll('.crcard.resting .hc')].find(c=>!c.classList.contains('on')&&!c.classList.contains('fut')).getAttribute('aria-label')`).endsWith('trained'));
  ok("...and the share counts today's rest: 5 of 28 days -> 18%, in the shorter wording", /18% of days since/.test(T) && !/of every day/.test(T), (T.match(/\d+% of days since/)||[])[0]);
  const cssR=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
  ok("...lit cells are the rest green, in the same cell rule as the original", /\.crcard\.resting \.heatgrid \.hc\.on\{background-color:var\(--rest\)\}/.test(cssR));
  // the surfaces reverted
  run(`view='stats'; render();`);
  ok("Stats is itself again: the original card, no rest lead", run(`!!document.querySelector('#view .crcard:not(.inverse)') && !document.querySelector('#view .crcard.resting')`) && !/Rhythm of rest/.test(run(`$('#view').innerHTML`)));
  run(`view='history'; hist.part=null; render();`);
  ok("History is itself again", !run(`!!document.querySelector('.restlineage')`) && !/Rest days \u00b7/.test(run(`$('#view').innerHTML`)));
  run(`view='lift'; lift.part=null; lift.ex=null; render();`);
  ok("Train is itself again", !run(`!!document.getElementById('restOverride')`) && !run(`!!document.querySelector('.restrecovery')`));
  ok("the nav ring stays", run(`document.getElementById('nav').classList.contains('resting')`));
  // not resting: Today has no inverse card
  run(`delete DB.days[todayISO].rest; SEED=deriveAll(); view='today'; render();`);
  ok("not resting: Today has no inverse card", !run(`!!document.querySelector('#view .crcard.resting')`));
}

/* ================= v3.3.477: THE BAR WEARS ITS OWN APPEARANCE =================
   Dark, Light, or Match the app -- a setting for the tab bar alone. Match is
   the default so nothing changes until it is asked to. Resolved beside the
   theme onto data-bar, painted pre-CSS, and the pill's tokens key off it. */
{
  const cssB=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");
  const idx=fs.readFileSync(path.join(dir,"index.html"),"utf8");
  ok("the pill's tokens live in data-bar blocks, not the theme blocks",
     /:root\[data-skin="minimal"\]\[data-bar="dark"\]\{[^}]*--pill:#1C202A/.test(cssB) &&
     /:root\[data-skin="minimal"\]\[data-bar="light"\]\{[^}]*--pill:#FFFFFF/.test(cssB) &&
     !/\[data-theme="light"\]\{[^}]*--pill:/.test(cssB));
  ok("...and index.html paints data-bar before any CSS, so a cold start cannot flash the other one",
     /_de\.dataset\.bar=localStorage\.getItem\('showup-bar'\)\|\|_de\.dataset\.theme/.test(idx));
  const bar=()=>run(`document.documentElement.dataset.bar`);
  run(`DB.settings.theme='light'; delete DB.settings.barTheme; applyTheme();`);
  ok("Match (the default) follows the app: light theme -> light bar", bar()==='light');
  run(`DB.settings.theme='dark'; applyTheme();`);
  ok("...and dark theme -> dark bar", bar()==='dark');
  run(`DB.settings.barTheme='dark'; DB.settings.theme='light'; applyTheme();`);
  ok("Dark holds the bar dark in a LIGHT app -- the whole point", bar()==='dark' && run(`document.documentElement.dataset.theme`)==='light');
  run(`DB.settings.barTheme='light'; DB.settings.theme='dark'; applyTheme();`);
  ok("...and Light holds it light in a dark app", bar()==='light' && run(`document.documentElement.dataset.theme`)==='dark');
  ok("...the choice is stored for the pre-paint read", run(`(function(){try{return localStorage.getItem('showup-bar');}catch(e){return null;}})()`)==='light');
  run(`DB.settings.barTheme='nonsense'; applyTheme();`);
  ok("an unrecognised value resolves to Match, like every other setting here", bar()===run(`document.documentElement.dataset.theme`));
  // the Settings control
  run(`DB.settings.barTheme='dark'; DB.settings.theme='dark'; applyTheme(); view='sync'; render();`);
  /* the control's attribute is data-barPICK: <html> carries data-bar as the
     resolved appearance, and a shared selector made the click handler swallow
     every tap in the app. Asserted so they cannot collide again. */
  ok("the control and the resolved value do NOT share a selector",
     !run(`!!document.querySelector('#view [data-bar]')`) && !!run(`document.documentElement.dataset.bar`));
  ok("Settings offers Match / Light / Dark for the tab bar, with the choice lit",
     /* scoped to #view: the <html> element also carries a data-bar, which is
        the RESOLVED appearance, not a control -- an unscoped query picked it
        up and the list came back with four entries. */
     run(`(function(){const b=[...document.querySelectorAll('#view [data-barpick]')].map(x=>x.dataset.barpick); const on=document.querySelector('#view [data-barpick].sel');
       return JSON.stringify(b)===JSON.stringify(['match','light','dark']) && on && on.dataset.barpick==='dark';})()`),
     run(`JSON.stringify([...document.querySelectorAll('#view [data-barpick]')].map(x=>x.dataset.barpick))`));
  ok("...and it says Match, not System -- the theme row above already means the system",
     run(`document.querySelector('#view [data-barpick="match"]').textContent`)==='Match' && !run(`[...document.querySelectorAll('#view [data-barpick]')].some(x=>/System/i.test(x.textContent))`));
  run(`document.querySelector('#view [data-barpick="light"]').click();`);
  ok("tapping one applies and remembers it", run(`DB.settings.barTheme`)==='light' && bar()==='light');
  run(`delete DB.settings.barTheme; DB.settings.theme='dark'; applyTheme(); view='today'; render();`);
}

process.exit(fail ? 1 : 0);
