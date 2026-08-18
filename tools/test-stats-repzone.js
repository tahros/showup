// test-stats-repzone.js DIR — v3.3.212 three-signal Growth Audit.
// The filename stays so the all-suite runner keeps the historical gate.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url:"https://tahros.github.io/showup/", runScripts:"outside-only", pretendToBeVisual:true });
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
w.HTMLCanvasElement.prototype.toDataURL=function(){return "data:image/png;base64,";};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);

let fail=0;
const check=(name,expr,want)=>{
  const got=run(expr),ok=String(got)===String(want);
  console.log(ok?"PASS":"FAIL",name,"→",got); if(!ok) fail++;
};
const statsSrc=fs.readFileSync(path.join(dir,"js/stats.js"),"utf8");
const cssSrc=fs.readFileSync(path.join(dir,"css/app.css"),"utf8");

run(`window._D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
window._mk=(n,rows)=>DB.days[_D(n)]={w:rows,upd:1};
window._reset=()=>{DB.days={};DB.settings.canon={};ga.grp=null;};
window._finish=()=>{migrateCanon();SEED=deriveAll();view='stats';render();};`);

// ---- cold start: facts, never a premature verdict -----------------------
run(`_reset();_mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[8,8],at:1}]);_finish();ga.grp='Chest';render();`);
check("Growth Audit replaces the Rep-zone heading",
  `[...document.querySelectorAll('#view h2')].some(h=>h.textContent.startsWith('Growth audit'))`,true);
check("the retired heading is absent",`!/Rep zones/i.test(document.querySelector('#view').textContent)`,true);
check("a first workout is active but not confirmed upward",`document.querySelector('.gastate').getAttribute('aria-label')`,"Flat");
check("the status contains no font glyph",`document.querySelector('.gastate').textContent.trim()`,"");
check("the cold-start icon uses the flat image class",`document.querySelector('.gastate').classList.contains('ga-flat')`,true);

run(`_reset();_mk(3,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:2}]);_finish();ga.grp='Chest';render();`);
check("two identical sessions hold no PR, so the row stays dark",`gaPR(gaExerciseSessions()['chest-press']).live`,false);
check("...and carry no badge",`!gaPR(gaExerciseSessions()['chest-press']).change`,true);

// ---- exercise-local observable progress ---------------------------------
run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:40,reps:[9],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Chest';render();`);
check("more reps at the same weight is a live PR",`gaPR(gaExerciseSessions()['chest-press']).live`,true);
check("the exercise subtitle is completely removed",`!document.querySelector('.garow small')`,true);
check("Going Up is an image-backed class",`document.querySelector('.gabadge').classList.contains('ga-up')`,true);
check("the icon keeps an accessible label",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Going up");

run(`_reset();
  _mk(5,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(3,[{part:'Chest',ex:'Chest Press',w:42,reps:[8],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:44,reps:[8],at:3}]);
  _finish();`);
check("more weight at the same reps is also a live PR",`gaPR(gaExerciseSessions()['chest-press']).live`,true);

// ---- Review requires four unchanged exposures ---------------------------
run(`_reset();for(const n of [7,5,3,1])_mk(n,[{part:'Back',ex:'Seated Cable Row',w:50,reps:[10],at:n}]);
  _finish();ga.grp='Back';render();`);
check("four unchanged sessions hold no PR",`gaPR(gaExerciseSessions()['seated-cable-row']).live`,false);
check("Review collapses to the one visible Flat state",`document.querySelector('.gabadge').getAttribute('aria-label')`,"Flat");
check("the row stays compact and never adds review prose",`!document.querySelector('.garow .garecord,.garow .note')`,true);

// ---- coverage is personal and rolling, not a universal target -----------
run(`_reset();
  _mk(15,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:1}]);
  _mk(8,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12,12,12,12,12,12,12],at:2}]);
  _mk(1,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12,12],at:3}]);
  _finish();ga.grp='Shoulders';render();`);
check("active without confirmed progress is Flat",`document.querySelector('.gastate').getAttribute('aria-label')`,"Flat");
check("there is no fourth below-pattern state",`!document.querySelector('.ga-below')`,true);
check("the recent-pattern prose block stays gone",`!document.querySelector('.gabase')&&!/pattern|four earlier 7-day blocks/i.test(document.querySelector('.gacard').textContent)`,true);

// ---- no recent work is a fact, not a prescription -----------------------
run(`_reset();
  _mk(15,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:1}]);
  _mk(8,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10,10],at:2}]);
  _mk(1,[{part:'Chest',ex:'Chest Press',w:40,reps:[10],at:3}]);
  _finish();ga.grp='Back';render();`);
check("no current work is Empty",`document.querySelector('.gastate').getAttribute('aria-label')`,"Empty");
check("Empty uses the quiet dot class",`document.querySelector('.gastate').classList.contains('ga-empty')`,true);
check("no recency subtitle remains",`!document.querySelector('.garow small')`,true);

// ---- a long archive does not overrule a changed current baseline --------
run(`_reset();
  for(const n of [80,70,60])_mk(n,[{part:'Legs',ex:'Squat',w:80,reps:[8],at:n}]);
  _mk(1,[{part:'Legs',ex:'Squat',w:60,reps:[10],at:1}]);
  _finish();`);
check("a lighter set with more reps remains Flat",
  `gaPR(gaExerciseSessions()['squat']).live`,false);
check("...and carries no progress claim",
  `gaPR(gaExerciseSessions()['squat']).change===null`,true);

// ---- one compact control, no information cloud --------------------------
run(`_reset();
  _mk(2,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Back',ex:'Lat Pulldown',w:45,reps:[10],at:2}]);
  _mk(0,[{part:'Shoulder',ex:'Lateral Raise',w:10,reps:[12],at:3}]);
  _finish();ga.grp=null;render();`);
check("the most recently trained group opens by default",`ga.grp`,"Shoulders");
check("the selector uses the six visible groups",`document.querySelectorAll('#gaGrp option').length`,6);
check("Glutes is internal, not a top-level choice",`[...document.querySelectorAll('#gaGrp option')].some(o=>o.value==='Glutes')`,false);
check("body parts run most-recent to least-recent",
  `[...document.querySelectorAll('#gaGrp option')].map(o=>o.value).join('|')`,"Shoulders|Back|Chest|Arms|Core|Legs");
check("the card shows at most four exercise receipts",`document.querySelectorAll('.gacard .garow').length<=4`,true);
check("there is no scatterplot, axis, zone bar, or exercise chip rail",
  `!document.querySelector('.rzscat,.rzbar,.rzlifts,.gahead svg')`,true);
check("the UI never asks for RIR or reps left",`!/RIR|reps? (?:left|remaining)|clean reps/i.test(document.querySelector('.gacard').textContent)`,true);
check("status readouts are images, not text symbols",`[...document.querySelectorAll('.gastate,.gabadge')].every(i=>
  !i.textContent.trim()&&['Empty','Flat','Going up'].includes(i.getAttribute('aria-label')))`,true);
check("exercise rows contain names only",`document.querySelectorAll('.garow small').length`,0);
check("What the record says is removed",`!document.querySelector('.ganext')&&!/What the record says/i.test(document.querySelector('.gacard').textContent)`,true);

run(`_reset();
  _mk(4,[{part:'Chest',ex:'Chest Press',w:40,reps:[8],at:1}]);
  _mk(1,[{part:'Chest',ex:'Chest Fly',w:20,reps:[12],at:2}]);
  _finish();ga.grp='Chest';render();`);
check("exercises also run most-recent to least-recent",
  `[...document.querySelectorAll('.garow b')].map(x=>x.textContent).join('|')`,"Chest Fly|Chest Press");

run(`(function(){const s=document.querySelector('#gaGrp');s.value='Back';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
check("changing the group replaces the card in place",`document.querySelector('.gacard').dataset.gacard`,"Back");
check("...without losing the selected value",`document.querySelector('#gaGrp').value`,"Back");

// ---- structural retirement and ordering ---------------------------------
check("Growth Audit is immediately before Session Build",`(function(){
  const hs=[...document.querySelectorAll('#view h2')].map(h=>h.childNodes[0].textContent.trim());
  return hs.indexOf('Session build')===hs.indexOf('Growth audit')+1;})()`,true);
check("Rep-zone functions and constants are deleted",
  `${!(/\brepZone(?:Data|Sets|ScatterSvg)?\s*\(|REPZONE_MAX_|REPZONE_LABELS/.test(statsSrc))}`,"true");
check("there are exactly three public status labels",
  `${/const GA_SIGNAL_LABELS=\{empty:'Empty',flat:'Flat',up:'Going up'\}/.test(statsSrc)}`,"true");
check("the UI uses two Noun Project assets plus a CSS dot, not a glyph map",
  `${!statsSrc.includes('GA_ICONS')&&['status-flat.png','status-up.png'].every(x=>cssSrc.includes(x))&&
    !cssSrc.includes('status-empty.png')&&/\.ga-empty\{[^}]*radial-gradient/.test(cssSrc)}`,"true");
check("only the Flat and Going Up status assets exist",
  `${['status-flat.png','status-up.png'].every(x=>fs.existsSync(path.join(dir,'assets',x)))&&
    !fs.existsSync(path.join(dir,'assets','status-empty.png'))}`,"true");
check("the status hierarchy is muted gray dot and line, then ShowUp blue trend",
  `${/\.ga-empty\{[^}]*faint[^}]*opacity:\.55/.test(cssSrc)&&
    /\.ga-flat\{[^}]*faint[^}]*opacity:\.55/.test(cssSrc)&&
    /\.ga-up\{[^}]*accent-ink/.test(cssSrc)&&/--ga-size:11px 11px/.test(cssSrc)&&
    /--ga-size:30px 30px/.test(cssSrc)}`,"true");
check("Growth Audit help explains its signals without icon credits",
  `${statsSrc.includes('Dot: no sets in 7 days')&&statsSrc.includes('line: no clear gain')&&
    statsSrc.includes('trend: a later day went heavier than anything in the last six months, or did more reps at a load used in them')&&!statsSrc.slice(statsSrc.indexOf('function growthAuditSection'),statsSrc.indexOf('function sessionBuild')).includes('Noun Project')}`,"true");
/* v3.3.252: the tip is the ONLY statement of this rule a user ever reads, so
   it is asserted against the rule's actual behaviour rather than against a
   remembered string. It named "comparable load and reps" while the code had
   accepted a heavier load at ANY rep count since v3.3.237 — the same stale
   clause that survived in the section comment. Both are now pinned to the
   two routes the code really has, so neither can drift alone again. */
const gaTip = statsSrc.slice(statsSrc.indexOf("hActs('ga',"),
                            statsSrc.indexOf("'About Growth audit'"));
check("...and the tip names BOTH routes to a record, matching the code",
  `${/heavier than anything in the last six months/.test(gaTip) &&
     /more reps at a load used in them/.test(gaTip) &&
     !/comparable load and reps/.test(gaTip)}`, "true");
const gaRule = statsSrc.slice(statsSrc.indexOf('The rule, in gym terms'),
                             statsSrc.indexOf('const GA_PR_DAYS'));
check("...and the section comment states those same two routes and no third",
  `${/more reps at the EXACT same load/.test(gaRule) &&
     /heavier than anything in the\s+record window/.test(gaRule) &&
     !/matches or beats the reps on the previous heaviest set/.test(gaRule)}`, "true");

check("icon credits live beneath the version in Settings",
  `${/ShowUp \$\{APP_VERSION\}<\/div>\s*<div class="note assetcredits"/.test(fs.readFileSync(path.join(dir,'js','settings.js'),'utf8'))&&
    ['minus-8363736','trend-2344331','ARIPATUT DASUKI','Travis Avery','Noun Project'].every(x=>fs.readFileSync(path.join(dir,'js','settings.js'),'utf8').includes(x))}`,"true");
check("Growth Audit has no hidden universal set target",
  `${!(/(?:target|ideal)\s*(?:sets?|volume)/i.test(statsSrc.slice(statsSrc.indexOf('v3.3.211 — Growth Audit'),statsSrc.indexOf('v3.3.192 — intent gaps'))))}`,"true");


// ---- v3.3.220: ONE standard. A row is lit if and only if it carries a
// badge, and both come from gaPR(). These cases are the ones that used to
// disagree on screen.
const gaSeed = (js) => run(`(function(){
  DB.days={}; DB.settings.canon={}; DB.settings.unit='kg'; ga.open=null;
  ${js}
  migrateCanon(); SEED=deriveAll(); view='stats'; ga.grp='Chest'; render();})()`);
const prOf = (name) => run(`(function(){
  const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='${name}');
  const r=gaPR(ex); return (r.live?'LIT ':'dark ')+(r.change?r.change.text:'no badge');})()`);

// 1. heavier at fewer reps IS a record — a first-ever 50 kg is new ground
//     even though an older 45 kg set ran longer. This is the case that sent
//     the maker looking for a missing 85 kg deadlift in v3.3.237.
gaSeed(`for(const n of [16,12,8]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[15,15],at:1}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10],at:2}],upd:1};`);
check("heavier at fewer reps is a PR", `"${prOf('Chest Fly')}"`, "LIT +5 kg");

// 2. more reps at the SAME weight
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(4)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[12]}],upd:1};`);
check("more reps at the same weight is a PR", `"${prOf('Chest Fly')}"`, "LIT +2 reps");

// 3. THE LOOPHOLE: a lighter load never becomes progress merely by adding
//    reps. It only counts after a prior set exists at that exact load.
gaSeed(`for(const n of [20,16]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[30]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("a light deload rep-out is NOT a PR", `"${prOf('Chest Fly')}"`, "dark no badge");
gaSeed(`for(const n of [20,16]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("a new lighter load is still not comparable", `"${prOf('Chest Fly')}"`, "dark no badge");
gaSeed(`DB.days[_D(20)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[10]}],upd:1};
        DB.days[_D(16)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:20,reps:[30]}],upd:1};`);
check("more reps at the exact lighter load is comparable", `"${prOf('Chest Fly')}"`, "LIT +20 reps");

// The maker's screenshot: 10x12 must never claim to improve on 27.5x10.
gaSeed(`DB.days[_D(20)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:27.5,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:10,reps:[12]}],upd:1};`);
check("10x12 does not improve on 27.5x10", `"${prOf('Rear Deltoids')}"`, "dark no badge");

// v3.3.227: sets within one workout are peers, never historical baselines.
// The maker's screenshot showed 80x7 "improving" on 80x6 from the same day.
gaSeed(`DB.days[_D(6)]={w:[{part:'Legs',ex:'Deadlift',w:80,reps:[6,7]}],upd:1};`);
check("80x7 does not improve on 80x6 from the same day",
      `"${prOf('Deadlift')}"`, "dark no badge");
gaSeed(`DB.days[_D(20)]={w:[{part:'Legs',ex:'Deadlift',w:80,reps:[5]}],upd:1};
        DB.days[_D(6)]={w:[{part:'Legs',ex:'Deadlift',w:80,reps:[7,6]}],upd:1};`);
check("a later day can improve beyond its earlier-day baseline",
      `"${prOf('Deadlift')}"`, "LIT +2 reps");
check("the comparison receipt crosses two different dates",
      `(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift');
        const p=gaPR(ex).pr;return p.d!==p.beat.d;})()`, true);

// 4. the window: a PR ages out at GA_PR_DAYS, badge and mark together
gaSeed(`DB.days[_D(80)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(40)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[8]}],upd:1};`);
check("a PR older than the window goes dark AND loses its badge", `"${prOf('Chest Fly')}"`, "dark no badge");
check("the celebration window is 7 days (v3.3.253, was 28)", `GA_PR_DAYS`, 7);
check("...and the record window is 180 days", `GA_RECORD_DAYS`, 180);
check("...and the recent record comes from the whole 180-day window",
      `(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
        return gaPR(ex).best.w;})()`, 50);
check("...while the all-time set is carried separately",
      `(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
        return gaPR(ex).all.w;})()`, 50);

// ---- v3.3.253: the RECORD has a horizon --------------------------------
// An all-time giant older than GA_RECORD_DAYS no longer gates progress: the
// maker's body, technique and grip have changed since, so the bar to clear is
// what the CURRENT athlete has done. The old set stays named in the receipt.
gaSeed(`DB.days[_D(300)]={w:[{part:'Chest',ex:'Chest Fly',w:120,reps:[3]}],upd:1};
        DB.days[_D(60)]={w:[{part:'Chest',ex:'Chest Fly',w:80,reps:[8]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:85,reps:[5]}],upd:1};`);
check("a giant from 300 days ago no longer gates: 85 beats the 80 of the window",
      `"${prOf('Chest Fly')}"`, "LIT +5 kg");
check("...the all-time 120 is still found", `(function(){
  const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
  return gaPR(ex).all.w;})()`, 120);
run(`(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
  ga.open=ex.id; render();})()`);
check("...and the receipt names it on its own All-time row", `(function(){
  const rows=[...document.querySelectorAll('.garcrow')];
  const at=rows.find(r=>r.querySelector('.garck').textContent==='All-time');
  return at?at.querySelector('b').textContent:'(missing)';})()`, "120kg \u00d7 3");
run(`ga.open=null;`);

// the window ROLLS with the day being judged: a gain from January was judged
// by January's standard, and remains that day's receipt even though its
// baseline has since left today's window
gaSeed(`DB.days[_D(230)]={w:[{part:'Chest',ex:'Chest Fly',w:80,reps:[8]}],upd:1};
        DB.days[_D(200)]={w:[{part:'Chest',ex:'Chest Fly',w:90,reps:[8]}],upd:1};`);
check("an old gain was judged by the standard of ITS day", `(function(){
  const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
  const p=gaPR(ex); return p.pr?p.pr.text:'no pr';})()`, "+10 kg");
check("...but nothing stands in today's window", `(function(){
  const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
  return gaPR(ex).best===null;})()`, true);

// a comeback after seven months away is a BASELINE, not a record — there is
// nothing recent to beat, and the receipt says so instead of celebrating
gaSeed(`DB.days[_D(250)]={w:[{part:'Chest',ex:'Chest Fly',w:100,reps:[5]}],upd:1};
        DB.days[_D(2)]={w:[{part:'Chest',ex:'Chest Fly',w:60,reps:[10]}],upd:1};`);
check("the first session back after 250 days is not a record",
      `"${prOf('Chest Fly')}"`, "dark no badge");
run(`(function(){const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
  ga.open=ex.id; render();})()`);
check("...and its receipt shows Recent best AND All-time as separate truths", `(function(){
  const ks=[...document.querySelectorAll('.garcrow .garck')].map(x=>x.textContent);
  return ks.join('|');})()`, "Recent best|All-time");
run(`ga.open=null;`);

// ---- v3.3.253: an IN-PROGRESS PR lights the audit ----------------------
// The maker asked for this as a feature; it was already true — nothing in the
// audit reads doneEx — but only by accident of nobody filtering. Pinned so a
// future "completed sets only" refactor cannot silently take it away.
gaSeed(`DB.days[_D(7)]={w:[{part:'Chest',ex:'Chest Fly',w:80,reps:[8]}],upd:1,doneEx:['Chest Fly'],donePart:['Chest'],doneAll:true};
        DB.days[_D(0)]={w:[{part:'Chest',ex:'Chest Fly',w:85,reps:[5]}],upd:1,doneEx:[],donePart:[],doneAll:false};`);
check("a PR mid-exercise lights the row BEFORE anything is completed",
      `"${prOf('Chest Fly')}"`, "LIT +5 kg");
check("...on the rendered row, not just the model", `(function(){
  const row=[...document.querySelectorAll('.garow')].find(r=>r.querySelector('b').textContent==='Chest Fly');
  return row.querySelector('.gadelta').textContent+' / '+row.querySelector('.gabadge').getAttribute('aria-label');})()`,
      "+5 kg / Going up");

// 5. the rendered row: badge present <=> mark lit. This is the contradiction
//    the maker saw, asserted on the DOM rather than the model.
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(2)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(2)].w.push({part:'Chest',ex:'Chest Press',w:40,reps:[8]});
        for(const n of [90,86]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};`);
check("every badged row is lit, and every lit row is badged",
      `[...document.querySelectorAll('.garow')].every(r=>
        !!r.querySelector('.gadelta') === !!r.querySelector('.gabadge.ga-up'))`, true);
check("...and the PR row is the one that is lit",
      `(function(){const r=[...document.querySelectorAll('.garow')].find(x=>/Chest Fly/.test(x.textContent));
        return !!r.querySelector('.gabadge.ga-up') && !!r.querySelector('.gadelta');})()`, true);
check("a lift with no recent PR shows neither",
      `(function(){const r=[...document.querySelectorAll('.garow')].find(x=>/Chest Press/.test(x.textContent));
        return !r.querySelector('.gadelta') && !r.querySelector('.gabadge.ga-up');})()`, true);

// 6. the group mark follows the same authority
check("the group is 'going up' when a recent lift holds a live PR",
      `document.querySelector('.gastate').classList.contains('ga-up')`, true);

// 7. the old second standard is gone for good
check("no second growth machine survives",
      `${/gaExerciseState|gaDominates|state\.key/.test(statsSrc)}`, "false");



// ---- v3.3.221: tapping a row names the actual PR set --------------------
gaSeed(`for(const n of [16,12]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};`);
check("no receipt until a row is tapped", `!document.querySelector('.garcpt')`, true);
run(`(function(){const v=document.querySelector('#view'); v._k=1;
  document.querySelector('.garow[data-gaex]').click();})()`);
check("tapping opens a receipt in place, without rebuilding the page",
      `!!document.querySelector('.garcpt') && document.querySelector('#view')._k===1`, true);
check("...naming the exact set that earned the badge",
      `(function(){const b=[...document.querySelectorAll('.garcrow')][0];
        return b.querySelector('.garck').textContent+'|'+b.querySelector('b').textContent;})()`,
      "Improved to|50kg × 10");
check("...and the day it was done",
      `/^\\d{1,2}\\/\\d{1,2}\\/\\d{2}$/.test(document.querySelector('.garcrow .garcw').textContent)`, true);
check("...and the set it beat",
      `(function(){const r=[...document.querySelectorAll('.garcrow')][1];
        return r.querySelector('.garck').textContent+'|'+r.querySelector('b').textContent;})()`,
      "Previous best|45kg × 10");
check("...and the previous best has its own date",
      `(function(){const rs=[...document.querySelectorAll('.garcrow')];
        const ex=Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly');
        return rs[1].querySelector('.garcw').textContent===gaDay(gaPR(ex).pr.beat.d);})()`, true);
check("dates stay beside their performances instead of at the card edge",
      `getComputedStyle(document.querySelector('.garcrow')).gridTemplateColumns.split(' ')[1]!== '1fr'`, true);
check("the unhelpful Heaviest summary is absent from every exercise row",
      `![...document.querySelectorAll('.garow')].some(r=>/Heaviest/i.test(r.textContent))`, true);
check("the receipt agrees with the badge on the row above it",
      `(function(){const row=document.querySelector('.garow.open');
        const badge=row.querySelector('.gadelta').textContent.trim();
        const pr=gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Chest Fly'));
        return badge===pr.change.text;})()`, true);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("tapping again closes it", `!document.querySelector('.garcpt')`, true);

// a lift with no record at all explains itself rather than showing nothing
gaSeed(`for(const n of [16,12,3]) DB.days[_D(n)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};`);
run(`document.querySelector('.garow[data-gaex]').click();`);
/* v3.3.239: "No improvement yet." was true but unhelpful — it never said
   WHAT had to be beaten. v3.3.253 RESTATES: the bar is now the RECENT best
   (all sets here are inside the window, so no separate All-time row), and
   the note names the six-month pool a record draws from. */
check("a lift with no PR says what would beat it",
      `/heavier load than it, or more reps at a load used in the last six months/
        .test(document.querySelector('.garcnote').textContent)`, true);
check("...above the stated recent best",
      `document.querySelector('.garcrow .garck').textContent`, "Recent best");

// an aged-out improvement stays available with the same compact date
gaSeed(`DB.days[_D(80)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[10]}],upd:1};
        DB.days[_D(40)]={w:[{part:'Chest',ex:'Chest Fly',w:50,reps:[10]}],upd:1};
        DB.days[_D(3)]={w:[{part:'Chest',ex:'Chest Fly',w:45,reps:[8]}],upd:1};`);
run(`document.querySelector('.garow[data-gaex]').click();`);
check("an aged-out improvement still uses the compact date",
      `/^\\d{1,2}\\/\\d{1,2}\\/\\d{2}$/.test(document.querySelector('.garcrow .garcw').textContent)`, true);
check("...while the row itself stays dark and unbadged",
      `(function(){const r=document.querySelector('.garow.open');
        return !r.querySelector('.gadelta') && !r.querySelector('.gabadge.ga-up');})()`, true);


// ---- v3.3.237: the maker's 85 kg deadlift ------------------------------
// A first-ever 85 kg went unbadged because the previous best (80 kg x 7) ran
// longer, and the rule demanded a heavier set ALSO match that rep count.
// Going heavier than anything ever lifted is a record on its own.
gaSeed(`DB.days[_D(10)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[3,3]}],upd:1};
        DB.days[_D(6)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[7]}],upd:1};
        DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:60,reps:[5]},
                              {part:'Back',ex:'Deadlift',w:85,reps:[6]}],upd:1};`);
check("a new heaviest set is a PR even at fewer reps than the old best",
      `"${prOf('Deadlift')}"`, "LIT +5 kg");
check("...naming the set it beat",
      `(function(){const r=gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift'));
        return r.pr.w+'x'+r.pr.rep+' beat '+r.pr.beat.w+'x'+r.pr.beat.rep;})()`,
      "85x6 beat 80x7");
check("...logged TODAY, so a session in progress counts",
      `(function(){const r=gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift'));
        return r.pr.d===todayISO;})()`, true);
// and the two rules that must survive the loosening
check("a lighter load with more reps still claims nothing",
      `(function(){
        const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
        DB.days={}; DB.settings.canon={};
        DB.days[D(20)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:27.5,reps:[10]}],upd:1};
        DB.days[D(3)]={w:[{part:'Shoulder',ex:'Rear Deltoids',w:10,reps:[12]}],upd:1};
        migrateCanon(); SEED=deriveAll();
        return gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Rear Deltoids')).live;})()`, false);
check("and a heavier set later in the SAME workout is not progress",
      `(function(){
        const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA')};
        DB.days={}; DB.settings.canon={};
        DB.days[D(10)]={w:[{part:'Legs',ex:'Squat',w:100,reps:[5]}],upd:1};
        DB.days[D(3)]={w:[{part:'Legs',ex:'Squat',w:60,reps:[5]},{part:'Legs',ex:'Squat',w:90,reps:[5]}],upd:1};
        migrateCanon(); SEED=deriveAll();
        return gaPR(Object.values(gaExerciseSessions()).find(e=>e.name==='Squat')).live;})()`, false);


// ---- v3.3.238: a lift's group follows its own home ----------------------
// Deadlift is DUAL (Back/Legs). Train said "Counts as BACK" while the audit
// re-derived Legs from the muscle taxonomy, so the app disagreed with itself
// and with an explicit user choice.
gaSeed(`DB.days[_D(6)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[7]},
                          {part:'Back',ex:'Bent-Over Row',w:65,reps:[10]}],upd:1};
        DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:85,reps:[6]}],upd:1};`);
check("a Back-homed Deadlift is audited under Back",
      `Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift').group`, "Back");
check("...and appears in exactly ONE group, never counted twice",
      `Object.values(gaExerciseSessions()).filter(e=>e.name==='Deadlift').length`, 1);
check("...so the group's set count stays honest",
      `(function(){const g=growthAuditData().groups;
        const back=g['Back'].sets, legs=g['Legs']?g['Legs'].sets:0;
        return back===3 && legs===0;})()`, true);
check("the Train tab and the audit now name the same home",
      `PART_VISIBLE[homePartOf('Deadlift')]===
       Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift').group`, true);
run(`(function(){DB.settings.partOv['Deadlift']='Legs'; SEED=deriveAll();})()`);
check("'move to Legs' moves the audit row with it",
      `Object.values(gaExerciseSessions()).find(e=>e.name==='Deadlift').group`, "Legs");
run(`(function(){delete DB.settings.partOv['Deadlift']; SEED=deriveAll();})()`);
check("an exercise with no home falls back to the muscle taxonomy",
      `gaGroupForRow(['Legs','Leg Extension',40,[10]])`, "Legs");
check("...and Biceps still folds into Arms",
      `gaGroupForRow(['Biceps','Barbell Curl',30,[10]])`, "Arms");


// ---- v3.3.239: the receipt names the set standing in the way ------------
// "I just lifted 85 kg — why is this not a record?" was unanswerable from the
// card, because the all-time best was never shown.
gaSeed(`DB.days[_D(60)]={w:[{part:'Back',ex:'Deadlift',w:85,reps:[6]}],upd:1};
        DB.days[_D(6)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[6,7]}],upd:1};
        DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:85,reps:[6,6]}],upd:1};`);
run(`(function(){ga.grp='Back'; render();
  [...document.querySelectorAll('.garow[data-gaex]')].find(x=>/Deadlift/.test(x.textContent)).click();})()`);
check("a lift with nothing beaten still names its recent best",
      `document.querySelector('.garcrow .garck').textContent`, "Recent best");
check("...with the set and the day it happened",
      `document.querySelector('.garcrow b').textContent`, "85kg × 6");
check("...and says what a record would take",
      `/heavier load than it, or more reps at a load used in the last six months/
        .test(document.querySelector('.garcnote').textContent)`, true);

// when a record DID land, the best ever appears only if it differs
gaSeed(`DB.days[_D(10)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[3]}],upd:1};
        DB.days[_D(6)]={w:[{part:'Back',ex:'Deadlift',w:80,reps:[7]}],upd:1};
        DB.days[todayISO]={w:[{part:'Back',ex:'Deadlift',w:85,reps:[6]}],upd:1};`);
run(`(function(){ga.grp='Back'; render();
  [...document.querySelectorAll('.garow[data-gaex]')].find(x=>/Deadlift/.test(x.textContent)).click();})()`);
check("a fresh record reads Improved to, not Best ever",
      `document.querySelector('.garcrow .garck').textContent`, "Improved to");
check("...and does not repeat itself as the best ever",
      `[...document.querySelectorAll('.garcrow .garck')].map(x=>x.textContent).join('|')`,
      "Improved to|Previous best");

process.exit(fail?1:0);
