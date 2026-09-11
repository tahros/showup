// Planning workspace: real parser/storage/payload, model responses stubbed.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g)){
  let source=fs.readFileSync(path.join(dir,m[1]),'utf8');
  if(m[1]==='js/planner.js'&&process.env.PW_MUTATION){
    const probes={conflict:['if(b.base!==pwFingerprint(d))','if(false)'],neighbors:['pwCopy(DB.week?.days||{})','{}'],locks:['dst.locks.push(c.index+i)','void 0']};
    const probe=probes[process.env.PW_MUTATION];if(!probe||!source.includes(probe[0]))throw Error('Unknown or ineffective mutation probe');source=source.replace(probe[0],probe[1]);
  }
  vm.runInContext(source,ctx,{filename:m[1]});
}
const run=s=>vm.runInContext(s,ctx);let fails=0,checks=0;
function ok(name,expr){checks++;let good;try{good=typeof expr==='string'?run(expr):expr;}catch(e){good=false;console.log(e.stack);}console.log(`${good?'PASS':'FAIL'} ${name}`);if(!good)fails++;}
const click=a=>run(String.raw`document.querySelector('[data-pw="${a}"]').click()`);
run(String.raw`DB.days={}; DB.settings.onboarded=true;DB.settings.unit='lb';DB.settings.myParts=['Legs','Chest','Back','Shoulder','Biceps','Triceps','Sixpack'];DB.plan=null;DB.week=null;
  todayISO='2026-09-10';checkDate=()=>false;
  DB.days['2026-09-08']={w:[{part:'Legs',ex:'Squat',w:90,reps:[8,8,8],at:1}],upd:1};
  SEED=deriveAll();view='today';lift.plan=null;dayMeta();render();`);
ok('workspace is the default, no legacy Write toolbar',String.raw`planningWorkspace() && !!document.querySelector('[data-pw="open-date"]') && !document.querySelector('[data-planwrite]')`);
ok('no-plan Train next is retained',String.raw`/Train next/i.test(document.getElementById('view').textContent)`);
run(String.raw`pwOpen('2026-09-11');`);ok('new day starts with date selection',String.raw`pw().step==='dates'&&!!document.querySelector('.pw-calendar')`);
run(String.raw`pw().dates=['2026-09-11','2026-10-03'];pw().active='2026-09-11';pwDay('2026-10-03');pwGo('focus');`);
ok('per-date focus for dates across months',String.raw`document.querySelectorAll('[data-pw="part"][data-date="2026-10-03"]').length===7`);
run(String.raw`pwDay('2026-09-11').parts=['Legs','Sixpack'];pwDay('2026-10-03').parts=['Chest'];pwGo('edit');`);
ok('all selected dates visible in editor',String.raw`document.querySelectorAll('.pw-days button').length===2`);
run(String.raw`var recordBefore=JSON.stringify(DB.days),plansBefore=JSON.stringify([DB.plan,DB.week]);`);
click('paste');run(String.raw`pw().pasteText='Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8 8 8\n\nPlank\n  BW × 60 sec × 3\n\nMystery movement\n  20 lb × 12 12';`);click('readpaste');
ok('paste has explicit Add versus Replace',String.raw`!!document.querySelector('[data-pw="apply-add"]')&&/Replace this day/.test(document.querySelector('[data-pw="apply"]').textContent)`);
ok('unreadable headings retain weight/reps',String.raw`document.querySelector('.pw-unread').textContent.includes('20 lb × 12 12')`);
click('apply');ok('warmup and timed sets count honestly',String.raw`pwCounts(pwDay('2026-09-11').rows).total===8&&pwCounts(pwDay('2026-09-11').rows).warm===1`);
ok('paste affects active date only',String.raw`pwDay('2026-10-03').rows.length===0`);
ok('draft actions do not write plans or workout record',String.raw`plansBefore===JSON.stringify([DB.plan,DB.week])&&recordBefore===JSON.stringify(DB.days)`);
run(String.raw`pw().candidate={type:'paste',days:{'2026-09-11':{rows:pwRead('Squat\n  185 lb × 5'),notes:[]}}};pwApply(true);`);
ok('Add retains duplicate exercises separately',String.raw`pwExercises(pwDay('2026-09-11').rows).filter(r=>r.ex==='Squat').length===2`);
click('undo');ok('Undo restores entire pre-paste draft',String.raw`pwCounts(pwDay('2026-09-11').rows).total===8`);
run(String.raw`pwPersist();var savedDraft=JSON.stringify(pwDay('2026-09-11').rows);pwState=null;pwOwner=null;pw();`);
ok('draft survives a reload',String.raw`JSON.stringify(pwDay('2026-09-11').rows)===savedDraft`);
run(String.raw`pwOpen('2026-09-11');pwGo('edit');`);click('editrow');run(String.raw`pw().pasteText='Squat\n  135 lb × 8 (warm-up)\n  205 lb × 9 8 8 8';`);click('readpaste');click('apply');
ok('manual edits are automatically kept fixed',String.raw`pwDay('2026-09-11').locks.includes(0)&&pwDay('2026-09-11').rows[0].lines[1].reps[0]===9`);
run(String.raw`var unchanged=JSON.stringify(pwDay('2026-09-11'));pwDay('2026-09-11').target=9;`);
ok('adjustment rejects changes to fixed exercises',String.raw`(()=>{try{pwValidateAdjustment(pwRead('Squat\n  135 lb × 8 (warm-up)\n  205 lb × 9 8 8 8 8\n\nPlank\n  BW × 60 sec × 3\n\nMystery movement\n  20 lb × 12 12'),pwDay('2026-09-11'));return false;}catch(e){return /fixed/.test(e.message);}})()`);
run(String.raw`pwDay('2026-09-11').locks=[];pwDay('2026-09-11').rows=pwRead('Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8 8');pwDay('2026-09-11').target=5;`);
ok('adjustment keeps loads and changes only counts',String.raw`(()=>{const rows=pwValidateAdjustment(pwRead('Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8 8 8'),pwDay('2026-09-11'));return pwCounts(rows).total===5&&rows[0].lines[1].w===205;})()`);
ok('adjustment rejects wrong totals',String.raw`(()=>{try{pwValidateAdjustment(pwRead('Squat\n  135 lb × 8 (warm-up)\n  205 lb × 8 8'),pwDay('2026-09-11'));return false;}catch(e){return true;}})()`);
ok('adjustment rejects warmup removal',String.raw`(()=>{try{pwValidateAdjustment(pwRead('Squat\n  205 lb × 8 8 8 8 8'),pwDay('2026-09-11'));return false;}catch(e){return true;}})()`);
ok('serialization follows numeric rows, not stale raw text',String.raw`(()=>{const r=pwRead('Squat\n  205 lb × 8 8');r[0].lines[0].w=215;r[0].lines[0].reps.push(7);return pwText(r).includes('215 lb × 8 8 7');})()`);
ok('more than twelve typed sets survive storage conversion',String.raw`(()=>{const r=pwRead('Squat\n  135 lb × '+Array(20).fill(8).join(' '));return planItemsFrom(r).items[0].lines.flatMap(l=>l.reps).length===20;})()`);
run(String.raw`DB.week={days:{'2026-09-12':{title:'Chest',items:[{ex:'Barbell Bench Press',lines:[{w:70,reps:[8,8]}]}]}}};pw().dates=['2026-09-11','2026-10-03'];pwDay('2026-10-03').parts=['Chest'];var payload=pwPayload(['2026-09-11','2026-10-03']);var oldPayload=writerPayload({scope:'week',days:new Set(payload.days),rewrite:true,focus:[],objective:pw().objective,note:pw().note,part:'auto'});`);
for(const field of ['history','catalog','heads','coverage','best','last','next','steps','recent_sessions','recent_weeks','usual','shape','objective'])ok(`existing AI context preserved: ${field}`,String.raw`JSON.stringify(payload.${field})===JSON.stringify(oldPayload.${field})`);
ok('selected multi-date focus is explicit',String.raw`payload.workspace.schedule[1].parts[0]==='Chest'&&payload.days[1]==='2026-10-03'`);
ok('saved future plan informs recovery',String.raw`payload.skeleton[0].resting.some(r=>r.part==='Chest'&&r.on==='2026-09-12')`);
ok('context includes both requested months',String.raw`payload.week_context.some(d=>d.date==='2026-09-12'&&d.planned)&&payload.week_context.some(d=>d.date==='2026-10-04')`);
ok('manual paste bypasses writer',String.raw`typeof WRITER_STUB==='undefined'`);
run(String.raw`pwDay('2026-10-03').rows=pwRead('Barbell Bench Press\n  135 lb × 8 8 8');var neighbor=JSON.stringify(DB.week.days['2026-09-12']);pwGo('review');pwSave();`);
ok('saving merges dates without overwriting neighbors',String.raw`JSON.stringify(DB.week.days['2026-09-12'])===neighbor&&DB.week.days['2026-10-03'].items.length===1`);
ok('saved weight is canonical kg',String.raw`Math.abs(DB.week.days['2026-09-11'].items[0].lines[1].w-205/LB)<.001`);
ok('saving never writes workout sets',String.raw`recordBefore===JSON.stringify(DB.days)`);
run(String.raw`pwOpen('2026-10-03');DB.week.days['2026-10-03'].note='a newer plan';var beforeConflict=JSON.stringify(DB.week);`);
ok('stale drafts cannot overwrite a newer plan',String.raw`(()=>{try{pwSave();return false;}catch(e){return /changed/.test(e.message)&&beforeConflict===JSON.stringify(DB.week)&&pw().conflict==='2026-10-03';}})()`);
run(String.raw`pwRender();`);ok('conflict has explicit non-destructive resolution',String.raw`!!document.querySelector('[data-pw="replace-newer"]')&&!!document.querySelector('[data-pw="load-newer"]')`);click('load-newer');
ok('conflict resolution does not save',String.raw`beforeConflict===JSON.stringify(DB.week)&&pw().step==='review'`);
run(String.raw`day(todayISO).w=[{part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8],at:1}];day(todayISO).doneAll=true;dayMeta();lift.plan=null;view='today';SEED=deriveAll();render();var closedRecord=JSON.stringify(DB.days);`);
ok('completed Today offers Plan ahead',String.raw`dayClosed()&&/Plan ahead/.test(document.getElementById('view').textContent)`);
ok('completed Today retains actual trained record',String.raw`/Barbell Bench Press/.test(document.getElementById('view').textContent)&&!!document.querySelector('[data-replayday]')`);
run(String.raw`pwOpen('2026-09-11');pwGo('edit');pwPersist();`);ok('planning tomorrow does not reopen completed today',String.raw`dayClosed()&&JSON.stringify(DB.days)===closedRecord`);
run(String.raw`view='sync';render();`);click('mode');run(String.raw`document.querySelector('[data-pw="mode"][data-mode="previous"]').click();view='today';render();`);
ok('Previous restores old Write door without changing records',String.raw`!planningWorkspace()&&!!document.querySelector('[data-planwrite]')&&JSON.stringify(DB.days)===closedRecord`);
run(String.raw`localStorage.removeItem(PW_MODE_KEY);pwOpen('2026-09-11');pwDay('2026-09-11').rows=[];pwDay('2026-09-11').locks=[];pw().dates=['2026-09-11'];pwDay('2026-09-11').parts=['Legs'];var WRITER_STUB=async p=>({days:p.days.map(date=>({date,part:'Legs',title:'Legs',text:'Squat\n  205 lb × 8 8 8'})),reason:null});`);
(async()=>{
  await run('pwGenerate()');ok('real shared checker produces a reviewable candidate',String.raw`pw().step==='candidate'&&pw().candidate.type==='generate'`);
  ok('AI response is not saved automatically',String.raw`JSON.stringify(DB.week.days['2026-09-12'])===neighbor`);
  run(String.raw`pw().candidate=null;pw().step='edit';WRITER_STUB=()=>new Promise(resolve=>{window.resolveWriter=resolve});var inFlight=pwGenerate();`);
  click('cancel');run(String.raw`window.resolveWriter({days:[{date:'2026-09-11',part:'Legs',text:'Squat\n  205 lb × 8'}]});`);await run('inFlight');
  ok('cancelled answer cannot replace draft or hijack screen',String.raw`pw().step==='edit'&&!pw().candidate&&!pw().busy`);
  console.log(`${checks-fails}/${checks} planner assertions passed`);dom.window.close();process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
