// Approved journey, synthetic records only. Never contacts an AI or user account.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
run(`DB={days:{},settings:{unit:'lb',name:'Sungjee',sex:'M',onboarded:true}};todayISO='2026-09-13';checkDate=()=>false;pwState=null;lift={part:'Legs',ex:'Squat'};pwOpen('2026-09-14');`);
test('new date opens calendar, not a fake saved plan',`pfState().page==='dates'&&!DB.week&&!(DB.days[todayISO]?.w||[]).length`);
run(`pfState().prefs=pfPrefs();pfNavigate('prefs');`);
test('one through seven days and every body-part slider',`document.querySelector('[data-value="1"]')&&document.querySelector('[data-value="7"]')&&document.querySelectorAll('[data-pf-emphasis]').length===Object.keys(SEED.catalog).filter(p=>p!=='Run').length`);
run(`pfState().prefs.emphasis.Chest=1;pfHandle('pf-prefs-save',{dataset:{}});`);
test('preference save preserves profile',`DB.settings.plannerPreferences.emphasis.Chest===1&&DB.settings.name==='Sungjee'&&DB.settings.sex==='M'`);
run(`var rows=pwRead('Squat\\n135 lb × 10 (warm-up)\\n225 lb × 8 8 8 8');var b=pwDay(pw().active);b.rows=pwCopy(rows);b.parts=['Legs'];pfAnchor();pfNavigate('days');`);
/* v4.6.75: 'days' lands on the routine page with the week strip */
test('the week is a strip above the routine, with Paste and Clear as buttons and no More',`pfState().page==='edit'&&document.querySelectorAll('.pf-strip .pf-chip').length===1&&document.querySelector('.pf-strip .pf-chip.selected')&&document.querySelector('.pf-tools [data-pw="paste"]')&&document.querySelector('.pf-tools [data-pw="pf-clear"]')&&!document.querySelector('.pf-routine-more,.pf-day-navigation')&&document.querySelector('[data-pw="pf-save"]')`);
run(`pfSave();var revision=plCurrent('2026-09-14');`);
test('saving archives targets without logging a workout',`pfState().page==='done'&&revision.targets.length===5&&Object.values(DB.days).every(d=>!(d.w||[]).length)`);
test('saved review owns an independent routine snapshot',`pfState().saved[0].rows!==pwDay(pw().active).rows&&JSON.stringify(pfState().saved[0].rows)===JSON.stringify(pwDay(pw().active).rows)`);
test('saved review has disclosures but no editing controls',`document.querySelector('[data-pf-saved-fold]')&&document.querySelector('[data-pw="pf-done-expand"]')&&!document.querySelector('.pf-done [data-pw="pf-edit-day"],.pf-done [data-pw-grip]')`);
run(`pfNavigate('dates');`);
test('returning to Dates retains completed steps',`!document.querySelector('[data-stage="2"]').disabled&&!document.querySelector('[data-stage="3"]').disabled`);
run(`pw().dates.push('2026-09-15');pwDay('2026-09-15');pwRender();`);
test('changing date selection disables later steps, retaining draft markers',`document.querySelector('[data-stage="2"]').disabled&&document.querySelector('[data-stage="3"]').disabled&&document.querySelector('[data-date="2026-09-14"].pf-editing')`);
run(`pw().dates=['2026-09-14'];pwRender();`);
test('restoring exact dates reenables stages',`!document.querySelector('[data-stage="3"]').disabled&&pwSetCount(pwDay('2026-09-14').rows)===5`);
test('saved calendar dates have dedicated themed dots',`document.querySelector('[data-date="2026-09-14"] .pf-plan-dot')`);
run(`pfNavigate('edit');pfHandle('pf-plus',{dataset:{}});`);
test('total change is pending, highlighted and does not mutate sets',`pfPending()&&pwSetCount(pwDay(pw().active).rows)===5&&document.querySelector('.pf-changed')&&document.querySelector('.pf-beam')`);
test('pending total prevents saving',`(()=>{try{pfSave();return false;}catch(e){return /Regenerate/.test(e.message);}})()`);
run(`pfHandle('pf-minus',{dataset:{}});`);
test('returning to original count clears pending state',`!pfPending()`);
test('repeated reps are grouped on one line of the spine',`pfGroups(pwDay(pw().active).rows[0]).length===2&&document.querySelectorAll('.pe-ex[data-pw-row="0"] .pe-line.pe-plan').length===2`);
/* v4.6.73: the form card is gone; a line is edited chip by chip, in place */
run(`pfHandle('pf-row-toggle',{dataset:{index:'0'}});pfHandle('pf-chip',{dataset:{index:'0',line:'1',field:'r',rep:'3'}});`);
test('a tapped rep is an input in its slot',`document.getElementById('peInput')&&document.getElementById('peInput').value==='8'`);
run(`document.getElementById('peInput').value='7';pfChipClose(true);pfHandle('pf-del-line',{dataset:{index:'0',line:'1'}});pfHandle('pf-add-line',{dataset:{index:'0'}});document.getElementById('peInput').value='225';pfChipClose(true);pfHandle('pf-add-rep',{dataset:{index:'0',line:'1'}});pfHandle('pf-add-rep',{dataset:{index:'0',line:'1'}});pfHandle('pf-row-toggle',{dataset:{index:'0'}});`);
test('editing one grouped row preserves the opener and saved target',`pwSetCount(pwDay(pw().active).rows)===4&&pwDay(pw().active).rows[0].lines[0].reps[0]===10&&pwDay(pw().active).rows[0].lines[1].w===225&&revision.targets.length===5`);
run(`DB.days['2026-09-12']={w:[{part:'Legs',ex:'Squat',w:100,reps:[8,8]},{part:'Sixpack',ex:'Plank',w:0,reps:[60],su:'s'}]};`);
test('history includes the entire matching day, including Core',`pfHistoryHTML().includes('Plank')&&pfHistoryHTML().includes('3 sets · 2 exercises')`);
test('matching logged sets render together without changing source records',`(()=>{const rows=Array.from({length:4},()=>({ex:'Squat',w:185/LB,reps:[8]})),before=JSON.stringify(rows),text=pfHistoryLines(rows);return text==='185 lb × 8 8 8 8'&&JSON.stringify(rows)===before;})()`);
test('different loads and timed sets stay separate',`pfHistoryLines([{ex:'Squat',w:50,reps:[8]},{ex:'Squat',w:60,reps:[8]},{ex:'Squat',w:60,reps:[60],su:'s'}]).split('<br>').length===3`);
test('overview excludes history entirely',`!pfDaysHTML().includes('Last workout day')`);
test('routine has no redundant title or Dates CTA; Clear matches its neighbors',`!document.querySelector('.pw-editor-head,[data-pw="pf-dates"]')&&!document.querySelector('[data-pw="pf-clear"]').classList.contains('pw-text')`);
test('back button lives in the existing app header (v4.6.72: it LEAVES to the previous navigation point)',`document.querySelector('header.planmode .hback[data-pw="pf-leave"]')&&!document.querySelector('.pf-workspace [data-pw="pf-leave"],.pf-workspace [data-pw="pf-back"]')`);
run(`pw().dates.push('2026-09-15');pw().book['2026-09-15']={...pwCopy(pwDay('2026-09-14')),rows:pwRead('Dip\\nBW × 8 8'),parts:['Chest'],base:pwFingerprint('2026-09-15')};pfAnchor();pfMoveDay('2026-09-14','2026-09-15');`);
test('moving a workout keeps destination dates and source targets',`pw().dates[0]==='2026-09-14'&&pwDay('2026-09-14').rows[0].ex==='Dip'&&pwDay('2026-09-15').rows[0].ex==='Squat'`);
run(`pfSave();pw().active='2026-09-14';pfNavigate('edit');pfHandle('pf-empty-day',{dataset:{}});pfSave();`);
test('zero sets requires explicit confirmation before saved plan removal',`pfState().emptyConfirm&&!!pwSaved('2026-09-14')`);
run(`pfSave(true);`);
test('confirmed empty day becomes No plan without deleting logs or other plans',`!pwSaved('2026-09-14')&&!!pwSaved('2026-09-15')&&DB.days['2026-09-12'].w.length===2`);
test('AI output cannot ignore avoided exercises',`(()=>{DB.settings.plannerPreferences.avoid=['Squat'];try{pfValidateCandidate({type:'generate',days:{'2026-09-15':{rows}}},['2026-09-15']);return false;}catch(e){return /avoided/.test(e.message);}})()`);
test('AI output cannot silently return different dates',`(()=>{try{pfValidateCandidate({days:{}},['2026-09-15']);return false;}catch(e){return /different dates/.test(e.message);}})()`);
run(`DB.settings.plannerPreferences.avoid=[];DB.week.days['2026-09-15'].title='Remote change';`);
test('newer saved plan is not silently overwritten',`(()=>{try{pfSave(true);return false;}catch(e){return !!pw().conflict;}})()`);
run(`pw().conflict=null;pwDay('2026-09-15').base=pwFingerprint('2026-09-15');pw().dates=['2026-09-15','2026-09-16'];pw().active='2026-09-15';pwDay('2026-09-16');pfState().pasteAll=true;pw().candidate={type:'paste',days:{'2026-09-15':{rows:pwRead('Dip\\nBW × 8 8'),notes:[]}}};pwApply();`);
test('explicit paste-all populates each selected draft, not the saved plans',`pwDay('2026-09-16').rows[0].ex==='Dip'&&!pwSaved('2026-09-16')&&pfMatch()`);
run(`var anchorBefore=JSON.stringify(pfState().anchor);pwPersist();pwOwner=null;pw();`);
test('draft and editing dates survive recreation',`JSON.stringify(pfState().anchor)===anchorBefore&&pwDay('2026-09-16').rows[0].ex==='Dip'`);
run(`pfHandle('pf-settings',{dataset:{}});`);
test('Settings opens the same preferences without a misleading stage bar',`pfState().page==='prefs'&&pfState().prefOrigin==='settings'&&!document.querySelector('.pf-steps')`);
run(`pfHandle('pf-prefs-save',{dataset:{}});pw().dates=['2026-09-16'];pw().active='2026-09-16';pwDay('2026-09-16').locks=[];view='today';lift.plan='workspace';pfNavigate('dates');writerGenerateChecked=async()=>({rows:[{kind:'day',iso:'2026-09-16'},...pwRead('Dip\\nBW × 8 8 8')],notes:[]});`);
(async()=>{
 await run('pwGenerate()');
 test('checked generation opens editable days directly, without saving',`pfState().page==='edit'&&pfMatch()&&pwSetCount(pwDay('2026-09-16').rows)===3&&!pwSaved('2026-09-16')`);
 run(`pfHandle('pf-edit-first',{dataset:{}});pfHandle('pf-clear',{dataset:{}});pfBack();`);
 test('Back closes the clear screen without leaving the routine',`pfState().page==='edit'&&!pfState().clear`);
 run(`pfNavigate('dates');pfNavigate('prefs');pfBack();`);
 test('Back retraces visited preferences to dates',`pfState().page==='dates'`);
 run(`pfBack();`);
 test('Back from dates returns to the routine that opened it',`pfState().page==='edit'&&pw().active==='2026-09-16'`);
 run(`pfHandle('pf-settings',{dataset:{}});pfBack();`);
 test('Settings preferences Back returns to Settings',`view==='sync'&&!lift.plan`);
 run(`view='today';lift.plan='workspace';DB.plan=null;const doc=planItemsFrom(pwRead('Squat\\n135 lb × 8 8'));DB.week={days:{'2026-09-11':doc,'2026-09-13':doc,'2026-09-15':doc}};pw().book={};delete pw().journey;pwOpen('2026-09-13','dates');`);
 test('past dates have no plan markers while today keeps its marker',`!document.querySelector('[data-date="2026-09-11"] .pf-plan-dot')&&document.querySelector('[data-date="2026-09-11"] small').textContent===''&&document.querySelector('[data-date="2026-09-13"] .pf-plan-dot')`);
 run(`pw().dates=['2026-09-13','2026-09-15'];pfState().anchor=[];pfState().furthest=1;pwRender();`);
 test('saved selection enables Edit without enabling Done',`!document.querySelector('[data-stage="2"]').disabled&&document.querySelector('[data-stage="3"]').disabled`);
 run(`pfHandle('pf-stage',{dataset:{stage:'2'}});`);
 test('Edit loads all selected saved routines without generating',`pfState().page==='edit'&&document.querySelectorAll('.pf-strip .pf-chip').length===2&&pfMatch()&&pwSetCount(pwDay('2026-09-13').rows)===2&&pwSetCount(pwDay('2026-09-15').rows)===2`);
 run(`pfNavigate('dates');pw().dates=[];pwRender();`);
 test('empty selection cannot enable Edit',`document.querySelector('[data-stage="2"]').disabled`);
 run(`pw().dates=['2026-09-15','2026-09-18'];pwRender();`);
 test('mixed saved and unplanned selection still needs a draft',`document.querySelector('[data-stage="2"]').disabled`);

 /* v4.6.61: opening the planner drops dates that have already gone. The state
    persists in localStorage under a key with no date in it, so a day picked on
    Wednesday was still shaded on Friday, and "1 day selected" named a day that
    had passed. Future picks are untouched -- a week planned ahead is still a
    week planned ahead. Asserted on the LIVE flow; test-plandates asserts the
    same rule on the legacy one, because both share pwFreshenDates(). */
 run(`todayISO='2026-09-18';DB.days={};SEED=deriveAll();
   pwState={v:1,step:'edit',dates:['2026-09-16'],active:'2026-09-16',month:'2026-09-01',book:{},objective:'grow'};pwOwner=pwKey();
   pwOpen(null,'dates');`);
 test('a date that has passed is not still selected when the planner opens',
      `pw().dates.every(d=>d>=todayISO)`);
 test('...and the selection lands on today',`pw().active===todayISO`);
 test('...and the calendar opens on the month that holds it',`pw().month==='2026-09-01'`);
 run(`pwState={v:1,step:'edit',dates:['2026-09-19','2026-09-20','2026-09-21'],active:'2026-09-19',month:'2026-09-01',book:{},objective:'grow'};pwOwner=pwKey();
   pwOpen(null,'dates');`);
 test('a week planned ahead is left exactly as it was',
      `JSON.stringify(pw().dates)===JSON.stringify(['2026-09-19','2026-09-20','2026-09-21'])&&pw().active==='2026-09-19'`);
 run(`pwState={v:1,step:'edit',dates:['2026-09-15','2026-09-16','2026-09-19','2026-09-20'],active:'2026-09-16',month:'2026-09-01',book:{},objective:'grow'};pwOwner=pwKey();
   pwOpen(null,'dates');`);
 test('a mixed selection loses only the days that have gone',
      `JSON.stringify(pw().dates)===JSON.stringify(['2026-09-19','2026-09-20'])&&pw().active==='2026-09-19'`);
 /* TODAY IS NOT A PASSED DAY. Without this, x>todayISO passes every other check
    here -- a lone stale date still lands on today via the empty-selection default,
    so the off-by-one only shows when today is picked ALONGSIDE a future day and is
    silently dropped out from under the plan. */
 run(`pwState={v:1,step:'edit',dates:['2026-09-18','2026-09-19'],active:'2026-09-18',month:'2026-09-01',book:{},objective:'grow'};pwOwner=pwKey();
   pwOpen(null,'dates');`);
 test('today itself survives beside a future day',
      `JSON.stringify(pw().dates)===JSON.stringify(['2026-09-18','2026-09-19'])&&pw().active==='2026-09-18'`);
 run(`DB.days['2026-09-18']={w:[{part:'Legs',ex:'Squat',w:100,reps:[8]}],doneAll:true,upd:1};SEED=deriveAll();
   pwState={v:1,step:'edit',dates:['2026-09-16'],active:'2026-09-16',month:'2026-09-01',book:{},objective:'grow'};pwOwner=pwKey();
   pwOpen(null,'dates');`);
 test('...and with today already complete it offers tomorrow, not today',
      `pw().active==='2026-09-19'`);
 run(`DB.days={};SEED=deriveAll();`);

 console.log(checks+' planner journey checks passed');dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
