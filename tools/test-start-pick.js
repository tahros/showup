/* test-start-pick.js DIR -- v4.6.354: choose where the week starts.
 * On the Dates step each day is a chip; tap one, pick a session, and that day takes it while
 * the rest of the week follows your order. The guess from the log stays the default, a fresh
 * visit goes back to it, and a quiet line says so when one session lands on two days running.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const tick=()=>new Promise(r=>setTimeout(r,0));const settle=async(n=60)=>{for(let i=0;i<n;i++)await tick();};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
(async()=>{
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
  await settle();
  const run=c=>vm.runInContext(c,ctx);
  run(`(()=>{const days={},add=(d,part,ex)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:20,reps:[10,10,10],at:Date.parse(d+'T18:00')+(days[d]?days[d].w.length:0)});};
   const six=[[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']],[['Back','Lat Pulldown']],[['Shoulder','Lateral Raise'],['Sixpack','Hanging Leg Raise']],[['Legs','Squat']],[['Biceps','EZ Bar Curl'],['Triceps','Triceps Pushdown'],['Sixpack','Hanging Leg Raise']],[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']]];
   const t=new Date('2026-10-18T12:00');for(let k=56;k>=1;k--){const d=new Date(t);d.setDate(t.getDate()-k);const dow=d.getDay();if(dow===0)continue;const iso=d.toLocaleDateString('en-CA');for(const [pt,ex] of six[dow-1])add(iso,pt,ex);}
   DB={days,settings:{onboarded:true,unit:'lb',weekStart:'sunday',objective:'grow',plannerPreferences:{avoid:[],trainDays:[1,2,3,4,5,6]}}};todayISO='2026-10-18';checkDate=()=>false;save=()=>{};
   migrateCanon();SEED=deriveAll();view='today';render();pw().dates=[];pwOpen(null,'dates');
   pw().dates=['2026-10-19','2026-10-20','2026-10-21','2026-10-22','2026-10-23','2026-10-24'];pwRender();})()`);
  await settle();
  const week=()=>JSON.parse(run(`JSON.stringify(pw().dates.map(d=>pw().book[d].parts.join('+')))`));
  const chips=()=>run(`[...document.querySelectorAll('.pf-sl-day')].map(e=>e.textContent).join('|')`);
  const tap=(sel)=>{run(`document.querySelector(${JSON.stringify(sel)}).click()`);};
  const before=week();
  ok('default: the week continues from the log (Mon Chest + Core)', before[0]==='Chest+Sixpack'&&before[1]==='Back', before);
  ok('each day is a tappable chip', run(`document.querySelectorAll('.pf-sl-day[data-pw="pf-start-day"]').length`)===6, chips());
  tap('.pf-sl-day[data-date="2026-10-19"]');await settle(10);
  ok('tapping Mon opens "Start Monday with", today\'s session ticked', /Start Monday with/.test(run(`document.querySelector('.pf-sl-pick')?.textContent||''`))&&run(`document.querySelector('.pf-sl-opt.on')?.dataset.index`)==='0');
  tap('.pf-sl-opt[data-index="2"]');await settle(10);
  const after=week();
  ok('picking Shoulder + Core: Monday takes it and the week follows the order', after.join()==='Shoulder+Sixpack,Legs,Biceps+Triceps+Sixpack,Chest+Sixpack,Chest+Sixpack,Back', after);
  ok('the picker closes', !run(`!!document.querySelector('.pf-sl-pick')`));
  ok('the same session two days running gets one quiet line', /Chest \+ Core two days running · Thu, Fri/.test(run(`document.querySelector('.pf-sl-warn')?.textContent||''`)));
  tap('.pf-sl-day[data-date="2026-10-22"]');await settle(10);tap('.pf-sl-opt[data-index="3"]');await settle(10);
  ok('picking Thursday works the same way (Thu Legs)', week()[3]==='Legs', week());
  ok('...and with no repeat, no line', !run(`!!document.querySelector('.pf-sl-warn')`));
  run(`pwOpen(null,'dates')`);await settle(10);
  ok('a fresh visit starts from the log again', run(`pw().rotStart===undefined`));
  console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
