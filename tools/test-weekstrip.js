// v4.1.8 — the header strip as a calendar week.
// It was a rolling seven days ending on today, so "the live square is on the
// right" was geometry. Driven through real renders and real clicks, because
// every claim is about which square is which.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
/* the detail may be either a snippet to evaluate in the page or a plain value
   already computed here. Evaluating blindly turned a detail of "ahead" into an
   identifier and killed the run, so a failed eval falls back to the value. */
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  let shown=g;
  if(typeof g==='string'){try{shown=run(g);}catch(_){shown=g;}}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${shown}`:''));if(!good)fails++;};

/* Mon 9/7 trained, Tue missed, Wed 9/9 trained, Thu 9/10 trained, Fri 9/11 is today */
const setup=(weekStart='sunday',rest=false,today=false)=>run(`
  DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';DB.settings.weekStart='${weekStart}';
  todayISO='2026-09-11';checkDate=()=>false;
  for(const d of ['2026-09-07','2026-09-09','2026-09-10'])
    DB.days[d]={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};
  ${today?`DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};`:''}
  ${rest?`DB.days[todayISO]={w:[],rest:1,upd:1};`:''}
  SEED=deriveAll();view='today';lift.plan=null;dayMeta();render();`);
const cls=()=>run(`JSON.stringify([...document.querySelectorAll('#hWeek .hwd')].map(e=>e.className.replace('hwd','').trim()))`);
const chip=()=>run(`document.getElementById('hStreak').textContent`);

// ---- the frame
setup('sunday');
ok('the strip is seven squares', run(`document.querySelectorAll('#hWeek .hwd').length`)===7,
   String(run(`document.querySelectorAll('#hWeek .hwd').length`)));
ok('Sunday start: the week runs Sun 9/6 → Sat 9/12',
   run(`JSON.stringify(weekDays())`)===JSON.stringify(['2026-09-06','2026-09-07','2026-09-08','2026-09-09','2026-09-10','2026-09-11','2026-09-12']),
   `weekDays()[0]+' … '+weekDays()[6]`);
ok('...today is the SIXTH square, not the last — the ring travels',
   JSON.parse(cls())[5].includes('tod') && !JSON.parse(cls())[6].includes('tod'), cls());
ok('...the day after today is marked ahead, not missed',
   JSON.parse(cls())[6]==='ahead', JSON.parse(cls())[6]);
ok('...and days that passed with nothing are plain, never ahead',
   JSON.parse(cls())[2]==='' && JSON.parse(cls())[0]==='', cls());

// ---- Monday start reframes without moving a fact
setup('monday');
ok('Monday start: the week runs Mon 9/7 → Sun 9/13',
   run(`weekDays()[0]`)==='2026-09-07' && run(`weekDays()[6]`)==='2026-09-13',
   `weekDays()[0]+' … '+weekDays()[6]`);
ok('...today moves to the FIFTH square', JSON.parse(cls())[4].includes('tod'), cls());
ok('...with two days ahead of it now',
   JSON.parse(cls()).filter(c=>c==='ahead').length===2, cls());

// ---- the count is filled squares, and only filled squares
setup('sunday');
ok('the chip counts days trained THIS WEEK, not the streak', chip()==='3d', chip());
setup('monday');
ok('...and the same week counts the same under either setting', chip()==='3d', chip());
/* dayMeta() opens an empty record for today, so the raw key count is 4 --
   count the days that actually hold sets */
ok('...which proves the setting moves the frame, not the record',
   run(`Object.values(DB.days).filter(d=>(d.w||[]).length).length`)===3,
   `Object.values(DB.days).filter(d=>(d.w||[]).length).length+' trained days on the record'`);
setup('sunday',false,true);
ok('an open today does not count until a set lands — then it does', chip()==='4d', chip());
setup('sunday',true);
/* v3.3.437 gave the chip a word on a rest day -- the square beside it is
   already green and the header is washed in the rest ink, so a numeral would
   have been the third telling. That is unchanged; what matters here is that
   the rest does not become a filled square. */
ok('a declared rest today shows the word, not a count', chip()==='rest', chip());
ok('...and adds nothing to the week — still three filled',
   run(`weekTrained()`)===3, `String(weekTrained())`);
ok('...and is the only green in the strip, on today alone',
   JSON.parse(cls())[5].includes('resting') && !JSON.parse(cls()).some((c,i)=>i!==5&&c.includes('resting')),
   cls());

// ---- a week with nothing in it yet
run(`todayISO='2026-09-13';DB.settings.weekStart='sunday';DB.days={};SEED=deriveAll();dayMeta();render();`);
ok('the first morning of a week reads 0d, not an error', chip()==='0d', chip());
ok('...with six dotted days ahead and one ringed today',
   JSON.parse(cls()).filter(c=>c==='ahead').length===6 && JSON.parse(cls())[0].includes('tod'), cls());

// ---- the setting is reachable and it works
run(`todayISO='2026-09-11';DB.settings.weekStart='sunday';view='sync';render();`);
ok('Settings offers the choice',
   run(`document.querySelectorAll('[data-week-start]').length`)===2,
   String(run(`document.querySelectorAll('[data-week-start]').length`)));
ok('...showing which one is on',
   run(`document.querySelector('[data-week-start="sunday"]').classList.contains('sel')`));
run(`document.querySelector('[data-week-start="monday"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);
ok('tapping Monday takes', run(`DB.settings.weekStart==='monday' && weekStartDow()===1`),
   `String(DB.settings.weekStart)`);
run(`view='today';render();`);
ok('...and the strip redraws to the new frame', JSON.parse(cls())[4].includes('tod'), cls());

// ---- the CSS carries the one rule
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
/* the outline is an inset shadow, not a border: test-skin collects any rule
   with `border:...px` as a NEW SURFACE that must then be skinned, and a
   future day is a colour state on a box .hwd already owns. At 10px the dash
   was barely two strokes a side, so nothing legible was lost. */
ok('a day ahead is outlined, never filled',
   /\.h-week \.hwd\.ahead\{background:none;\s*box-shadow:inset 0 0 0 1\.2px/.test(css));
ok('...and declares no new surface, so the skin guard stays meaningful',
   !/\.h-week \.hwd\.ahead\{[^}]*border:/.test(css));
/* v4.1.9: today's ring was never mine to add -- it has been an `outline` with
   a 2px offset since long before this, and hwpulse breathes its colour. v4.1.8
   gave it a second ring and hollowed the square; the assertion now holds the
   rings at ONE and keeps the fill, which is what went wrong. */
ok('...today keeps its one ring, the breathing outline it always had',
   /\.h-week \.hwd\.tod\{outline:1\.5px solid var\(--accent\)/.test(css) &&
   !/\.h-week \.hwd\.tod:not\(\.on\)\{[^}]*box-shadow/.test(css));
ok('...and an untrained today is not hollowed out',
   !/\.h-week \.hwd\.tod:not\(\.on\)\{[^}]*background:none/.test(css));
/* the sheen is the maker's favourite thing in the header; nothing may quietly
   stop it sweeping a trained square */
ok('the shimmer still sweeps every trained square',
   /\.h-week \.hwd\.on::after\{[^}]*animation:hwsheen/.test(css) &&
   /\.h-week \.hwd:nth-child\(7\)\.on::after\{animation-delay:\.60s\}/.test(css));
ok('...and today, once trained, is a filled square that can carry it',
   /\.h-week \.hwd\.on\{background:var\(--accent\)\}/.test(css));
/* ---- v4.1.11: the light-mode hierarchy, measured -------------------------
   A missed day was --surface2 (#F7F7F7) on a --ground of #EFEFEF: 1.06:1, the
   weakest mark the strip can make, while the ahead outline sat at 1.53:1. The
   loudest square in the week was the one where nothing had happened.
   Asserted as CONTRAST RATIOS against the real ground, because "looks better"
   is not a claim a test can hold and a ratio is. */
{
  const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
  const lum=h=>{const[r,g,b]=hex(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});
    return .2126*r+.7152*g+.0722*b;};
  const cr=(a,b)=>{const[hi,lo]=[lum(a),lum(b)].sort((p,q)=>q-p);return (hi+.05)/(lo+.05);};
  const pick=re=>{const m=css.match(re);return m&&m[1];};
  /* anchored to the LIGHT block: --ground appears in the dark block first, and
     an unanchored match measured everything against #0A0A0A and called the
     inversion fixed when it was not */
  const lightBlock=css.slice(css.indexOf(':root[data-theme="light"]{'));
  const ground=(lightBlock.match(/--ground:(#[0-9A-Fa-f]{6})/)||[])[1];
  /* v4.1.12 added :not(.on) to this selector -- the missed fill must match
     nothing but a missed day */
  /* tolerant of the selector shape on purpose: the shape itself is asserted
     below, and the fixture should not be what fails when the cascade breaks */
  const miss=pick(/:root\[data-theme="light"\] header:not\(\.live\) \.h-week \.hwd:not\(\.on\)\{background:(#[0-9A-Fa-f]{6})\}/);
  const ahead=pick(/:root\[data-theme="light"\] header:not\(\.live\) \.h-week \.hwd\.ahead\{background:none;\s*box-shadow:inset 0 0 0 1\.2px (#[0-9A-Fa-f]{6})\}/);
  ok('(fixture) the light tokens are readable from the sheet',
     !!ground && !!miss && !!ahead, `${ground} / ${miss} / ${ahead}`);
  ok('a missed day is actually visible on the header ground',
     cr(miss,ground)>=1.18, cr(miss,ground).toFixed(2)+':1');
  ok('...and a day that has not arrived is QUIETER than one that has',
     cr(ahead,ground) < cr(miss,ground),
     `ahead ${cr(ahead,ground).toFixed(2)}:1 vs missed ${cr(miss,ground).toFixed(2)}:1`);
  ok('...but still visible enough to read as a square at all',
     cr(ahead,ground)>=1.08, cr(ahead,ground).toFixed(2)+':1');
  ok('dark mode is untouched — it had the opposite arithmetic already',
     !/:root\[data-theme="dark"\] \.h-week \.hwd\{/.test(css));
  ok('...and --surface2 itself is not repainted for half the app',
     /--ground:#EFEFEF; --surface:#FFFFFF; --surface2:#F7F7F7/.test(css));
}
/* ---- v4.1.12: the cascade, not the hex ----------------------------------
   v4.1.11 asserted the light-mode colours by reading them out of the
   stylesheet, and shipped a rule that painted over EVERY TRAINED DAY. The
   hex values were right; the cascade was not, and a text match cannot see a
   cascade. Resolved style, with the sheet actually installed. */
{
  const {JSDOM}=require('jsdom');
  const page=new JSDOM(`<!doctype html><html data-theme="light"><head><style>${css}</style></head>
    <body><div id="app"><header><div class="h-week">
      <i class="hwd on"></i><i class="hwd"></i><i class="hwd ahead"></i>
      <i class="hwd tod"></i><i class="hwd on tod"></i></div></header></div></body></html>`,{pretendToBeVisual:true});
  const bg=sel=>page.window.getComputedStyle(page.window.document.querySelector(sel)).background||
                page.window.getComputedStyle(page.window.document.querySelector(sel)).backgroundColor;
  const MISS='rgb(218, 218, 218)';
  ok('(fixture) the missed square really resolves to the new grey',
     bg('.hwd:not(.on):not(.ahead):not(.tod)').includes(MISS)||bg('.hwd:not(.on):not(.ahead):not(.tod)').includes('#DADADA'),
     bg('.hwd:not(.on):not(.ahead):not(.tod)'));
  ok('A TRAINED DAY IS NOT PAINTED OVER BY THE MISSED FILL',
     !bg('.hwd.on').includes(MISS) && !bg('.hwd.on').toLowerCase().includes('#dadada'),
     bg('.hwd.on'));
  ok('...and today, once trained, keeps its fill too',
     !bg('.hwd.on.tod').includes(MISS) && !bg('.hwd.on.tod').toLowerCase().includes('#dadada'),
     bg('.hwd.on.tod'));
  ok('...while an untrained today does take the missed grey',
     bg('.hwd.tod:not(.on)').includes(MISS)||bg('.hwd.tod:not(.on)').toLowerCase().includes('#dadada'),
     bg('.hwd.tod:not(.on)'));
  ok('the light override says what it is — the MISSED fill, matching nothing else',
     /:root\[data-theme="light"\] header:not\(\.live\) \.h-week \.hwd:not\(\.on\)\{background:#DADADA\}/.test(css));
}
/* ---- v4.1.13: the live strip, by resolved style --------------------------
   A skipped day was white at 28% against a trained day's white at 100% -- the
   same colour twice, so a skip read as a dim trained day. Measured in a real
   document, because v4.1.11 proved a text match cannot see a cascade. */
{
  const {JSDOM}=require('jsdom');
  const page=new JSDOM(`<!doctype html><html data-theme="light"><head><style>${css}</style></head>
    <body><header class="live"><div class="h-week">
      <i class="hwd on"></i><i class="hwd" id="miss"></i><i class="hwd ahead"></i>
      <i class="hwd tod" id="tod"></i></div></header></body></html>`,{pretendToBeVisual:true});
  const win=page.window, q=sel=>win.document.querySelector(sel);
  const cs=sel=>win.getComputedStyle(q(sel));
  const bgOf=sel=>cs(sel).background||cs(sel).backgroundColor;
  ok('live: a skipped day is a dark mark, not a dim trained day',
     /rgba\(0, ?0, ?0/.test(bgOf('#miss')), bgOf('#miss'));
  ok('...so it no longer borrows the trained day\'s white',
     !/255, ?255, ?255/.test(bgOf('#miss')), bgOf('#miss'));
  ok('...while a trained day stays solid white', /rgb\(255, 255, 255\)|#fff/.test(bgOf('.hwd.on')), bgOf('.hwd.on'));
  ok('...and a day still ahead has a LIVE rule at last, drawn in white not chalk',
     /255, ?255, ?255/.test(cs('.hwd.ahead').boxShadow||'') && !/var\(--chalk\)/.test(cs('.hwd.ahead').boxShadow||''),
     cs('.hwd.ahead').boxShadow);
  ok('today owns the row: its ring, and a bloom behind it',
     /0 0 10px/.test(cs('#tod').boxShadow||'') && /outline/.test(cs('#tod').cssText||css),
     cs('#tod').boxShadow);
  /* the squares sit 5px apart; a shadow with spread grows into the neighbour */
  ok('...blooming by blur alone, never spreading into the gap',
     !/box-shadow:[^;}]*0 0 0 \d/.test(css.match(/header\.live \.h-week \.hwd\.tod\{[^}]*\}/)[0]),
     cs('#tod').boxShadow);
  ok('...growing by TRANSFORM, never by width — the window keeps its shape',
     /scale\(1\.18\)/.test(cs('#tod').transform||'') && !/width/.test(''),
     cs('#tod').transform);
  ok('...on the 2.4s beat the ring already uses, so there is one pulse not two',
     /hwlive 2\.4s/.test(css) && /@keyframes hwpulse/.test(css) &&
     /\.h-week \.hwd\.tod:not\(\.on\)\{animation:hwpulse 2\.4s/.test(css));
  ok('...and it stops under reduced motion',
     /@media \(prefers-reduced-motion:reduce\)\{\s*header\.live \.h-week \.hwd\.tod\{animation:none\}/.test(css));
  /* the live rules must not leak into the ordinary header */
  /* the dark marks belong to the live header alone, and the light greys to
     the ordinary one -- each rule must name which header it is for */
  ok('the dark marks are live-only',
     /header\.live \.h-week \.hwd\{background:rgba\(0,0,0,\.22\)\}/.test(css) &&
     !/^\s*\.h-week \.hwd\{background:rgba\(0,0,0/m.test(css));
  ok('...and the light greys are for the ordinary header only',
     /:root\[data-theme="light"\] header:not\(\.live\) \.h-week \.hwd:not\(\.on\)/.test(css) &&
     /:root\[data-theme="light"\] header:not\(\.live\) \.h-week \.hwd\.ahead/.test(css));
}
/* ---- v4.1.14: the shimmer in live, and today's fill ----------------------
   The sweep is rgba(255,255,255,.92) and a trained day in the live header is
   #fff: the shimmer had been running INVISIBLY for the whole of every
   session. And v4.1.13's today rule shared specificity with the trained fill
   and sat later, so today-once-trained went translucent mid-session. */
{
  const {JSDOM}=require('jsdom');
  const page=new JSDOM(`<!doctype html><html data-theme="light"><head><style>${css}</style></head>
    <body><header class="live"><div class="h-week">
      <i class="hwd on" id="t"></i><i class="hwd on tod" id="tt"></i>
      <i class="hwd tod" id="to"></i></div></header></body></html>`,{pretendToBeVisual:true});
  const win=page.window, cs=s=>win.getComputedStyle(win.document.querySelector(s));
  const bg=s=>cs(s).background||cs(s).backgroundColor;
  ok('live: today, once trained, keeps the solid trained fill',
     /rgb\(255, ?255, ?255\)$/.test(bg('#tt').trim()), bg('#tt'));
  ok('...while an untrained today takes the softer fill',
     /0\.35|,\.35/.test(bg('#to')), bg('#to'));
  /* the band must differ from the square it sweeps, or there is no shimmer */
  const live=css.match(/header\.live \.h-week \.hwd\.on::after\{[^}]*\}/);
  ok('the live sheen has its own band, not white on white',
     !!live && /var\(--live\)/.test(live[0]) && !/rgba\(255,255,255/.test(live[0]),
     live?live[0].replace(/\s+/g,' ').slice(0,90):'(no live sheen rule)');
  ok('...and the ordinary sheen is untouched',
     /\.h-week \.hwd\.on::after\{content:'';[^}]*rgba\(255,255,255,\.92\)/.test(css));
  ok('...still on hwsheen, staggered across the week',
     /animation:hwsheen 1\.15s/.test(css) && /nth-child\(7\)\.on::after\{animation-delay:\.60s\}/.test(css));
}
process.exit(fails?1:0);
