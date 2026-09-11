// v4.0.3 — the date picker: what it shows, and where its exits go.
// Driven through real clicks on the real controls, because every claim here is
// about which screen you land on, and a claim about navigation that never
// touches a control cannot see a bug that lives in one.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${typeof g==='string'?run(g):g}`:''));if(!good)fails++;};
const tap=a=>run(String.raw`document.querySelector('[data-pw=\"${a}\"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);

/* two saved plans — Sep 11 as today's plan, Sep 12 in the week — and a draft
   on Sep 14 that has never been saved. Three different states, three marks. */
run(String.raw`DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';
  DB.settings.myParts=['Legs','Chest','Back','Sixpack'];
  todayISO='2026-09-11';checkDate=()=>false;
  DB.days['2026-09-09']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
  DB.plan={d:'2026-09-11',items:[{ex:'Squat',lines:[{w:90,reps:[8,8,8],note:''}]}]};
  DB.week={days:{'2026-09-12':{items:[{ex:'Dip',lines:[{w:20,reps:[8,8],note:''}]}],raw:'Dip\n  45 lb x 8 8'}}};
  SEED=deriveAll();view='today';lift.plan=null;dayMeta();render();`);

// ---- 1. the marks
run(`pwOpen(null,'dates');pw().datesFrom='today';pwDay('2026-09-14').rows=[{ex:'Plank',lines:[]}];pwDay('2026-09-14').source='Your draft';pwRender();`);
ok('the calendar is open', `!!document.querySelector('.pw-calendar')`);
/* v4.0.4: the mark is a class on the day, not an element inside it -- a ring
   of the same shape as the selected day, so a date that is both wears one mark
   rather than two stacked. */
const dot = iso => `document.querySelector('[data-pw="date"][data-date="${iso}"]').classList.contains('pw-planned')`;
ok('a date with a saved plan is marked', dot('2026-09-11'));
ok('...including one that lives in the week, not today', dot('2026-09-12'));
ok('...and a date with no plan is not marked',
   `(function(){const c=document.querySelector('[data-pw="date"][data-date="2026-09-13"]').classList;
     return !c.contains('pw-planned')&&!c.contains('pw-drafted');})()`);
ok('an unsaved draft is marked differently — a different promise',
   `document.querySelector('[data-pw="date"][data-date="2026-09-14"]').classList.contains('pw-drafted')`);
ok('...and the saved ones are not the draft mark',
   `!document.querySelector('[data-pw="date"][data-date="2026-09-11"]').classList.contains('pw-drafted')`);
/* the point of the ring: nothing is added inside the 40px cell */
ok('...and nothing is stacked inside the cell beside the number',
   `!document.querySelector('.pw-calendar .pw-dot')`);
/* a dot is not readable aloud */
ok('the mark is in the accessible name too, not only the dot',
   `/has a plan/.test(document.querySelector('[data-pw="date"][data-date="2026-09-11"]').getAttribute('aria-label'))
    && /unsaved draft/.test(document.querySelector('[data-pw="date"][data-date="2026-09-14"]').getAttribute('aria-label'))`,
   `document.querySelector('[data-pw="date"][data-date="2026-09-11"]').getAttribute('aria-label')`);

// ---- 2. the footer is Cancel + Edit, not Done
ok('the footer offers Cancel and Edit',
   `!!document.querySelector('[data-pw="dates-cancel"]') && !!document.querySelector('[data-pw="dates-edit"]')`);
ok('...and Done is gone, because it went somewhere it did not say',
   `!document.querySelector('[data-pw="dates-done"]')`);

// ---- 3. Edit goes into that day's routine
tap('dates-edit');
ok('Edit opens the editor for the chosen day',
   `!pw().datesOpen && lift.plan==='workspace' && !!document.querySelector('.pw-editor-head')`,
   `'plan='+lift.plan+' datesOpen='+pw().datesOpen`);

// ---- 4. Cancel returns where the calendar was opened from
run(`view='today';render();`);
run(`pwOpen(null,'dates');pw().datesFrom='today';pwRender();`);
tap('dates-cancel');
ok('Cancel from Today returns to Today, not the editor',
   `view==='today' && lift.plan===null && !document.querySelector('.pw-editor-head')`,
   `'view='+view+' plan='+lift.plan`);

// ---- 5. Back does the same
run(`view='today';render();pwOpen(null,'dates');pw().datesFrom='today';pwRender();`);
tap('back');
ok('Back from the calendar returns to Today too',
   `view==='today' && lift.plan===null && !document.querySelector('.pw-editor-head')`,
   `'view='+view+' plan='+lift.plan`);

// ---- 6. opened FROM the editor, both exits return to the editor
run(`pwOpen('2026-09-11');pwRender();`);
tap('dates-toggle');
ok('(fixture) the calendar opened from the editor', `pw().datesOpen && pw().datesFrom==='edit'`);
tap('dates-cancel');
ok('Cancel from the editor returns to the editor, not Today',
   `lift.plan==='workspace' && !pw().datesOpen && !!document.querySelector('.pw-editor-head')`,
   `'plan='+lift.plan`);
run(`pwOpen('2026-09-11');pwRender();`);tap('dates-toggle');tap('back');
ok('...and Back from the editor does the same',
   `lift.plan==='workspace' && !pw().datesOpen && !!document.querySelector('.pw-editor-head')`,
   `'plan='+lift.plan`);
process.exit(fails?1:0);
