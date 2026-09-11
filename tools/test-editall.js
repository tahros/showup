// v4.1.1 — editing the whole day's routine, not one row at a time.
// The pencil on a row opens that row; nothing opened the day. Paste was the
// nearest thing and it clears the box, so changing one weight meant retyping
// everything. Driven through real clicks, because the claim is about what is
// IN the box when it opens.
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
const tap=a=>run(String.raw`document.querySelector('[data-pw=\"${a}\"]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}))`);

run(String.raw`DB.days={};DB.settings.onboarded=true;DB.settings.unit='lb';
  DB.settings.myParts=['Legs','Sixpack'];todayISO='2026-09-11';checkDate=()=>false;
  DB.days['2026-09-09']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
  SEED=deriveAll();view='today';lift.plan=null;try{localStorage.clear();}catch(_){}
  dayMeta();render();
  pwOpen('2026-09-11');
  pw().book['2026-09-11']={rows:pwRead('Squat\n  135 lb x 8\n  225 lb x 6 6 6 6\n\nRomanian Deadlift\n  175 lb x 8 8 8'),
    parts:['Legs'],title:'',base:'',source:'Your draft',notes:[],locks:[],target:null};
  pwRender();`);

ok('(fixture) the editor is open with a routine', `!!document.querySelector('[data-pw="edit-all"]')||!!document.querySelector('[data-pw="paste"]')`);
ok('the day offers an Edit button beside Paste',
   `!!document.querySelector('[data-pw="edit-all"]')`);
ok('...carrying the edit icon, like the row pencils',
   `!!document.querySelector('[data-pw="edit-all"] .ic-edit')`);

tap('edit-all');
const box = `document.querySelector('[data-pw-field="pasteText"]')`;
ok('tapping it opens the text box', `!!${box}`);
ok('...with the WHOLE day already in it, not empty',
   `/Squat/.test(${box}.value) && /Romanian Deadlift/.test(${box}.value)`,
   `JSON.stringify(${box}.value.slice(0,44))`);
ok('...every weight and rep carried across',
   `/135/.test(${box}.value) && /225/.test(${box}.value) && /175/.test(${box}.value)`);
ok('...and the panel says it is an edit, not a paste',
   `/Edit routine/.test(document.querySelector('.pw-input-panel h3').textContent)`,
   `document.querySelector('.pw-input-panel h3').textContent`);
ok('...replacing the day, not one row — no row is singled out',
   `pw().editIndex===undefined`, `String(pw().editIndex)`);

/* Paste must still start empty, or the two doors do the same thing */
run(`pwGo('edit');pwRender();`);
tap('paste');
ok('Paste still opens an empty box', `${box}.value===''`, `JSON.stringify(${box}.value)`);
ok('...and says paste, not edit',
   `/Paste routine/.test(document.querySelector('.pw-input-panel h3').textContent)`,
   `document.querySelector('.pw-input-panel h3').textContent`);

/* a day with nothing in it has nothing to edit */
run(`pw().book['2026-09-11']={rows:[],parts:[],title:'',base:'',source:'Your draft',notes:[],locks:[],target:null};pwGo('edit');pwRender();`);
ok('an empty day offers no Edit — Paste is already the way in',
   `!document.querySelector('[data-pw="edit-all"]')`);
process.exit(fails?1:0);
