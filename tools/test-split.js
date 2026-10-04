// v4.6.203: Your split -- an order of sessions: next up from the log, dates filled in order,
// starting sizes with no history, and the card on the Preferences page.
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
run(`todayISO='2026-10-04';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true,weekStart:'monday'}};
var LBs=2.20462,mk=(d,list)=>{DB.days[d]={w:list.map(([part,ex,n],k)=>({part,ex,w:50/LBs,reps:Array(n||4).fill(10),at:Date.parse(d+'T18:00')+k}))};};
var SIX=[{name:'',parts:['Shoulder','Sixpack']},{name:'',parts:['Back','Biceps']},{name:'',parts:['Chest','Sixpack']},{name:'',parts:['Legs','Sixpack']},{name:'',parts:['Biceps','Triceps','Sixpack']},{name:'',parts:['Chest','Sixpack']}];
var S1=()=>[['Shoulder','Lateral Raise'],['Sixpack','Hanging Leg Raise']],S2=()=>[['Back','Lat Pulldown'],['Biceps','EZ Bar Curl']],S3=()=>[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']],S4=()=>[['Legs','Squat'],['Sixpack','Hanging Leg Raise']],S5=()=>[['Biceps','EZ Bar Curl'],['Triceps','Triceps Pushdown'],['Sixpack','Hanging Leg Raise']];
migrateCanon();SEED=deriveAll();`);
/* next up */
test('nothing logged: the order starts at 1',`pfRotNext(SIX)===0`);
run(`mk('2026-09-28',S1());mk('2026-09-29',S2());`);
test('after Shoulder then Back: Chest is next',`pfRotNext(SIX)===2`);
run(`mk('2026-09-30',S3());`);
test('Chest + Sixpack appears twice in the six; what came before it says which one this was (the 3rd, so Legs next)',`pfRotNext(SIX)===3`);
run(`mk('2026-10-01',S4());mk('2026-10-02',S5());mk('2026-10-03',S3());`);
test('...and after Arms, the same Chest + Sixpack is the 6th, so Shoulder is next',`pfRotNext(SIX)===0`);
run(`delete DB.days['2026-10-03'];delete DB.days['2026-10-02'];delete DB.days['2026-10-01'];`);
/* skipped days do not break the order */
test('skip Thursday and Friday: the next dates still pick up at Legs, whatever weekday they are',`(()=>{const m=pfRotAssign(SIX,['2026-10-05','2026-10-07','2026-10-08']);return m['2026-10-05']===3&&m['2026-10-07']===4&&m['2026-10-08']===5;})()`);
test('it wraps round the end of the order',`(()=>{const m=pfRotAssign(SIX,['2026-10-05','2026-10-06','2026-10-07','2026-10-08']);return m['2026-10-08']===0;})()`);
test('a plan already saved on a day in between takes its turn',`(()=>{DB.week={days:{'2026-10-05':{d:'2026-10-05',items:[{ex:'Squat',lines:[{w:60,reps:[8]}]}]}}};const m=pfRotAssign(SIX,['2026-10-06','2026-10-07']);DB.week=null;return m['2026-10-06']===4&&m['2026-10-07']===5;})()`);
/* stored shape */
test('nothing saved: no split, and planning is as before',`pfPrefs().rotation===null`);
test('a stored split is cleaned: unknown parts and empty sessions dropped',`(()=>{DB.settings.plannerPreferences={avoid:[],rotation:{preset:'zzz',sessions:[{name:'A',parts:['Chest','Nope','Run']},{parts:[]},{parts:['Legs']}]}};const r=pfPrefs().rotation;return r.preset==='own'&&r.sessions.length===2&&r.sessions[0].parts.join()==='Chest'&&r.sessions[0].name==='A';})()`);
test('presets: body part is one session for each part you train (7), push/pull/legs 3, upper/lower 2, full body 1',`pfRotPreset('body').length===7&&pfRotPreset('body').every(x=>x.parts.length===1)&&pfRotPreset('ppl').map(x=>x.name).join()==='Push,Pull,Legs'&&pfRotPreset('ul').length===2&&pfRotPreset('full').length===1&&pfRotPreset('own')===null`);
/* filling the dates you pick */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,2,3,4,5],rotation:{preset:'own',sessions:SIX}};pw().dates=[];pw().active=null;pwOpen(null,'dates');`);
test('Dates opens on Mon to Fri, each empty day carrying its session’s body parts, from Next up',`(()=>{const s=pw();return s.dates.join()==='2026-10-05,2026-10-06,2026-10-07,2026-10-08,2026-10-09'&&s.dates.map(d=>pwDay(d).parts.join('+')).join(' | ')==='Legs+Sixpack | Biceps+Triceps+Sixpack | Chest+Sixpack | Shoulder+Sixpack | Back+Biceps'&&s.dates.every(d=>pwDay(d).partsPick&&pwDay(d).splitFill);})()`);
run(`pfHandle('date',{dataset:{date:'2026-10-05'}});pw().dates=pw().dates.filter(d=>d!=='2026-10-05');pw().active=pw().dates[0];pwRender();`);
test('drop Monday from the selection: the order slides, Tuesday is now Legs',`pwDay('2026-10-06').parts.join('+')==='Legs+Sixpack'&&pwDay('2026-10-09').parts.join('+')==='Shoulder+Sixpack'`);
run(`pw().active='2026-10-07';pfState().page='edit';pwRender();pfHandle('pf-part',{dataset:{part:'Back'}});pfState().page='dates';pwRender();`);
test('a day whose body parts you changed yourself is yours: the split leaves it alone',`pwDay('2026-10-07').parts.includes('Back')&&!pwDay('2026-10-07').splitFill`);
run(`pwDay('2026-10-08').rows=pwRead('Squat\\n  135 lb × 8 8 8');pwDay('2026-10-08').parts=['Legs'];pwDay('2026-10-08').splitFill=false;pwRender();`);
test('...and so is a day that already has exercises',`pwDay('2026-10-08').parts.join()==='Legs'`);
/* the writer is told the parts per date */
test('the payload names each date’s body parts',`(()=>{const p=pwPayload(['2026-10-06','2026-10-09'],'generate');return JSON.stringify(p).includes('Legs')&&JSON.stringify(p.workspace.schedule.find(x=>x.date==='2026-10-09')).includes('Shoulder');})()`);
/* starting sizes with no history */
run(`DB.days={};SEED=deriveAll();var PPL={preset:'ppl',sessions:pfRotPreset('ppl')};`);
test('no history and no split: no auto number, as before',`(()=>{DB.settings.plannerPreferences={avoid:[]};return pfAutoFor(['Chest','Shoulder','Triceps']).total===null;})()`);
test('with a split, a Push day starts at 7 + 7 + 4 = 18: ten a week for the big parts, six for the small, sharing twenty',`(()=>{DB.settings.plannerPreferences={avoid:[],rotation:PPL};const a=pfAutoFor(['Chest','Shoulder','Triceps']);return a.total===18&&a.per.map(x=>x[1]).join()==='7,7,4'&&a.start.join()==='Chest,Shoulder,Triceps'&&!a.missing.length;})()`);
test('...and the label says it is a starting size',`/a starting size for Chest \\+ Shoulder \\+ Triceps until three days are logged/.test(pfAutoHTML({},pfAutoFor(['Chest','Shoulder','Triceps'])))`);
test('a part trained twice in the order starts at half as much',`(()=>{DB.settings.plannerPreferences={avoid:[],rotation:{preset:'own',sessions:SIX}};const a=pfAutoFor(['Chest','Sixpack']);return a.per.map(x=>x[0]+x[1]).join()==='Chest5,Sixpack3';})()`);
test('a body-part day with no history: ten',`(()=>{DB.settings.plannerPreferences={avoid:[],rotation:{preset:'body',sessions:pfRotPreset('body')}};return pfAutoFor(['Back']).total===10;})()`);
test('never under three for a part, never past the session’s twenty when it can be helped',`(()=>{const n=pfStarterSets(['Chest','Back','Shoulder','Biceps','Triceps'],0,{sessions:pfRotPreset('ul')});return n.every(x=>x>=3)&&n.reduce((a,x)=>a+x,0)<=20;})()`);
/* the page */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,3,5]};pfHandle('pf-prefs',{dataset:{}});`);
test('the page has the split card: five choices, none lit, and a line saying what leaving it means',`document.querySelectorAll('.pf-split .pf-tile').length===5&&!document.querySelector('.pf-split .pf-tile.on')&&!document.querySelector('.pf-rot')&&/you choose body parts day by day/.test(document.querySelector('.pf-split-note').textContent)`);
run(`pfHandle('pf-split',{dataset:{value:'ppl'}});`);
test('Push / Pull / Legs: three sessions in order, named, with a Coming up on your training days',`[...document.querySelectorAll('.pf-rot')].map(r=>r.querySelector('.pf-rot-tags').textContent).join(' | ')==='PushChestShoulderTricepsNext up | PullBackBiceps | LegsLegsSixpack'&&[...document.querySelectorAll('.pf-up span')].map(x=>x.textContent).join(' | ')==='Mon, 10/5Push | Wed, 10/7Pull | Fri, 10/9Legs'`);
test('...and, with no history, what a session starts at',`/No history yet for Chest, Shoulder, Triceps, so they start at Chest 7 · Shoulder 7 · Triceps 4 sets/.test(document.querySelector('.pf-split-note').textContent)`);
run(`pfHandle('pf-rot-open',{dataset:{index:'1'}});pfHandle('pf-rot-part',{dataset:{index:'1',part:'Sixpack'}});`);
test('edit a session: it opens, a tap adds a part, and the split becomes My own',`document.querySelector('.pf-rot.open .pf-rot-part.on[data-part="Sixpack"]')&&/BackBicepsSixpack/.test(document.querySelectorAll('.pf-rot')[1].textContent)&&document.querySelector('.pf-tile.on').dataset.value==='own'`);
run(`pfHandle('pf-rot-add',{dataset:{}});pfHandle('pf-rot-part',{dataset:{index:'3',part:'Chest'}});`);
test('add a session',`document.querySelectorAll('.pf-rot').length===4&&/Chest/.test(document.querySelectorAll('.pf-rot')[3].querySelector('.pf-rot-tags').textContent)`);
run(`document.querySelector('[data-pf-rot-grip="3"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));`);
test('move it up with the handle (arrow key)',`pfState().prefs.rotation.sessions.map(x=>x.parts[0]).join()==='Chest,Back,Chest,Legs'`);
run(`pfHandle('pf-rot-open',{dataset:{index:'2'}});pfHandle('pf-rot-remove',{dataset:{index:'2'}});`);
test('remove a session',`pfState().prefs.rotation.sessions.length===3&&document.querySelectorAll('.pf-rot').length===3`);
run(`pfHandle('pf-split',{dataset:{value:'full'}});pfHandle('pf-split',{dataset:{value:'own'}});`);
test('try a preset and come back: My own still holds your sessions',`pfState().prefs.rotation.sessions.map(x=>x.parts.join('+')).join(' | ')==='Chest+Shoulder+Triceps | Back+Biceps+Sixpack | Legs+Sixpack'`);
test('nothing is stored until Save',`!DB.settings.plannerPreferences.rotation`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save stores the order, and the Settings line names it',`DB.settings.plannerPreferences.rotation.preset==='own'&&DB.settings.plannerPreferences.rotation.sessions.length===3&&!('own' in DB.settings.plannerPreferences.rotation)&&/3-session split/.test(pfSummary())`);
/* v4.6.204: Body parts you train, and tiles that count sessions, not days */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,3,5]};delete DB.settings.myParts;pfState().prefs=null;pfHandle('pf-prefs',{dataset:{}});var sub=k=>document.querySelector('.pf-tile[data-value="'+k+'"] small').textContent,chips=()=>[...document.querySelectorAll('.pf-mypart')].map(e=>e.dataset.part+(e.classList.contains('on')?'*':'')).join(' ');`);
test('the page has Body parts you train: the seven, all on, above Your split',`chips()==='Chest* Back* Shoulder* Legs* Biceps* Triceps* Sixpack*'&&[...document.querySelectorAll('.pf-prefs>.card>h3')].map(e=>e.textContent).join('|')==='What are you training for?|Your week|Body parts you train|Your split|Each session|Exercises'`);
test('no tile speaks of days: Body part counts one session for each part you train',`sub('body')==='7 sessions · one part each'&&sub('ppl')==='3 sessions'&&sub('ul')==='2 sessions'&&sub('full')==='Everything, every session'&&sub('own')==='Set each session yourself'&&!/day/i.test([...document.querySelectorAll('.pf-tile')].map(e=>e.textContent).join(' '))`);
run(`pfHandle('pf-split',{dataset:{value:'body'}});`);
test('Body part builds seven sessions, one part each, in the order of the chips',`[...document.querySelectorAll('.pf-rot')].map(r=>r.querySelector('.pf-rot-tag').textContent).join()==='Chest,Back,Shoulder,Legs,Biceps,Triceps,Sixpack'`);
run(`pfHandle('pf-mypart',{dataset:{part:'Legs'}});`);
test('switch Legs off: the chip goes out, the split is one session shorter, the tile counts six',`chips()==='Chest* Back* Shoulder* Legs Biceps* Triceps* Sixpack*'&&document.querySelectorAll('.pf-rot').length===6&&!/Legs/.test(document.querySelector('.pf-rots').textContent)&&sub('body')==='6 sessions · one part each'`);
test('...and the other presets follow: Push / Pull / Legs is down to two, Upper / Lower to one',`sub('ppl')==='2 sessions'&&sub('ul')==='1 session'`);
run(`pfHandle('pf-rot-open',{dataset:{index:'0'}});`);
test('a session’s editor offers only the parts you train',`[...document.querySelectorAll('.pf-rot.open .pf-rot-part')].map(e=>e.dataset.part).join()==='Chest,Back,Shoulder,Biceps,Triceps,Sixpack'`);
run(`pfHandle('pf-rot-part',{dataset:{index:'0',part:'Sixpack'}});pfHandle('pf-mypart',{dataset:{part:'Sixpack'}});`);
test('your own sessions lose a part you switch off; one left with nothing goes',`(()=>{const r=pfState().prefs.rotation;return r.preset==='own'&&r.sessions.map(x=>x.parts.join('+')).join()==='Chest,Back,Shoulder,Biceps,Triceps';})()`);
test('the last part cannot be switched off',`(()=>{const p=pfState().prefs,keep=p.parts.slice();p.parts=['Chest'];pfHandle('pf-mypart',{dataset:{part:'Chest'}});const ok=p.parts.join()==='Chest';p.parts=keep;return ok;})()`);
test('nothing is stored until Save',`!DB.settings.myParts`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save writes What you train (the same setting as Settings), and the split with it',`DB.settings.myParts.join()==='Chest,Back,Shoulder,Biceps,Triceps'&&[...myPartsSet()].length===5&&DB.settings.plannerPreferences.rotation.sessions.length===5&&!('parts' in DB.settings.plannerPreferences)`);
test('the day’s body-part choices in the plan follow it',`!pfPartList().includes('Legs')&&!pfPartList().includes('Sixpack')&&pfPartList().includes('Chest')`);
test('a part switched off later, in Settings, drops out of the stored split when it is read',`(()=>{toggleMyPart('Triceps');const r=pfPrefs().rotation;toggleMyPart('Triceps');return r.sessions.length===4&&!r.sessions.some(x=>x.parts.includes('Triceps'));})()`);
console.log(checks+' checks');process.exit(0);
