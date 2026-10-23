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
// -- a day
run(`(function(){todayISO=new Date().toLocaleDateString('en-CA');const D=n=>{const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
  DB.days={};DB.days[todayISO]={w:[{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8],at:1},{part:'Chest',ex:'Incline Barbell Bench Press',w:60,reps:[8],at:2},{part:'Chest',ex:'Dip',w:0,reps:[10],at:3}],upd:1};
  DB.days[D(2)]={w:[{part:'Back',ex:'Lat Pulldown',w:50,reps:[10],at:4}],upd:1};
  DB.days[D(40)]={w:[{part:'Legs',ex:'Squat',w:80,reps:[5],at:5}],upd:1};
  SEED=deriveAll();})()`);
const t=J(`bmDay(todayISO)`);
ok('a day lists its exercises in order with their sets',t.ex.join('|')==='Incline Barbell Bench Press|Dip'&&t.sets['Incline Barbell Bench Press']===2&&t.n===3,t);
ok('a muscle takes the most any one exercise asks of it, not a sum of sets',t.L['upper-chest']===1&&t.L['lower-chest']===1&&t.L.triceps===.55,t.L);
const back=J(`bmDay(bmISO(2))`);ok('two days ago: lats full, biceps lighter',back.L.lats===1&&back.L.biceps>0&&back.L.biceps<1,back.L);
ok('a rest day paints nothing',J(`Object.keys(bmDay(bmISO(1)).L).length`)===0);
ok('the slider spans 30 days ending today',J(`(()=>{const d=bmDays();return d.length===30&&d[29].iso===todayISO;})()`));
// -- the card
run(`_bmSel=null;view='stats';render();`);
ok('Stats shows the card with front and back figures',run(`document.querySelectorAll('.bmcard .bm-fig').length`)===2);
ok('the figures use the approved artwork',run(`[...document.querySelectorAll('.bmcard image')].every(i=>/assets\\/bodymap\\/m-(front|back)\\.webp/.test(i.getAttribute('href')))`));
ok('no body-part list under the figures',!run(`document.querySelector('.bmcard .bm-row,.bmcard .bm-list')`));
ok('it opens on the latest workout, today, with its exercises',run(`document.querySelector('.bm-when strong').textContent`)==='Today'&&run(`[...document.querySelectorAll('.bm-chips button')].length`)===2);
ok('trained days are marked on the track (2 in range)',run(`document.querySelectorAll('.bm-marks i').length`)===2);
const painted=()=>run(`[...document.querySelectorAll('.bmcard .bm-fig path')].length`);
const p0=painted();
run(`(function(){const r=document.querySelector('.bm-range');window.__r=r;r.value=+r.max-2;r.dispatchEvent(new Event('input',{bubbles:true}));})()`);
ok('sliding to two days ago shows that day and its exercise',run(`/Lat Pulldown/.test(document.querySelector('.bm-chips').textContent)&&document.querySelector('.bm-when strong').textContent!=='Today'`));
ok('...and repaints the body without replacing the slider under the finger',run(`document.querySelector('.bm-range')===window.__r`));
run(`(function(){const r=document.querySelector('.bm-range');r.value=+r.max-1;r.dispatchEvent(new Event('input',{bubbles:true}));})()`);
ok('a rest day says so and paints nothing',run(`/Rest day/.test(document.querySelector('.bm-when').textContent)`)&&painted()===0);
run(`(function(){const r=document.querySelector('.bm-range');r.value=r.max;r.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const paint=()=>run(`document.querySelector('.bmcard .bm-figs').innerHTML.replace(/bm[mf](front|back)\\d+/g,'id')`);const before=paint();
run(`document.querySelector('[data-bm-ex="Dip"]').click();`);
ok('tapping an exercise shows it alone',run(`document.querySelector('[data-bm-ex="Dip"]').getAttribute('aria-pressed')`)==='true'&&paint()!==before);
run(`document.querySelector('[data-bm-ex="Dip"]').click();`);
ok('tapping it again returns to the whole day',paint()===before&&run(`document.querySelector('[data-bm-ex="Dip"]').getAttribute('aria-pressed')`)==='false');
run(`DB.settings.sex='f';_bmSel=null;render();`);
ok('the F setting shows the female figures',run(`[...document.querySelectorAll('.bmcard image')].every(i=>/f-(front|back)/.test(i.getAttribute('href')))`));
ok('the card says it is an estimate',/Estimated/.test(run(`document.querySelector('.bmcard').textContent`)));
const copy=run(`document.querySelector('.bmcard').textContent+' '+[...document.querySelectorAll('#view .ibtn.tipi')].map(b=>b.dataset.tip||b.getAttribute('data-text')||'').join(' ')`).toLowerCase();
ok('no claims of activation, recovery or readiness in the copy',!/activation|recovered|recovery|readiness|ready to train/.test(copy));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
