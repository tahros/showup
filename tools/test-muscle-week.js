/* test-muscle-week.js DIR -- v4.6.397: Muscle this week. Working sets per muscle, helpers at half,
 * warm-ups out, against the real app scripts. */
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
const run=c=>vm.runInContext(c,ctx),J=c=>JSON.parse(run(`JSON.stringify(${c})`));
const bad=J(`Object.keys(MW_HELP).filter(n=>!EX_MUSCLE[n])`);ok('every exercise with helpers is one the app knows',!bad.length,bad);
const um=J(`[...new Set(Object.values(MW_HELP).flat())].filter(m=>!MUSCLE_PART[m])`);ok('every helper is one of the fifteen muscles',!um.length,um);
const rowKeys=J(`MW_ROWS.flatMap(([g,l])=>l.flatMap(([n,k])=>k))`);
ok('every muscle the app knows has a bar',J(`Object.keys(MUSCLE_PART)`).every(m=>rowKeys.includes(m)),J(`Object.keys(MUSCLE_PART)`).filter(m=>!rowKeys.includes(m)));
// everything on today, so the fixture sits inside the week whatever weekday the suite runs on
run(`(function(){let at=1;const S=(part,ex,w,reps)=>reps.map(r=>({part,ex,w,reps:[r],at:at++}));
  DB.days={};DB.days[todayISO]={w:[...S('Chest','Incline Barbell Bench Press',40,[12]),...S('Chest','Incline Barbell Bench Press',70,[8,8,8,8]),...S('Chest','Dip',0,[10,10,10]),
    ...S('Back','Lat Pulldown',50,[10,10,10]),...S('Legs','My Leg Thing',20,[12,12]),...S('Shoulder','Lateral Raise',8,[15,15,15,30])],upd:1};
  SEED=deriveAll();})()`);
const mw=J(`muscleWeek()`);
ok('a warm-up is not a working set (incline: 4 of 5 count)',mw.m['upper-chest']===4,mw.m);
ok('a burnout past the rep ceiling is not either (laterals: 3 of 4)',mw.m['side-delts']===3,mw.m);
ok('helpers count half: front delts 4 x 1/2 from incline + 3 x 1/2 from dips',mw.m['front-delts']===3.5,mw.m);
ok('triceps: half from incline and dips',mw.m.triceps===3.5,mw.m);
ok('biceps half from pulldowns',mw.m.biceps===1.5,mw.m);
ok('a Legs exercise with no muscle is counted in no bar, and said',mw.loose===2&&!mw.m.quads,{loose:mw.loose,q:mw.m.quads});
ok('the total is every working set once, helpers not double counted',mw.total===4+3+3+2+3,mw.total);
run(`view='stats';render();`);
ok('Stats shows Muscle this week',run(`[...document.querySelectorAll('#view h2')].some(h=>/^Muscle this week/.test(h.textContent))`));
ok('fourteen bars, upper then core & legs',run(`document.querySelectorAll('.mwcard .mw-bar').length`)===14&&run(`[...document.querySelectorAll('.mw-grp')].map(g=>g.textContent).join('|')`)==='Upper|Core & legs');
ok('chest sums upper, mid and lower (4 + 3 dips)',run(`[...document.querySelectorAll('.mw-name')].find(n=>n.textContent==='Chest').nextElementSibling.nextElementSibling.textContent`)==='7');
ok('half sets print as .5',run(`[...document.querySelectorAll('.mw-name')].find(n=>n.textContent==='Front delts').nextElementSibling.nextElementSibling.textContent`)==='3.5');
ok('the bar runs to 20: 7 sets fill 35%',run(`[...document.querySelectorAll('.mw-name')].find(n=>n.textContent==='Chest').nextElementSibling.querySelector('i').style.width`).replace('%','')==35);
ok('every bar carries the mark at 10',run(`[...document.querySelectorAll('.mw-bar')].every(b=>b.querySelector('u'))`));
ok('the loose sets are named in the footnote',/2 sets with no muscle set/.test(run(`document.querySelector('.mw-foot').textContent`)));
run(`(function(){DB.days[todayISO]={w:Array.from({length:30},(_,k)=>({part:'Legs',ex:'Leg Press',w:100,reps:[10],at:900+k})),upd:1};SEED=deriveAll();render();})()`);
{const q=J(`(()=>{const n=[...document.querySelectorAll('.mw-name')].find(n=>n.textContent==='Quads');return {w:n.nextElementSibling.querySelector('i').style.width,v:n.nextElementSibling.nextElementSibling.textContent,m:muscleWeek().m.quads};})()`);
 ok('past 20 the bar stays full, the number keeps counting',parseFloat(q.w)===100&&q.v==='30',q);}
const copy=(run(`document.querySelector('.mwcard').textContent`)+run(`[...document.querySelectorAll('#view .ibtn.tipi')].map(b=>b.outerHTML).join(' ')`)).toLowerCase();
ok('no instructions and no claims on the card',!/\bshould\b|\btarget\b|\bgoal\b|behind|ideal|recover|ready/.test(copy));
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
