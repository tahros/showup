/* test-plan-conflict.js DIR -- v4.6.383: a day changed when its workout changed.
 * The save check compared the saved plan's raw record, and a day's plan lives
 * in two copies (the day slot, stamped with a date; the week, stamped with a
 * title). Saving another day switched which copy was read, and "changed on
 * another device" fired over identical workouts. Now the check reads the
 * workout; a real change shows what changed, with plain buttons. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
run(`DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null};todayISO='2026-10-22';checkDate=()=>false;save=()=>{};SEED=deriveAll();
var sat='2026-10-24',T="Run — by feel\\nEZ Bar Curl\\n  45 lb × 14 (warm-up)\\n  65 lb × 14 14 14\\nHammer Curl\\n  30 lb × 14 14";
weekSave(parseWeek("Thu, Oct 22 — Arms\\n"+T+"\\n\\nSat, Oct 24 — Arms\\n"+T));
{const {items,note}=planItemsFrom(parsePlan(T));planSave(items,note,T,sat);}   /* Sat saved on its own: the day slot is Saturday's */
var base=pwFingerprint(sat);
{const {items,note}=planItemsFrom(parsePlan(T));planSave(items,note,T,todayISO);}   /* then today is saved: the day slot moves to today */`);
ok('the reported false alarm: saving another day does not make Saturday look changed',run(`pwSameBase(base,sat)`));
ok('...and an old-style base (the raw record) is read the same way',run(`pwSameBase(JSON.stringify(DB.week.days[sat]),sat)&&pwSameBase(JSON.stringify({...DB.week.days[sat],d:sat,title:'x'}),sat)`));
run(`DB.week.days[sat]={...DB.week.days[sat],items:DB.week.days[sat].items.map((it,i)=>i===0?{...it,lines:it.lines.map(l=>({...l,reps:l.reps.map(()=>12)}))}:it)};`);
ok('a real change to the workout is still caught',!run(`pwSameBase(base,sat)`));
/* the Plan flow's save, with a draft for Saturday based on the old version */
run(`pwOpen(sat);pwDay(sat).base=base;pwDay(sat).rows=pwRead(T);`);
const err=run(`(()=>{try{pfSave(true);return '';}catch(e){return e.message;}})()`);
ok('saving then stops with a plain message (no "another device")',/changed while you were editing/.test(err)&&!/another device/.test(err)&&run(`pw().conflict===sat`),err);
run(`pwRender();`);
const card=run(`(c=>c?{h:c.querySelector('h3')?.textContent,row:[...c.querySelectorAll('.pw-cf-row')].map(r=>r.textContent.replace(/\\s+/g,' ').trim()),same:c.querySelector('.pw-cf-same')?.textContent,btn:[...c.querySelectorAll('.pf-conflict-actions .pw-btn')].map(b=>b.textContent)}:null)(document.querySelector('.pf-conflict'))`);
ok('the card says which day, and shows only what differs, saved and yours',!!card&&/Sat, Oct 24 changed while you were editing/.test(card.h)&&card.row.length===1&&/EZ Bar Curl/.test(card.row[0])&&/Saved.*12 12 12/.test(card.row[0])&&/Yours.*14 14 14/.test(card.row[0]),card);
ok('...the rest fold into one line',/2 exercises are the same/.test(card?.same||''),card&&card.same);
ok('...and the buttons say what they do',card&&card.btn.join('|')==='Use the saved one|Keep my edits',card&&card.btn);
/* your edits already match what is saved: nothing to ask */
run(`pw().conflict=null;pwDay(sat).rows=pwRead(T.replace('65 lb × 14 14 14','65 lb × 10 10 10'));{const {items,note}=planItemsFrom(pwDay(sat).rows);DB.week.days[sat]={...DB.week.days[sat],items,note};}`);   /* the saved plan changed to exactly your edits */
ok('when your edits already match the saved plan, it just saves',run(`(()=>{try{pfSave(true);return !pw().conflict;}catch(e){return e.message;}})()`)===true);
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
