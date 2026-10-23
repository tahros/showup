/* test-bodymap.js DIR -- v4.6.395: Your body, lately. The body map's profiles, recency rule,
 * regions and card, against the real app scripts. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({}),set:()=>true});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
const J=c=>JSON.parse(run(`JSON.stringify(${c})`));
// -- the tables
const bad=J(`Object.keys(BM_HELP).filter(n=>!EX_MUSCLE[n])`);
ok('every exercise with helpers is one the app knows (no misspelt names)',!bad.length,bad);
const unknownM=J(`[...new Set(Object.values(BM_HELP).flatMap(o=>Object.keys(o)))].filter(m=>!MUSCLE_PART[m]&&!['lower-back','adductors'].includes(m))`);
ok('every helper muscle is one of the fifteen, or lower-back / adductors',!unknownM.length,unknownM);
const regs=J(`[...new Set(Object.values(BM_FIGS).flatMap(f=>Object.keys(f.r)))]`),drawn=J(`Object.keys(bmRegions({}))`);
ok('every region in the artwork is one bmRegions fills',regs.every(r=>drawn.includes(r)),regs.filter(r=>!drawn.includes(r)));
ok('all four figures have their regions',J(`['m-front','m-back','f-front','f-back'].every(k=>BM_FIGS[k]&&Object.keys(BM_FIGS[k].r).length>=8)`));
// -- profiles
const inc=J(`bmProfile('Incline Barbell Bench Press','Chest')`);
ok('incline press: upper chest full, front delts a helper',inc['upper-chest']===1&&inc['front-delts']>0&&inc['front-delts']<1,inc);
const dip=J(`bmRegions(bmProfile('Dip','Chest')).chest`),up=J(`bmRegions(bmProfile('Incline Barbell Bench Press','Chest')).chest`);
ok('the chest grades: incline strongest at the top, dips at the bottom',up[0]>up[2]&&dip[2]>dip[0],{up,dip});
const flat=J(`bmRegions({chest:1}).chest`);ok('flat chest work is even top to bottom',flat[0]===flat[2]&&flat[1]===1,flat);
const custom=J(`bmProfile('My Weird Leg Thing','Legs')`);
ok('a Legs exercise with no muscle set lights the part faintly, no single guess',custom.quads<.5&&custom.hamstrings<.5&&!custom['upper-chest'],custom);
const cb=J(`bmProfile('My Cable Thing','Back')`);ok('another unknown takes its part\'s default muscle',cb['upper-back']===1,cb);
// -- recency
run(`(function(){todayISO=new Date().toLocaleDateString('en-CA');const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={};DB.days[todayISO]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8],at:1},{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8],at:2}],upd:1};
  DB.days[D(2)]={w:[{part:'Back',ex:'Lat Pulldown',w:50,reps:[10],at:3}],upd:1};
  DB.days[D(7)]={w:[{part:'Legs',ex:'Squat',w:80,reps:[5],at:4}],upd:1};
  SEED=deriveAll();})()`);
const rc=J(`bmRecency()`);
ok('main muscle: worked today',rc.since['upper-chest']===0,rc.since);
ok('a helper with two sets counts (front delts, 2 x .5)',rc.since['front-delts']===0,rc.since);
ok('a helper with one set does not (biceps from one pulldown)',rc.since.biceps==null,rc.since);
ok('lats two days ago',rc.since.lats===2,rc.since);
ok('a week ago is past the map (nothing for quads)',rc.since.quads==null,rc.since);
ok('parts list: Chest today with its 2 sets, Back 2 days ago',rc.parts.Chest.d===0&&rc.parts.Chest.sets===2&&rc.parts.Back.d===2&&!rc.parts.Legs,rc.parts);
ok('the fade steps down each day and stops at six',J(`BM_FADE.length===6&&BM_FADE.every((v,i,a)=>i===0||v<a[i-1])`));
// -- the card
run(`view='stats';render();`);
ok('Stats shows the card with front and back figures',run(`document.querySelectorAll('.bmcard .bm-fig').length`)===2);
ok('the figures use the approved artwork',run(`[...document.querySelectorAll('.bmcard image')].every(i=>/assets\\/bodymap\\/m-(front|back)\\.webp/.test(i.getAttribute('href')))`));
ok('day-by-day legend: Today, 1d … 6d+',run(`[...document.querySelectorAll('.bm-ticks span')].map(s=>s.textContent).join(' ')`)==='Today 1d 2d 3d 4d 5d 6d+');
run(`DB.settings.sex='f';render();`);
ok('the F setting shows the female figures',run(`[...document.querySelectorAll('.bmcard image')].every(i=>/f-(front|back)/.test(i.getAttribute('href')))`));
run(`document.querySelector('[data-bm-part="Chest"]').click();`);
ok('tapping Chest opens exercise emphasis, with its own legend',run(`!!document.querySelector('.bm-focus')&&/Less emphasis/.test(document.querySelector('.bmcard').textContent)&&/Upper-chest emphasis/.test(document.querySelector('.bmcard').textContent)`));
ok('emphasis says it is an estimate',run(`/Estimated emphasis · Varies with technique/.test(document.querySelector('.bmcard').textContent)`));
run(`document.querySelector('[data-bm-back]').click();`);
ok('Back to body map returns to recency',run(`!document.querySelector('.bm-focus')&&!!document.querySelector('.bm-ticks')`));
run(`(function(){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-10);DB.days={[d.toLocaleDateString('en-CA')]:{w:[{part:'Back',ex:'Lat Pulldown',w:50,reps:[10],at:9}],upd:1}};SEED=deriveAll();render();})()`);
ok('nothing in the last six days says so plainly',run(`/Nothing logged in the last six days/.test(document.querySelector('.bmcard').textContent)`));
const copy=run(`document.querySelector('.bmcard').textContent+' '+[...document.querySelectorAll('#view .ibtn.tipi')].map(b=>b.dataset.tip||b.getAttribute('data-text')||'').join(' ')`).toLowerCase();
ok('no claims of activation, recovery or readiness in the copy',!/activation|recovered|recovery|readiness|ready to train/.test(copy));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
