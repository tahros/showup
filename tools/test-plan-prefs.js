// v4.6.201: Plan -> Preferences rebuilt: stored shapes, warm-up, size limit, training days.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);
ctx.SRV=fs.readFileSync(path.join(dir,'supabase/functions/write-session/index.ts'),'utf8');
let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
run(`todayISO='2026-10-03';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
var LBs=2.20462,mkP=(d,part,ex,lb,reps,bw)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/LBs,bw:!!bw,reps,at:Date.parse(d+'T18:00')+(DB.days[d]?DB.days[d].w.length:0)});};
for(const d of ['2026-09-22','2026-09-25','2026-09-29']){mkP(d,'Chest','Barbell Bench Press',135,[8,8,8,8]);mkP(d,'Chest','Dip',25,[8,8,8],true);mkP(d,'Chest','Cable Fly Down',35,[12,12,12]);}
migrateCanon();SEED=deriveAll();var D='2026-10-06';pwOpen(D);
var gen=(text,prefs)=>{DB.settings.plannerPreferences={avoid:[],...prefs};const c={type:'generate',days:{[D]:{rows:pwRead(text),notes:[]}}};pfValidateCandidate(c,[D]);return c.days[D];};
var T='Barbell Bench Press\\n  135 lb × 8 8 8 8\\nDip\\n  BW +25 lb × 8 8 8\\nCable Fly Down\\n  35 lb × 12 12 12';`);
/* old stored shapes */
test('a stored time preference reads as Auto; a stored sets range as a limit at its maximum',`(()=>{DB.settings.plannerPreferences={frequency:5,mode:'time',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:[],split:'auto'};const a=pfPrefs();DB.settings.plannerPreferences.mode='sets';const b=pfPrefs();return a.mode==='auto'&&a.warmup===true&&a.trainDays===null&&b.mode==='limit'&&b.maxSets===25;})()`);
test('nothing stored: Auto, warm-up on, no training days yet',`(()=>{delete DB.settings.plannerPreferences;const p=pfPrefs();return p.mode==='auto'&&p.warmup&&p.trainDays===null;})()`);
/* warm-up */
test('warm-up on: the first lift opens with one lighter set, on the bar’s own steps, and Checks says so',`(()=>{const d=gen(T,{warmup:true});return /^Barbell Bench Press\\n\\s*85 lb × 10 \\(warm-up\\)\\n\\s*135 lb × 8 8 8 8/.test(pwText(d.rows))&&d.notes.includes('Barbell Bench Press: warm-up set added at 85 lb.');})()`);
test('...only the first lift; one already written is kept, not doubled; one on a later exercise is taken off',`(()=>{const d=gen('Barbell Bench Press\\n  95 lb × 10 (warm-up)\\n  135 lb × 8 8 8 8\\nDip\\n  BW × 8 (warm-up)\\n  BW +25 lb × 8 8 8',{warmup:true});const t=pwText(d.rows);return (t.match(/warm-up/g)||[]).length===1&&/95 lb × 10 \\(warm-up\\)/.test(t);})()`);
test('warm-up off: none are written, and Checks says why',`(()=>{const d=gen('Barbell Bench Press\\n  95 lb × 10 (warm-up)\\n  135 lb × 8 8 8 8\\nDip\\n  BW +25 lb × 8 8 8',{warmup:false});return !/warm-up/.test(pwText(d.rows))&&d.notes.includes('Warm-up sets left out: your preference.');})()`);
test('a bodyweight first lift has nothing to scale from: no warm-up invented',`(()=>{const d=gen('Dip\\n  BW +25 lb × 8 8 8\\nCable Fly Down\\n  35 lb × 12 12 12',{warmup:true});return !/warm-up/.test(pwText(d.rows));})()`);
/* size */
test('Auto does not pad or trim to a range',`(()=>{const d=gen(T,{mode:'auto',warmup:false});return pwSetCount(d.rows)===10&&!d.notes.some(n=>/limit|range/.test(n));})()`);
test('a limit trims a day over it, and says so',`(()=>{const d=gen(T,{mode:'limit',maxSets:8,warmup:false});return pwSetCount(d.rows)===8&&d.notes.some(n=>/^Set count kept to your limit of 8: 10 → 8 sets/.test(n));})()`);
test('a limit never adds to a day under it',`(()=>{const d=gen(T,{mode:'limit',maxSets:30,warmup:false});return pwSetCount(d.rows)===10;})()`);
/* training days */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,2,3,4,5]};pw().dates=[];pw().active=null;pwOpen(null,'dates');`);
test('Dates opens on Mon to Fri of the next seven days (today is Saturday)',`pw().dates.join()==='2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09'&&pw().active==='2026-10-05'`);
run(`pfHandle('pf-unselect',{dataset:{}});`);
test('Unselect all still clears them, and they do not come back on a re-render',`(()=>{pwRender();return pw().dates.length===0;})()`);
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[]};pw().dates=[];pw().active=null;pwOpen(null,'dates');`);
test('no training days chosen: one day, as before',`pw().dates.length===1`);
test('the weekdays offered are the ones trained in at least half of the last eight weeks',`(()=>{const keep=DB.days;DB.days={};const t=new Date('2026-10-03T12:00');for(let k=1;k<=56;k++){const d=new Date(t);d.setDate(t.getDate()-k);if([1,3,5].includes(d.getDay()))DB.days[d.toLocaleDateString('en-CA')]={w:[{ex:'Squat',w:100,reps:[5]}]};}const u=pfUsualDays();DB.days=keep;return u.join()==='1,3,5';})()`);
/* the Settings line and the server */
test('the Settings summary speaks the new preferences',`(()=>{DB.settings.plannerPreferences={avoid:[],mode:'limit',maxSets:18,warmup:false,trainDays:[1,2,3,4,5]};DB.settings.weekStart='monday';return pfSummary()==='Grow · Mon Tue Wed Thu Fri · up to 18 sets · no warm-up · 0 avoided';})()`);
test('the server prompt: only the parts named for a date, no core added on its own',`/write ONLY for those parts: do not add a core exercise/.test(SRV)`);
console.log(checks+' checks');process.exit(0);
