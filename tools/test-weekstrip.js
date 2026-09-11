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
ok('...and an open today is outlined too, by the same rule',
   /\.h-week \.hwd\.tod:not\(\.on\)\{background:none/.test(css));
process.exit(fails?1:0);
