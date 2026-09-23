/* test-cardio.js DIR — v4.6.108: every cardio activity logs distance and time.
 *
 * The cardio table was declared in v4.6.45 and had no callers, so Walk,
 * Cycling, Rowing and the rest opened on a weight stepper. Wiring it touched
 * every place a record is READ, and three of those were silent data loss:
 * editing a past day deleted any rep-less row that was not literally "Run",
 * the CSV export dropped a non-run cardio row's time, and backfill stored
 * miles as km. Each claim below is one assertion; the running totals are
 * asserted UNCHANGED, because a ride is not a run.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.localStorage.setItem('showup:planning-interface','previous');
w.fetch=()=>Promise.reject(new Error('offline'));
w.matchMedia=w.matchMedia||(q=>({matches:false,addEventListener(){},removeEventListener(){}}));
w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.confirm=()=>true;
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
vm.runInContext(`todayISO='2026-09-23';checkDate=()=>false;`,ctx);
w.document.dispatchEvent(new w.Event('DOMContentLoaded',{bubbles:true}));
const run=c=>vm.runInContext(c,ctx);
const near=(a,b,e=1e-6)=>Math.abs(a-b)<e;
const seed=(unit,days)=>run(`DB={days:${JSON.stringify(days)},settings:{unit:'${unit}',onboarded:true,theme:'light',mascotMotion:'still'}};SEED=deriveAll();_avgVol&&(Object.keys(_avgVol).forEach(k=>delete _avgVol[k]));`);
const RUN={part:'Run',ex:'Run',w:5,reps:[],mins:25,secs:0,at:1};
const RIDE={part:'Run',ex:'Cycling',w:20,reps:[],mins:48,secs:0,at:2};
const LEGACY={part:'Run',ex:'Cycling',w:20.4117,reps:[5],at:3};                 // logged through the old weight screen
const BENCH={part:'Chest',ex:'Barbell Bench Press',w:60,reps:[8,8],at:4};

setTimeout(()=>{
 /* ---- 1. the shape predicate ---- */
 ok('a run row is cardio', run(`isCardio(${JSON.stringify(RUN)})`));
 ok('a ride with no reps is cardio', run(`isCardio(${JSON.stringify(RIDE)})`));
 ok('a LEGACY weight-shaped "Cycling" row is NOT cardio -- it keeps reading as the set it was logged as', !run(`isCardio(${JSON.stringify(LEGACY)})`));
 ok('a bench set is not cardio', !run(`isCardio(${JSON.stringify(BENCH)})`));
 ok('the array form agrees', run(`isCardioR(['Run','Cycling',20,[],48,0]) && !isCardioR(['Run','Cycling',20.4,[5]])`));

 /* ---- 2. units follow the activity AND the setting ---- */
 seed('lb',{});
 ok('imperial: a ride reads mi, a row reads m, a swim reads yd', run(`[cUnit('Cycling'),cUnit('Rowing'),cUnit('Swimming')].join(',')`)==='mi,m,yd', run(`[cUnit('Cycling'),cUnit('Rowing'),cUnit('Swimming')].join(',')`));
 ok('imperial: 12.5 mi stores as 20.1168 km', near(run(`cToKm('Cycling',12.5)`),20.1168,1e-4));
 ok('2,000 m stores as 2 km, and reads back as 2000', run(`cToKm('Rowing',2000)`)===2 && run(`cFromKm('Rowing',2)`)===2000);
 ok('imperial: 1,000 yd stores as 0.9144 km, and reads back as 1000', near(run(`cToKm('Swimming',1000)`),0.9144) && run(`cFromKm('Swimming',0.9144)`)===1000);
 seed('kg',{});
 ok('metric: a ride reads km, a swim reads m', run(`cUnit('Cycling')+','+cUnit('Swimming')`)==='km,m');

 /* ---- 3. the figure each sport quotes ---- */
 seed('lb',{});
 ok('cycling quotes speed', run(`cRate('Cycling',20.1168,2430)`)==='18.5 mph', run(`cRate('Cycling',20.1168,2430)`));
 ok('rowing quotes the /500m split', run(`cRate('Rowing',2,478)`)==="2'00\"/500m", run(`cRate('Rowing',2,478)`));
 ok('swimming quotes /100 in the pool unit', run(`cRate('Swimming',0.9144,1320)`)==="2'12\"/100yd", run(`cRate('Swimming',0.9144,1320)`));
 ok('walking quotes pace', run(`cRate('Walk',cToKm('Walk',2.1),2100)`)==="16'40\"/mi", run(`cRate('Walk',cToKm('Walk',2.1),2100)`));
 ok('no rate without both distance and time', run(`cRate('Cycling',0,2400)+cRate('Cycling',20,0)`)==='');

 /* ---- 4. running totals are RUNNING ---- */
 seed('kg',{'2026-09-20':{w:[RUN,RIDE],doneAll:true,upd:1}});
 ok('lifetime km counts the run, not the ride', near(run('SEED.totals.km'),5), run('SEED.totals.km'));
 ok('monthly km counts the run, not the ride', near(run(`SEED.monthly['2026-09'].km`),5), run(`SEED.monthly['2026-09'].km`));
 seed('kg',{'2026-09-20':{w:[RIDE,{...RIDE,w:15,at:9}],doneAll:true,upd:1}});
 ok("a day's two rides chart as their SUM (was: the longer one)", run(`SEED.hist['Cycling'].at(-1)[1]`)===35, run(`SEED.hist['Cycling'].at(-1)[1]`));
 seed('kg',{'2026-09-18':{w:[RUN],doneAll:true,upd:1},'2026-09-20':{w:[RIDE],doneAll:true,upd:1}});
 ok("the Cardio part's 'usual session' is still running distance -- a ride-only day does not drag it down", near(run(`avgSessionVol('Run')`),5), run(`avgSessionVol('Run')`));

 /* ---- 5. a legacy weight-shaped row is left exactly as it was ---- */
 seed('lb',{'2026-09-20':{w:[LEGACY],doneAll:true,upd:1}});
 const legacyRow=run(`setRows('Cycling',foldSets([[${LEGACY.w},[5],undefined,undefined,undefined]],'Cycling'),false)`);
 ok('it renders as a weight x reps set, not as a distance', /lb/.test(legacyRow)&&/repchip">5</.test(legacyRow), legacyRow.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
 ok('it is not listed as a ride', run(`cardioSessions('Cycling').length`)===0);

 /* ---- 6. editing a past day KEEPS its cardio rows ---- */
 seed('kg',{'2026-09-20':{w:[RIDE,BENCH],doneAll:true,upd:1}});
 run(`commitPastDay('2026-09-20','test')`);
 ok('commitPastDay keeps the ride (it used to delete every rep-less row that was not "Run")', run(`DB.days['2026-09-20'].w.some(s=>s.ex==='Cycling')`));
 run(`DB.days['2026-09-20'].w.find(s=>s.ex==='Barbell Bench Press').reps=[];commitPastDay('2026-09-20','test')`);
 ok('...while an emptied strength entry is still dropped', !run(`DB.days['2026-09-20'].w.some(s=>s.ex==='Barbell Bench Press')`)&&run(`DB.days['2026-09-20'].w.some(s=>s.ex==='Cycling')`));

 /* ---- 7. export keeps distance AND time ---- */
 seed('kg',{'2026-09-20':{w:[RUN,RIDE,{part:'Run',ex:'Elliptical',w:0,reps:[],mins:30,secs:15,at:5}],doneAll:true,upd:1}});
 const rows=JSON.parse(run('JSON.stringify(exportRows())'));
 const ride=rows.find(r=>r[2]==='Cycling'), ell=rows.find(r=>r[2]==='Elliptical');
 ok('the CSV carries the ride with its 48 min and 20 km', !!ride&&ride[6]===48&&ride[8]===20, JSON.stringify(ride));
 ok('...and a time-only session with its 30:15', !!ell&&ell[6]===30&&ell[7]===15, JSON.stringify(ell));
 ok('...and the run exactly as before', JSON.stringify(rows.find(r=>r[2]==='Run'))===JSON.stringify(['2026-09-20','Run','Run','','','',25,0,5]));

 /* ---- 8. logging from the exercise screen ---- */
 const logIt=(ex,d,m,s)=>{run(`DB.days={};DB.days[todayISO]={w:[],upd:1};SEED=deriveAll();lift={part:'Run',ex:'${ex}',weight:0,rep:0};view='lift';renderLift();`);
   const doc=w.document; if(d!=null&&doc.getElementById('rk'))doc.getElementById('rk').value=d; doc.getElementById('rm').value=m; doc.getElementById('rs').value=s;
   doc.getElementById('addrun').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
   return JSON.parse(run(`JSON.stringify(DB.days[todayISO].w)`)); };
 seed('lb',{});
 let got=logIt('Cycling','12.5','40','30');
 ok('a ride logs as {part:Run, ex:Cycling, km, mins, secs, no reps}', got.length===1&&got[0].part==='Run'&&got[0].ex==='Cycling'&&near(got[0].w,20.1168,1e-4)&&got[0].mins===40&&got[0].secs===30&&got[0].reps.length===0, JSON.stringify(got[0]));
 ok('the screen has no weight stepper and no rep ruler', !w.document.getElementById('wv')&&!w.document.getElementById('repRuler'));
 got=logIt('Cycling','','35','0');
 ok('a timed ride with no distance is still a ride', got.length===1&&got[0].w===0&&got[0].mins===35);
 got=logIt('Elliptical',null,'0','0');
 ok('a time-only activity refuses an empty entry', got.length===0);
 ok('...and says what it needs', /Time needed/.test(w.document.getElementById('toast')?.textContent||''), w.document.getElementById('toast')?.textContent);
 got=logIt('Run','','30','0');
 ok('a run still needs its distance (unchanged)', got.length===0&&/Distance needed/.test(w.document.getElementById('toast')?.textContent||''));
 got=logIt('Rowing','2000','7','58');
 ok('a row logs 2,000 m as 2 km', got.length===1&&got[0].w===2);
 ok('a cardio row never links to a strength plan target', got[0].planLinkStatus==='unlinked-run'&&!got[0].planRef, got[0].planLinkStatus);

 /* ---- 9. backfill converts units and picks the activity ---- */
 const backfill=(ex,dist,m)=>{run(`DB.days={'2026-09-01':{w:[${JSON.stringify(BENCH)}],doneAll:true,upd:1}};SEED=deriveAll();view='history';hist.y=2026;hist.m=9;hist.bf='2026-09-10';hist.bfPart='Run';hist.bfEx='${ex}';render();`);
   const doc=w.document; if(dist!=null)doc.getElementById('bfKm').value=dist; doc.getElementById('bfMin').value=m; doc.getElementById('bfSec').value='0';
   doc.getElementById('bfAdd').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
   return JSON.parse(run(`JSON.stringify((DB.days['2026-09-10']||{w:[]}).w)`)); };
 seed('lb',{});
 got=backfill('Run','3.1','28');
 ok('backfilling a 3.1 mi run stores 4.99 km (it stored 3.1 -- miles as km)', got.length===1&&near(got[0].w,4.989,1e-3), got[0]&&got[0].w);
 got=backfill('Swimming','1000','22');
 ok('backfilling a 1,000 yd swim stores 0.9144 km as Swimming', got.length===1&&got[0].ex==='Swimming'&&near(got[0].w,0.9144), JSON.stringify(got[0]));
 ok('the backfill part chip says Cardio, not Run', /Cardio/.test(w.document.querySelector('.bfcard')?.textContent||''));

 /* ---- 10. the rest of the app reads it right ---- */
 seed('kg',{'2026-09-20':{w:[RIDE,{part:'Run',ex:'Elliptical',w:0,reps:[],mins:30,secs:0,at:5}],doneAll:true,upd:1}});
 
 const pm=JSON.parse(run(`JSON.stringify(plateMetrics(DB.days['2026-09-20']))`));
 ok('plates: a ride and an elliptical session are two sets and zero kg (no weight moved)', pm.sets===2&&Math.round(pm.kg)===0, JSON.stringify(pm));
 const pr=JSON.parse(run(`JSON.stringify(progressionData('Elliptical').records.map(r=>[r.kind,r.seconds]))`));
 ok('progression: a time-only activity charts its duration (it charted nothing)', pr.length===1&&pr[0][0]==='dur'&&pr[0][1]===1800, JSON.stringify(pr));
 seed('kg',{'2026-09-20':{w:[{part:'Run',ex:'Rowing',w:2,reps:[],mins:8,secs:0,at:6}],doneAll:true,upd:1}});
 ok('progression: a row charts in metres', run(`progressionValue(progressionData('Rowing').records[0])`)===2000, run(`progressionValue(progressionData('Rowing').records[0])`));
 ok("progression: the axis says metres", run(`progressionAxis('run','Rowing')`)==='Distance · m');
 ok('the train list shows the last row, not a weight', run(`cardioTrainTxt('Rowing')`)==='2,000 m', run(`cardioTrainTxt('Rowing')`));
 ok('...and leaves Run to its own figure', run(`cardioTrainTxt('Run')`)===null);

 console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
},50);
