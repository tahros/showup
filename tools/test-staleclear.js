// v4.1.5 — a Clear that was never saved is not the record.
// Reproduced from the maker's screenshots: Today shows a routine, Edit opens
// an empty day. Driven through the real controls, because the bug lives in the
// disagreement between two surfaces and only a real trip shows it.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${typeof g==='string'?run(g):g}`:''));if(!good)fails++;};
const tap=a=>run(`document.querySelector('[data-pw="${a}"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);

const setup=()=>run(`DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';
  DB.settings.myParts=['Legs','Sixpack'];todayISO='2026-09-11';checkDate=()=>false;
  DB.days['2026-09-09']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
  DB.plan={d:'2026-09-11',items:[
    {ex:'Squat',lines:[{w:102,reps:[6,6,6,6],note:''}]},
    {ex:'Romanian Deadlift',lines:[{w:79,reps:[8,8,8],note:''}]},
    {ex:'Dumbbell Lunge',lines:[{w:20,reps:[10,10,10],note:''}]}]};
  SEED=deriveAll();view='today';lift.plan=null;try{localStorage.clear();}catch(_){}
  pwOwner=null;dayMeta();render();`);
/* parenthesised: the ternary binds looser than ===, so an unwrapped
   `${rows}===0` parses as `cond ? len : (-1===0)` and yields 0 -- falsy, and
   the assertion fails while the state is correct. */
const rows=`(pw().book[todayISO]?pw().book[todayISO].rows.length:-1)`;

// ---- the maker's trip
setup();
ok('(fixture) Today shows the saved routine',
   `/Squat/.test(document.querySelector('details[data-pw-fold="today"]').textContent)`);
run(`pwOpen(todayISO);pwRender();`);
tap('clear-day');
ok('(fixture) Clear empties the day inside the editor', `${rows}===0`,
   `'rows='+(${rows})+' cleared='+pw().book[todayISO].cleared+' active='+pw().active`);
ok('...and says so, rather than acting silently',
   `/Undo to restore/.test(document.querySelector('.pw-workspace').textContent)`);
tap('back');
run(`view='today';render();`);
ok('the abandoned clear is still on the book — nothing was saved',
   `pw().book[todayISO].cleared===true && ${rows}===0`,
   `'cleared='+pw().book[todayISO].cleared+' rows='+(${rows})`);
ok('...and Today still shows the routine, because DB.plan is untouched',
   `/Squat/.test(document.querySelector('details[data-pw-fold="today"]').textContent) && DB.plan.items.length===3`);

run(`document.querySelector('details[data-pw-fold="today"] [data-pw="open-date"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);
ok('EDIT OPENS THE ROUTINE YOU WERE LOOKING AT, not an empty day',
   `${rows}===3`, rows);
ok('...seeded from what is actually saved',
   `pw().book[todayISO].source==='Saved plan' && !pw().book[todayISO].cleared`,
   `pw().book[todayISO].source`);
ok('...and the header says Edit, not Build',
   `/Edit your plan/.test(document.querySelector('.pw-workspace').textContent)`);

// ---- Clear must still work while you are looking at it
setup();
run(`pwOpen(todayISO);pwRender();`);
tap('clear-day');
run(`pwRender();`);
ok('Clear is not undone under the maker while he reads the notice',
   `${rows}===0 && pw().book[todayISO].cleared===true`,
   `'rows='+(${rows})+' cleared='+pw().book[todayISO].cleared`);
tap('undo');
ok('...and Undo still restores it', `${rows}===3`, rows);

// ---- a draft with real work in it is never discarded
setup();
run(`pwOpen(todayISO);pwRender();
  /* the draft rows are built from a row the day already has, renamed --
     pwRead's text format is another suite's business and not the claim here */
  const bk=pw().book[todayISO];
  const one=JSON.parse(JSON.stringify(bk.rows[0]));one.ex='Bench Press';
  bk.rows=[one];bk.parts=pwParts(bk.rows);bk.source='Your draft';bk.cleared=false;pwPersist();`);
ok('(fixture) a real draft is in the book, different from the saved plan',
   `/Bench Press/.test(pw().book[todayISO].rows.map(r=>r.ex).join(','))`,
   `pw().book[todayISO].rows.map(r=>r.ex).join(',')`);
/* with a draft in play the Today card may show Resume rather than its own
   Edit, so enter through whichever open-date control the home offers */
run(`view='today';lift.plan=null;render();
  const btn=document.querySelector('[data-pw="open-date"]');
  if(!btn)throw new Error('no open-date control on the home');
  btn.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));`);
ok('a draft with rows survives — only an EMPTY clear is dropped',
   `/Bench Press/.test(pw().book[todayISO].rows.map(r=>r.ex).join(','))`,
   `pw().book[todayISO].rows.map(r=>r.ex).join(',')`);
process.exit(fails?1:0);
