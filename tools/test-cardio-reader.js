/* test-cardio-reader.js DIR -- v4.6.382: cardio is read, not kept as a note.
 * The plan reader read only a lift and its weight x reps, so every run line --
 * the app's own "Run — by feel" included -- became a note, and most screens
 * said "Kept as a note · check this line". A line naming a cardio activity with
 * nothing but distance, time or "by feel" is a cardio row now, written back in
 * the app's form; anything else stays a note; lifts are untouched. */
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
run(`DB={days:{},settings:{onboarded:true,unit:'lb',mascotMotion:'still'},plan:null,week:null};todayISO='2026-10-22';checkDate=()=>false;save=()=>{};SEED=deriveAll();`);
const read=t=>run(`JSON.stringify(parsePlan(${JSON.stringify(t)}).map(r=>r.kind==='cardio'?'C:'+r.raw:r.kind+':'+(r.ex||r.raw)))`);
const one=(t,want,label)=>{const g=JSON.parse(read(t));ok(label||`"${t.replace(/\n/g,' / ')}" reads as ${want}`,g[0]===want,g);};
one('Run — by feel','C:Run — by feel');
one('Run — 2 mi','C:Run — 2 mi');
one('Run — 20 min','C:Run — 20 min');
one('Run — 3.1 mi · 28 min','C:Run — 3.1 mi · 28 min');
one('Run 2 mi','C:Run — 2 mi');
one('Running — 5 km','C:Run — 5 km');
one('Jog 5k easy','C:Run — 5 km (easy)');
one('Treadmill 20 min','C:Run — 20 min');
one('Cycling — 30 min','C:Cycling — 30 min');
one('Bike 45 min','C:Cycling — 45 min');
one('Row 2000m','C:Rowing — 2000 m');
one('Swim 1 h','C:Swimming — 60 min');
one('Run 25:30','C:Run — 25.5 min');
one('Run\n  2 mi','C:Run — 2 mi','a bare "Run" with its distance on the next line is one run');
one('Run','C:Run — by feel','a bare "Run" is a run by feel');
ok('a bare "Row" is not read as a run of anything (it could be a lift)',JSON.parse(read('Row'))[0]!=='C:Rowing — by feel',read('Row'));
ok('"Run / by feel x 1" stays the exercise it always was',JSON.parse(read('Run\n  by feel × 1'))[0]==='ex:Run',read('Run\n  by feel × 1'));
ok('"Walking Lunge" is a lift, not a walk',JSON.parse(read('Walking Lunge\n  50 lb × 10 10'))[0]==='ex:Walking Lunge',read('Walking Lunge\n  50 lb × 10 10'));
ok('a cardio name with words the reader does not know stays a note',!JSON.parse(read('Run to the store and back'))[0].startsWith('C:'),read('Run to the store and back'));
ok('...and the lifts around it read as before',read('Run — by feel\nBarbell Bench Press\n  135 lb × 10 10')===JSON.stringify(['C:Run — by feel','ex:Barbell Bench Press']));
const t='Run — by feel\nBarbell Bench Press\n  135 lb × 10 10';
ok('the older plan display (the "changed on another device" review) shows the run as an activity, not a note to check',run(`(h=>!/Kept as a note/.test(h)&&/pw-cardio/.test(h)&&/by feel/.test(h))(pwRowsHTML(pwRead(${JSON.stringify(t)})))`));
ok('Plan\'s editor still sees it as cardio',run(`pfIsCardioRow(pwRead(${JSON.stringify(t)})[0])`));
ok('saved and read back, the line is unchanged',run(`planTextFromRows(parsePlan(${JSON.stringify(t)})).includes('Run — by feel')`));
run(`{const {items,note}=planItemsFrom(parsePlan(${JSON.stringify(t)}));planSave(items,note,${JSON.stringify(t)},todayISO);}view='today';render();`);
ok('Today\'s plan card shows the run as a row of the plan, not a line of note text',run(`!!document.querySelector('#view .planrow.pcardio[data-planex="Run"]')&&!/Run — by feel/.test(document.querySelector('#view .plannote')?.textContent||'')`));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
