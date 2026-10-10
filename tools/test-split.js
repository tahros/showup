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
test('a stored split is cleaned: unknown parts and empty sessions dropped; Cardio and the order of parts are kept',`(()=>{DB.settings.plannerPreferences={avoid:[],orderMode:'own',rotation:{preset:'zzz',sessions:[{name:'A',parts:['Chest','Nope','Run']},{parts:[]},{parts:['Legs']}]}};const r=pfPrefs().rotation;return r.preset==='own'&&r.sessions.length===2&&r.sessions[0].parts.join()==='Chest,Run'&&r.sessions[0].name==='A';})()`);
test('presets: body part is one session for each part you train (7), push/pull/legs 3, upper/lower 2, full body 1',`pfRotPreset('body').length===7&&pfRotPreset('body').every(x=>x.parts.length===1)&&pfRotPreset('ppl').map(x=>x.name).join()==='Push,Pull,Legs'&&pfRotPreset('ul').length===2&&pfRotPreset('full').length===1&&pfRotPreset('own')===null`);
/* filling the dates you pick */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,2,3,4,5],orderMode:'own',rotation:{preset:'own',sessions:SIX}};pw().dates=[];pw().active=null;pwOpen(null,'dates');`);
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
test('no history and no order of your own: the starter order does not set a starting size, as before',`(()=>{DB.settings.plannerPreferences={avoid:[]};return pfOrderInfo().kind==='learning'&&pfAutoFor(['Chest','Shoulder','Triceps']).total===null;})()`);
test('with a split, a Push day starts at 7 + 7 + 4 = 18: ten a week for the big parts, six for the small, sharing twenty',`(()=>{DB.settings.plannerPreferences={avoid:[],orderMode:'own',rotation:PPL};const a=pfAutoFor(['Chest','Shoulder','Triceps']);return a.total===18&&a.per.map(x=>x[1]).join()==='7,7,4'&&a.start.join()==='Chest,Shoulder,Triceps'&&!a.missing.length;})()`);
test('...and the label says it is a starting size',`/a starting size for Chest \\+ Shoulder \\+ Triceps until three days are logged/.test(pfAutoHTML({},pfAutoFor(['Chest','Shoulder','Triceps'])))`);
test('a part trained twice in the order starts at half as much',`(()=>{DB.settings.plannerPreferences={avoid:[],orderMode:'own',rotation:{preset:'own',sessions:SIX}};const a=pfAutoFor(['Chest','Sixpack']);return a.per.map(x=>x[0]+x[1]).join()==='Chest5,Sixpack3';})()`);
test('a body-part day with no history: ten',`(()=>{DB.settings.plannerPreferences={avoid:[],orderMode:'own',rotation:{preset:'body',sessions:pfRotPreset('body')}};return pfAutoFor(['Back']).total===10;})()`);
test('never under three for a part, never past the session’s twenty when it can be helped',`(()=>{const n=pfStarterSets(['Chest','Back','Shoulder','Biceps','Triceps'],0,{sessions:pfRotPreset('ul')});return n.every(x=>x>=3)&&n.reduce((a,x)=>a+x,0)<=20;})()`);
/* the page */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,3,5]};pfHandle('pf-prefs',{dataset:{}});var rowsTxt=()=>[...document.querySelectorAll('.pf-ses')].map(r=>[...r.querySelectorAll('.pf-rot-name,.pf-rot-tag,.pf-rot-next,.pf-ses-in>em')].map(e=>e.textContent.trim()).join(' ')).join(' | ');`);
/* v4.6.255: Your order is one card; with no log it is still learning, with a starter order */
test('the page has Your order: still learning, a count, and the starter order it plans with',`(()=>{const c=document.querySelector('.pf-order');return !!c&&!document.querySelector('.pf-tile')&&/Still learning your routine/.test(c.textContent)&&/0 workouts logged so far/.test(c.textContent)&&/Starter order/.test(c.textContent)&&c.querySelector('.pf-ochange').textContent==='Set my own';})()`);
run(`pfHandle('pf-order-open',{dataset:{value:'own'}});`);
test('Set my own opens the sheet on Set my own, seeded with the starter order, with Start from presets',`(()=>{const h=document.getElementById('pfOrder');return !!h&&h.querySelector('.pf-segb.on').dataset.value==='own'&&pfState().prefs.orderMode==='own'&&[...h.querySelectorAll('.pf-from-b')].map(b=>b.dataset.value).join()==='body,ppl,ul,full'&&h.querySelectorAll('.pf-ses').length===pfRotStarter(pfMyParts()).length;})()`);
run(`pfHandle('pf-split',{dataset:{value:'ppl'}});`);
test('Push / Pull / Legs (Start from): three sessions in order, named',`rowsTxt()==='Push Chest Shoulder Triceps Next up | Pull Back Biceps | Legs Legs Sixpack'`);
test('a strip of chips sits above the sessions: Cardio and the parts you train, with how to use them',`[...document.querySelectorAll('.pf-pal-chip')].map(e=>e.textContent).join()==='Cardio,Chest,Back,Shoulder,Legs,Biceps,Triceps,Sixpack'&&/Drag onto a session, or tap one/.test(document.querySelector('.pf-pal-h').textContent)`);
/* v4.6.207: tap a chip to pick it up, tap the sessions it belongs in */
run(`pfState().rotHeld='Sixpack';pfSplitRefresh();`);
test('pick up Sixpack: the chip is held, the hint says what to do, sessions without it offer "+ Sixpack", the one with it lights its chip',`document.querySelector('.pf-pal-chip.held').textContent==='Sixpack'&&/Tap the sessions Sixpack belongs in/.test(document.querySelector('.pf-pal-h').textContent)&&[...document.querySelectorAll('.pf-ses')].map(r=>(r.querySelector('.pf-rot-ghost')?'ghost':'')+(r.querySelector('.pf-rot-tag.hit')?'hit':'')).join()==='ghost,ghost,hit'&&document.querySelectorAll('.pf-ses[data-pw="pf-rot-put"]').length===2`);
run(`pfHandle('pf-rot-put',{dataset:{index:'1'}});`);
test('tap session 2: Sixpack goes in at the end, the split becomes My own, and the chip stays held for the next session',`rowsTxt().split(' | ')[1]==='Back Biceps Sixpack'&&pfState().prefs.rotation.preset==='own'&&pfState().rotHeld==='Sixpack'`);
run(`pfState().rotHeld='Run';pfSplitRefresh();pfHandle('pf-rot-put',{dataset:{index:'0'}});pfHandle('pf-rot-put',{dataset:{index:'1'}});pfHandle('pf-rot-put',{dataset:{index:'1'}});`);
test('Cardio tapped into a session goes FIRST (before lifting), and never twice',`pfState().prefs.rotation.sessions.map(x=>x.parts.join('+')).join(' | ')==='Run+Chest+Shoulder+Triceps | Run+Back+Biceps+Sixpack | Legs+Sixpack'&&/^Cardio Chest/.test(rowsTxt())`);
run(`pfState().rotHeld=null;pfSplitRefresh();pfHandle('pf-rot-x',{dataset:{index:'1',k:'3'}});`);
test('the x on a chip takes it out of that session only',`pfState().prefs.rotation.sessions[1].parts.join('+')==='Run+Back+Biceps'&&pfState().prefs.rotation.sessions[2].parts.includes('Sixpack')`);
test('the labels say Cardio, not Run',`/Cardio/.test(document.querySelector('#pfOrder .pf-split').textContent)&&!/Run/.test(document.querySelector('#pfOrder .pf-split').textContent)`);
run(`pfHandle('pf-rot-add',{dataset:{}});`);
test('+ Add a session makes an empty box that asks for a part and can be removed',`document.querySelectorAll('.pf-ses').length===4&&/Drop a body part here/.test(document.querySelectorAll('.pf-ses')[3].textContent)&&document.querySelectorAll('.pf-ses')[3].querySelector('[data-pw="pf-rot-remove"]')`);
run(`pfRotPut(pfState().prefs.rotation,3,'Run');pfSplitRefresh();`);
test('a session can hold Cardio alone',`rowsTxt().split(' | ')[3]==='Cardio'`);
run(`document.querySelector('[data-pf-rot-grip="3"]').dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));`);
test('move a session up with its handle (arrow key)',`pfState().prefs.rotation.sessions.map(x=>x.parts.join('+')).join(' | ')==='Run+Chest+Shoulder+Triceps | Run+Back+Biceps | Run | Legs+Sixpack'`);
run(`pfHandle('pf-rot-x',{dataset:{index:'2',k:'0'}});pfHandle('pf-rot-remove',{dataset:{index:'2'}});`);
test('empty a session and remove it',`pfState().prefs.rotation.sessions.length===3&&document.querySelectorAll('.pf-ses').length===3`);
test('nothing is stored until Save',`!DB.settings.plannerPreferences.rotation`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save stores the order, and the Settings line names it',`DB.settings.plannerPreferences.orderMode==='own'&&DB.settings.plannerPreferences.rotation.preset==='own'&&DB.settings.plannerPreferences.rotation.sessions.length===3&&!('own' in DB.settings.plannerPreferences.rotation)&&/3-session split/.test(pfSummary())`);
/* v4.6.204: Body parts you train, and tiles that count sessions, not days */
run(`DB.settings.plannerPreferences={avoid:[],trainDays:[1,3,5]};delete DB.settings.myParts;pfState().prefs=null;pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-order-open',{dataset:{value:'own'}});var sub=k=>document.querySelector('.pf-tile[data-value="'+k+'"] small').textContent,chips=()=>[...document.querySelectorAll('.pf-mypart')].map(e=>e.dataset.part+(e.classList.contains('on')?'*':'')).join(' ');`);
test('the page has Body parts you train: the seven, all on, above Your order',`chips()==='Chest* Back* Shoulder* Legs* Biceps* Triceps* Sixpack*'&&[...document.querySelectorAll('.pf-prefs>.card>h3,.pf-prefs>.card>.pf-ohead>h3')].map(e=>e.textContent).join('|')==='What are you training for?|Your week|Body parts you train|Your order|Each session|Exercises'`);
run(`pfHandle('pf-split',{dataset:{value:'body'}});`);
test('Body part builds seven sessions, one part each, in the order of the chips',`[...document.querySelectorAll('.pf-ses')].map(r=>r.querySelector('.pf-rot-tag').textContent).join()==='Chest,Back,Shoulder,Legs,Biceps,Triceps,Sixpack'`);
run(`pfHandle('pf-mypart',{dataset:{part:'Legs'}});`);
test('switch Legs off: the chip goes out, the split is one session shorter, six sessions',`chips()==='Chest* Back* Shoulder* Legs Biceps* Triceps* Sixpack*'&&document.querySelectorAll('.pf-ses').length===6&&!/Legs/.test(document.querySelector('.pf-rots').textContent)`);
test('the strip offers only the parts you train, and Cardio',`[...document.querySelectorAll('.pf-pal-chip')].map(e=>e.dataset.pfChip).join()==='Run,Chest,Back,Shoulder,Biceps,Triceps,Sixpack'`);
run(`pfRotPut(pfState().prefs.rotation,0,'Sixpack');pfRotPut(pfState().prefs.rotation,0,'Run');pfSplitRefresh();pfHandle('pf-mypart',{dataset:{part:'Sixpack'}});`);
test('your own sessions lose a part you switch off (Cardio stays); one left with nothing goes',`(()=>{const r=pfState().prefs.rotation;return r.preset==='own'&&r.sessions.map(x=>x.parts.join('+')).join()==='Run+Chest,Back,Shoulder,Biceps,Triceps';})()`);
test('the last part cannot be switched off',`(()=>{const p=pfState().prefs,keep=p.parts.slice();p.parts=['Chest'];pfHandle('pf-mypart',{dataset:{part:'Chest'}});const ok=p.parts.join()==='Chest';p.parts=keep;return ok;})()`);
test('nothing is stored until Save',`!DB.settings.myParts`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('Save writes What you train (the same setting as Settings), and the split with it',`DB.settings.myParts.join()==='Chest,Back,Shoulder,Biceps,Triceps'&&[...myPartsSet()].length===5&&DB.settings.plannerPreferences.rotation.sessions.length===5&&!('parts' in DB.settings.plannerPreferences)`);
test('the day’s body-part choices in the plan follow it',`!pfPartList().includes('Legs')&&!pfPartList().includes('Sixpack')&&pfPartList().includes('Chest')`);
test('a part switched off later, in Settings, drops out of the stored split when it is read',`(()=>{toggleMyPart('Triceps');const r=pfPrefs().rotation;toggleMyPart('Triceps');return r.sessions.length===4&&!r.sessions.some(x=>x.parts.includes('Triceps'));})()`);
/* v4.6.207: the day's cardio */
(async()=>{
run(`delete DB.settings.myParts;DB.days={};var mkc=(d,km,min)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part:'Run',ex:'Run',km,min,at:Date.parse(d+'T07:00')});},mks=(d,part,ex)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:40,reps:[10,10,10],at:Date.parse(d+'T18:00')});};
for(const d of ['2026-09-21','2026-09-24','2026-09-28']){mkc(d,3,19);mks(d,'Chest','Barbell Bench Press');mks(d,'Chest','Dip');}mkc('2026-10-01',3.2,20);mks('2026-10-01','Back','Lat Pulldown');
migrateCanon();SEED=deriveAll();
var CS=[{name:'',parts:['Run','Chest']},{name:'',parts:['Back','Run']},{name:'',parts:['Run']}];DB.settings.plannerPreferences={avoid:[],warmup:false,orderMode:'own',rotation:{preset:'own',sessions:CS}};`);
test('cardio logged that day counts when reading Next up: after Back + Cardio comes the Cardio-only session',`pfRotNext(CS)===2`);
test('the cardio line is your most recent entry as logged, never an invented number',`pfCardioLine()==='Run — '+dDisp(3.2).replace(/\\.?0+$/,'')+' '+DU()+' · 20 min'`);
test('...and with nothing logged it says so',`(()=>{const k=DB.days;DB.days={};const l=pfCardioLine();DB.days=k;return l==='Run — by feel';})()`);
run(`var D1='2026-10-06',D2='2026-10-07';pw().dates=[D1,D2];pw().active=D1;pw().book={};pwRender();`);
test('the dates you pick take Cardio with their session’s parts, in the session’s order (Next up is the Cardio-only session, then round to Cardio + Chest)',`pwDay(D1).parts.join('+')==='Run'&&pwDay(D2).parts.join('+')==='Run+Chest'`);
run(`pw().book={};Object.assign(pwDay(D1),{rows:[],parts:['Run','Chest'],partsPick:true,locks:[]});Object.assign(pwDay(D2),{rows:[],parts:['Back','Run'],partsPick:true,locks:[]});pfAnchor();pfState().page='edit';pw().step='edit';writerWaitStart=()=>{};
writeSession=async p=>({days:[{date:D1,part:'Chest',title:'Chest',text:'Barbell Bench Press\\n  90 lb × 10 10 10\\n\\nDip\\n  BW +90 lb × 10 10 10'},{date:D2,part:'Back',title:'Back',text:'Run\\n  20 min easy\\n\\nLat Pulldown\\n  90 lb × 10 10 10'}],reason:null});`);
await run(`pwGenerate()`);
run(`var R1=pwDay(D1).rows,R2=pwDay(D2).rows;`);
test('Cardio first in the day’s parts: the cardio line opens the day',`!pw().error&&pfIsCardioRow(R1[0])&&/^Run — .* · 20 min$/.test(R1[0].raw)&&R1.slice(1).every(r=>r.kind==='ex')&&R1.filter(pfIsCardioRow).length===1`);
test('Cardio after the lifts: the line closes the day; the writer’s own cardio line is replaced, not doubled',`pfIsCardioRow(R2[R2.length-1])&&R2.filter(pfIsCardioRow).length===1&&R2.slice(0,-1).every(r=>r.kind==='ex')&&R2.some(r=>r.ex==='Lat Pulldown')`);
test('it does not count toward the sets, and leaves no "could not be read" Check',`pwSetCount(R1)===pwSetCount(R1.filter(r=>!pfIsCardioRow(r)))&&!(pwDay(D2).notes||[]).some(n=>/could not be read/.test(n))`);
run(`pw().active=D1;pwRender();`);
test('on the Edit step it is a row of its own, tagged Cardio, with its detail and an edit button -- not a block of text',`(()=>{const a=document.querySelector('.pw-exercise.pf-cardio');return !!a&&a.querySelector('strong').textContent==='Run'&&a.querySelector('.pf-mtag').textContent==='Cardio'&&/20 min/.test(a.querySelector('.pf-cardio-line').textContent)&&!!a.querySelector('[data-pw="editrow"]')&&!document.querySelector('.pw-unread');})()`);
test('the writer is told to leave cardio to the app',`/Do not write cardio lines/.test(pwPayload([D1],'generate').note)`);
run(`pfSave();`);
test('it is saved with the plan',`/Run — /.test(pwSaved(D1).raw||'')&&pwSaved(D1).items.length===2`);
/* v4.6.209: select sessions, add to all of them, No split, Fill for me */
run(`DB.days={};SEED=deriveAll();DB.settings.plannerPreferences={avoid:[],trainDays:[1,2,3,4,5]};delete DB.settings.myParts;pfState().prefs=null;pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-order-open',{dataset:{value:'own'}});pfHandle('pf-split',{dataset:{value:'body'}});var SES=()=>pfState().prefs.rotation.sessions.map(x=>x.parts.join('+')).join(' | '),Q1=s=>document.querySelector(s),QA=s=>[...document.querySelectorAll(s)];`);
test('every session number is a button that says it is not selected',`QA('.pf-ses>button.pf-rot-n').length===7&&QA('.pf-rot-n').every(e=>e.dataset.pw==='pf-rot-sel'&&e.getAttribute('aria-pressed')==='false')&&!Q1('.pf-selbar')`);
run(`pfHandle('pf-rot-sel',{dataset:{index:'0'}});pfHandle('pf-rot-sel',{dataset:{index:'2'}});pfHandle('pf-rot-sel',{dataset:{index:'3'}});`);
test('tap 1, 3 and 4: three are selected, the strip says so and offers Unselect all',`QA('.pf-ses.sel').map(e=>+e.dataset.pfRot+1).join()==='1,3,4'&&Q1('.pf-selbar b').textContent==='3 selected'&&/Unselect all/.test(Q1('.pf-unsel').textContent)&&/Tap a body part to add it/.test(Q1('.pf-pal-h').textContent)&&QA('.pf-rot-n[aria-pressed="true"]').length===3`);
test('Next up is a label on the session, not a colour on its number: only selected sessions carry .sel',`QA('.pf-ses.next').length===1&&!!Q1('.pf-ses.next .pf-rot-next')&&QA('.pf-ses.sel').length===3`);
run(`pfPalTap('Sixpack');pfSplitRefresh();`);
test('tap Sixpack: it goes into all three, at the end, and the selection stays for the next part',`SES()==='Chest+Sixpack | Back | Shoulder+Sixpack | Legs+Sixpack | Biceps | Triceps | Sixpack'&&pfState().rotSel.join()==='0,2,3'&&pfState().prefs.rotation.preset==='own'`);
test('...and its chip is lit, with the hint saying a lit one comes out',`Q1('.pf-pal-chip.all').textContent==='Sixpack'&&QA('.pf-pal-chip.all').length===1&&/Tap a lit one to take it out/.test(Q1('.pf-pal-h').textContent)`);
run(`pfPalTap('Run');pfSplitRefresh();`);
test('tap Cardio: first in each selected session',`SES()==='Run+Chest+Sixpack | Back | Run+Shoulder+Sixpack | Run+Legs+Sixpack | Biceps | Triceps | Sixpack'`);
run(`pfHandle('pf-rot-sel',{dataset:{index:'1'}});pfPalTap('Sixpack');pfSplitRefresh();`);
test('add a session that lacks it to the selection: the tap adds to that one, and takes nothing from the others',`SES().split(' | ')[1]==='Back+Sixpack'&&SES().split(' | ')[0]==='Run+Chest+Sixpack'`);
run(`pfPalTap('Sixpack');pfSplitRefresh();`);
test('when every selected session has it, the tap takes it out of them all',`SES()==='Run+Chest | Back | Run+Shoulder | Run+Legs | Biceps | Triceps | Sixpack'`);
run(`pfHandle('pf-rot-sel',{dataset:{index:'1'}});`);
test('tap a selected number again: that one is unselected',`pfState().rotSel.join()==='0,2,3'&&Q1('.pf-selbar b').textContent==='3 selected'`);
run(`pfHandle('pf-rot-unsel',{dataset:{}});`);
test('Unselect all: nothing selected, the strip goes back to Body parts, and no session changed',`!Q1('.pf-ses.sel')&&!Q1('.pf-selbar')&&/Body parts/.test(Q1('.pf-pal-h').textContent)&&SES()==='Run+Chest | Back | Run+Shoulder | Run+Legs | Biceps | Triceps | Sixpack'`);
run(`pfPalTap('Triceps');pfSplitRefresh();`);
test('with nothing selected a tap on a body part picks it up, as before',`pfState().rotHeld==='Triceps'&&Q1('.pf-pal-chip.held').textContent==='Triceps'`);
run(`pfState().rotHeld=null;pfHandle('pf-rot-sel',{dataset:{index:'6'}});pfHandle('pf-rot-remove',{dataset:{index:'6'}});`);
test('removing a session drops the selection (the numbers have moved)',`pfState().rotSel.length===0&&pfState().prefs.rotation.sessions.length===6`);
/* v4.6.255: From your log / Set my own */
run(`var OWN=SES();pfHandle('pf-order-mode',{dataset:{value:'log'}});`);
test('From your log: the sheet shows what was read (still learning with no log), and your own sessions are kept',`(()=>{const h=document.getElementById('pfOrder');return h.querySelector('.pf-segb.on').dataset.value==='log'&&!h.querySelector('.pf-ses')&&/Still learning your routine/.test(h.textContent)&&pfState().prefs.orderMode==='log'&&SES()===OWN;})()`);
run(`pfHandle('pf-order-close',{dataset:{}});`);
test('Done closes the sheet; the card says still learning',`(!document.getElementById('pfOrder')||document.getElementById('pfOrder').classList.contains('out'))&&/Still learning/.test(Q1('.pf-order').textContent)`);
run(`pfHandle('pf-prefs-save',{dataset:{}});`);
test('saved in From your log: no rotation is stored, the sessions you made are kept aside',`DB.settings.plannerPreferences.orderMode==='log'&&!DB.settings.plannerPreferences.rotation&&DB.settings.plannerPreferences.rotOwn.map(x=>x.parts.join('+')).join(' | ')===OWN`);
run(`pfState().prefs=null;pfHandle('pf-prefs',{dataset:{}});pfHandle('pf-order-open',{dataset:{}});pfHandle('pf-order-mode',{dataset:{value:'own'}});`);
test('Set my own afterwards brings them back as they were',`SES()===OWN&&document.querySelector('#pfOrder .pf-segb.on').dataset.value==='own'`);
run(`pfHandle('pf-order-close',{dataset:{}});pfState().prefs=null;`);
/* reading the log: rounds of the routine, not weeks */
run(`var mk=(rot,n,opt={})=>{const days={},EX={Shoulder:'Lateral Raise',Back:'Lat Pulldown',Chest:'Barbell Bench Press',Legs:'Squat',Biceps:'EZ Bar Curl',Triceps:'Triceps Pushdown',Sixpack:'Hanging Leg Raise'},t=new Date(todayISO+'T12:00');let i=0;
 for(let k=200;k>=1&&i<n;k--){}const dates=[];for(let k=1;dates.length<n;k++){const d=new Date(t);d.setDate(t.getDate()-k);if(d.getDay()===0&&!opt.sundays)continue;dates.unshift(d.toLocaleDateString('en-CA'));}
 dates.forEach((iso,j)=>{const parts=(opt.swap&&opt.swap[j])||rot[j%rot.length],w=[];if(opt.cardio)w.push({part:'Run',ex:'Run',km:3.2,min:20,at:Date.parse(iso+'T07:00')});parts.forEach((pt,q)=>w.push({part:pt,ex:EX[pt],w:20,reps:[10,10,10],at:Date.parse(iso+'T18:00')+q}));days[iso]={w};});
 DB.days=days;SEED=deriveAll();},SIXR=[['Shoulder','Sixpack'],['Chest','Sixpack'],['Back','Sixpack'],['Legs','Sixpack'],['Biceps','Triceps','Sixpack'],['Chest','Sixpack']],J=o=>o.sessions.map(x=>x.parts.join('+')).join(' | ');
 DB.settings.weekStart='monday';DB.settings.plannerPreferences={avoid:[]};`);
test('11 workouts of a six-session routine: not twice yet, still learning, with a count',`(()=>{mk(SIXR,11);const o=pfRotLearn();return o.kind==='learning'&&o.n===11;})()`);
test('12 workouts, the routine twice back to back: the order is read, 12 workouts, twice in a row',`(()=>{mk(SIXR,12);const o=pfRotLearn();return o.kind==='log'&&o.sessions.length===6&&o.rounds===2&&o.used===12;})()`);
test('48 workouts with cardio first: six sessions, Chest twice, cardio first in each, 8 rounds',`(()=>{mk(SIXR,48,{cardio:true});const o=pfRotLearn();return o.kind==='log'&&o.rounds===8&&o.used===48&&o.sessions.every(x=>x.parts[0]==='Run')&&o.sessions.filter(x=>x.parts.includes('Chest')).length===2;})()`);
test('rounds, not weeks: a three-day trainer over 16 weeks is read the same way (12 workouts of a 3-session routine = 4 rounds)',`(()=>{mk([['Chest'],['Back'],['Legs']],12);const o=pfRotLearn();return o.kind==='log'&&o.sessions.length===3&&o.rounds===4&&o.used===12;})()`);
test('one swapped day does not rename a session: the routine is read from the rounds that matched',`(()=>{const sw={};sw[40]=[['Legs','Sixpack']][0];mk(SIXR,48,{swap:sw});const o=pfRotLearn();return o.kind==='log'&&!J(o).includes('Legs+Sixpack | Legs+Sixpack')&&o.sessions.filter(x=>x.parts.includes('Legs')).length===1;})()`);
test('a new routine in the last few workouts: the old order stays, dated, until the new one repeats twice',`(()=>{const sw={};for(let j=44;j<48;j++)sw[j]=[['Legs'],['Back'],['Chest']][j%3];mk(SIXR,48,{swap:sw});const o=pfRotLearn();return o.kind==='changed'&&o.sessions.length===6&&!!o.upTo;})()`);
test('...and once the new one has repeated twice, it is the order',`(()=>{const sw={};for(let j=36;j<48;j++)sw[j]=[['Legs'],['Back'],['Chest']][j%3];mk(SIXR,48,{swap:sw});const o=pfRotLearn();return o.kind==='log'&&o.sessions.length===3;})()`);
test('20 workouts that do not repeat: no set order, with the starter to plan with',`(()=>{const P=['Chest','Back','Legs','Shoulder','Biceps'],sw={};for(let j=0;j<20;j++)sw[j]=[P[[0,3,1,4,2,2,0,4,1,3,3,1,0,2,4,4,0,1,3,2][j]]];mk(SIXR,20,{swap:sw});const o=pfRotLearn();return o.kind==='none'&&o.n===20&&o.sessions.length>0;})()`);
test('a part you do not train is left out of what is read',`(()=>{mk(SIXR,24);return pfRotLearn(pfMyParts().filter(t=>t!=='Sixpack')).sessions.every(x=>!x.parts.includes('Sixpack'));})()`);
test('planning uses it: the card says what it is based on, in workouts and rounds',`(()=>{mk(SIXR,24,{cardio:true});pfState().prefs=null;pfHandle('pf-prefs',{dataset:{}});const t=Q1('.pf-order').textContent;return /Based on your last 24 workouts\. You did this routine 4 times in a row\./.test(t)&&QA('.pf-order .pf-orounds i').length===4&&QA('.pf-order .pf-os').length===6&&QA('.pf-order .pf-os.nx').length===1&&pfOrderRot().preset==='log';})()`);
test('...and the Dates step fills picked days in that order',`(()=>{pw().dates=['2026-10-05','2026-10-06'];pw().book={};pfSplitFill();const a=pwDay('2026-10-05').parts,b=pwDay('2026-10-06').parts;return a.length>0&&b.length>0&&a.join()!==b.join();})()`);
console.log(checks+' checks');process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
