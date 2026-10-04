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
/* v4.6.205: Avoid and Hold on the page are what is true now, not a copy from when it was opened */
run(`DB.settings.plannerPreferences={avoid:[]};DB.settings.exPref={};pfState().prefs=null;pfNavigate('prefs');var av=()=>[...document.querySelectorAll('[data-pw="pf-unavoid"]')].map(e=>e.textContent.trim()).join(),ho=()=>[...document.querySelectorAll('[data-pw="pf-unhold"]')].map(e=>e.textContent.replace(/\\s+/g,' ').trim().split(' 1')[0]).join();`);
test('open Preferences with nothing avoided: the list is empty',`av()===''`);
run(`pfNavigate('dates');setExPref('Decline Dumbbell Bench Press','avoid');setExHold('Barbell Bench Press',true);pfNavigate('prefs');`);
test('avoid an exercise elsewhere, and hold another: coming back, the page shows both (the copy left behind is not what is shown)',`av()==='Decline Dumbbell Bench Press'&&/^Barbell Bench Press/.test(ho())`);
run(`pfHandle('pf-warmup',{dataset:{}});pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save after changing something else does NOT remove them',`exPrefNames('avoid').join()==='Decline Dumbbell Bench Press'&&isHeld('Barbell Bench Press')`);
run(`pfHandle('pf-prefs',{dataset:{}});setExPref('Romanian Deadlift','avoid');pwRender();`);
test('one avoided while the page is open appears on the next render',`av()==='Decline Dumbbell Bench Press,Romanian Deadlift'||av()==='Romanian Deadlift,Decline Dumbbell Bench Press'`);
run(`var ix=[...document.querySelectorAll('[data-pw="pf-unavoid"]')].findIndex(e=>/Romanian/.test(e.textContent));pfHandle('pf-unavoid',{dataset:{index:String(ix)}});pfHandle('pf-xpick-open',{dataset:{kind:'avoid'}});pfHandle('pf-xpick-part',{dataset:{part:'Legs'}});pfHandle('pf-xpick-toggle',document.querySelector('#pfPick [data-ex="Standing Calf Raise"]'));pfHandle('pf-xpick-go',{dataset:{}});`);
test('take one off and add one here: shown at once, stored only on Save',`av()==='Decline Dumbbell Bench Press,Standing Calf Raise'&&exPrefNames('avoid').slice().sort().join()==='Decline Dumbbell Bench Press,Romanian Deadlift'`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save applies exactly those two taps',`exPrefNames('avoid').slice().sort().join()==='Decline Dumbbell Bench Press,Standing Calf Raise'&&DB.settings.plannerPreferences.avoid.slice().sort().join()==='Decline Dumbbell Bench Press,Standing Calf Raise'&&!('avoidAdd' in DB.settings.plannerPreferences)&&!('hold' in DB.settings.plannerPreferences)`);
run(`pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-goal',{dataset:{value:'strength'}});pfNavigate('dates');document.querySelector('[data-pw="pf-stage"][data-stage="0"]')&&pfHandle('pf-stage',{dataset:{stage:'0'}});`);
test('leave without saving and come back by the tab: the page starts from what is saved',`document.querySelector('[data-pw="pf-goal"].on').dataset.value==='grow'`);
/* v4.6.206: the picker sheet */
run(`DB.days={'2026-09-29':{w:[{part:'Chest',ex:'Barbell Bench Press',w:135/2.20462,reps:[8,8,8]},{part:'Chest',ex:'Dip',w:25/2.20462,bw:true,reps:[8,8]}]},'2026-06-02':{w:[{part:'Chest',ex:'Chest Fly',w:45.4,reps:[12]}]}};migrateCanon();SEED=deriveAll();DB.settings.exPref={};DB.settings.exHold={};DB.settings.plannerPreferences.avoid=[];setExPref('Standing Calf Raise','avoid');pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-xpick-open',{dataset:{kind:'avoid'}});
var H=()=>document.getElementById('pfPick'),rows=()=>[...H().querySelectorAll('.pf-pick-row')].map(e=>e.dataset.ex),sub=ex=>H().querySelector('[data-ex="'+ex+'"] small').textContent,tap=ex=>pfHandle('pf-xpick-toggle',H().querySelector('[data-ex="'+ex+'"]')),go=()=>H().querySelector('.pf-pick-go');`);
test('+ Add under Avoid opens a sheet, not a dropdown: title, search, a chip per body part you train, Chest first',`H()&&H().querySelector('h3').textContent==='Avoid an exercise'&&H().querySelector('[data-pf-pick-q]')&&[...H().querySelectorAll('.pf-pick-part')].map(e=>e.dataset.part+(e.classList.contains('on')?'*':'')).join(' ')==='Chest* Back Shoulder Legs Biceps Triceps Sixpack'&&!document.querySelector('.pf-prefs select')`);
test('exercises are grouped by muscle, yours first and most recent first',`[...H().querySelectorAll('.pf-pick-mh')].map(e=>e.firstChild.textContent).join()==='upper chest,mid chest,lower chest'&&rows().indexOf('Barbell Bench Press')<rows().indexOf('Chest Fly')&&rows().indexOf('Chest Fly')<rows().indexOf('Dumbbell Bench Press')`);
test('each row says when you last did it, or that you have not',`/^Last done (Tue, )?Sep 29$/.test(sub('Barbell Bench Press'))&&sub('Chest Fly')==='Last done Jun 2'&&sub('Dumbbell Bench Press')==='Not done yet'&&!!H().querySelector('[data-ex="Dumbbell Bench Press"] .pf-pick-new')`);
test('nothing chosen: the button waits',`go().disabled&&go().textContent==='Choose exercises'`);
run(`tap('Barbell Bench Press');tap('Chest Fly');`);
test('tick two: both marked, the button counts them',`H().querySelectorAll('.pf-pick-row.on').length===2&&!go().disabled&&go().textContent==='Avoid 2 exercises'`);
run(`tap('Chest Fly');pfHandle('pf-xpick-part',{dataset:{part:'Legs'}});`);
test('untick one; change body part: the selection is kept, and what is already avoided shows ticked and cannot be picked',`go().textContent==='Avoid 1 exercise'&&H().querySelector('[data-ex="Standing Calf Raise"]').classList.contains('have')&&sub('Standing Calf Raise')==='Already avoided'&&(tap('Standing Calf Raise'),go().textContent==='Avoid 1 exercise')`);
run(`var q=H().querySelector('[data-pf-pick-q]');q.value='curl';q.dispatchEvent(new window.Event('input',{bubbles:true}));`);
test('search looks across every body part, and says which',`rows().length>=5&&rows().every(x=>/curl/i.test(x))&&[...H().querySelectorAll('.pf-pick-mh')].some(e=>/^Biceps · /.test(e.textContent))&&[...H().querySelectorAll('.pf-pick-mh')].some(e=>/^Legs · /.test(e.textContent))&&!H().querySelector('.pf-pick-part.on')`);
run(`q.value='zzzz';q.dispatchEvent(new window.Event('input',{bubbles:true}));`);
test('no match says so',`/No exercise matches “zzzz”/.test(H().querySelector('.pf-pick-list').textContent)`);
run(`q.value='';q.dispatchEvent(new window.Event('input',{bubbles:true}));pfHandle('pf-xpick-go',{dataset:{}});`);
test('the button adds them to the page and closes the sheet; nothing is stored yet',`!pfState().pick&&[...document.querySelectorAll('[data-pw="pf-unavoid"]')].map(e=>e.textContent.trim()).sort().join()==='Barbell Bench Press,Standing Calf Raise'&&exPrefNames('avoid').join()==='Standing Calf Raise'`);
run(`pfHandle('pf-xpick-open',{dataset:{kind:'avoid'}});tap('Dip');pfHandle('pf-xpick-close',{dataset:{}});`);
test('closing without the button adds nothing',`!pfState().pick&&![...document.querySelectorAll('[data-pw="pf-unavoid"]')].some(e=>/Dip/.test(e.textContent))`);
run(`pfHandle('pf-xpick-open',{dataset:{kind:'hold'}});`);
test('Hold offers only what you have logged, with the weight it would hold at',`H().querySelector('h3').textContent==='Hold the weight'&&rows().slice().sort().join()==='Barbell Bench Press,Chest Fly,Dip'&&sub('Barbell Bench Press')==='Would hold at 135 lb'&&sub('Dip')==='Would hold at BW+25 lb'&&[...H().querySelectorAll('.pf-pick-part')].map(e=>e.dataset.part).join()==='Chest'`);
run(`tap('Dip');pfHandle('pf-xpick-go',{dataset:{}});pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save stores both lists',`exPrefNames('avoid').slice().sort().join()==='Barbell Bench Press,Standing Calf Raise'&&isHeld('Dip')&&!document.getElementById('pfPick')?.querySelector('.pf-pick')||true`);
run(`DB.days={};SEED=deriveAll();pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-xpick-open',{dataset:{kind:'hold'}});`);
test('Hold with nothing logged explains itself',`/Nothing logged yet\\. Hold needs a weight on record/.test(H().querySelector('.pf-pick-list').textContent)&&H().querySelectorAll('.pf-pick-part').length===0`);
run(`pfNavigate('dates');`);
test('leaving the page closes the sheet',`!document.getElementById('pfPick')&&!pfState().pick`);
console.log(checks+' checks');process.exit(0);
