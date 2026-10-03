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
function ok2(name,value){assert(value,name);console.log('PASS '+name);checks++;}
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
/* v4.6.78: the dates page drops its two headings; the selection is an inset
   square, drawn on the day's ::before so the 44px target keeps its size. */
const pfcss=fs.readFileSync(path.join(dir,'css/planner-flow.css'),'utf8');
test('the dates page has no prompt line, and the month labels its own arrows',`pfState().page==='dates'&&!document.querySelector('.pf-date-prompt')&&!/Select dates/.test(document.getElementById('view').textContent)&&document.querySelector('.pw-month strong').textContent.includes('2026')`);
ok2('the selection is an inset square, not a full-bleed fill',/inset:5px 3px/.test(pfcss.match(/\.pf-date-sheet \.pf-calendar \.pw-btn::before\{([^}]+)\}/)?.[1]||'')&&/border-radius:10px/.test(pfcss.match(/\.pf-date-sheet \.pf-calendar \.pw-btn::before\{([^}]+)\}/)?.[1]||'')&&/\.pf-date-sheet \.pf-calendar \.selected::before\{background:var\(--accent\)\}/.test(pfcss));
/* v4.6.79: the tab bar is chrome. A page may style what sits UNDER the tabs,
   never the tabs themselves -- a per-page margin there moved the bar on every
   tap, and collapsed through the workspace to move the whole page with it.
   check-tabbar.cjs measures the result; this stops the shape coming back. */
/* v4.6.80: picking a day floods the SQUARE; the cell itself never paints.
   The flash was a leftover animation filling the whole button. */
/* v4.6.81: the dates card opens on the calendar. The preferences summary and
   its Edit button are gone -- that button left for the Preferences tab, which
   is already on this screen, while reading as "edit these dates". */
test('the dates card opens on the month, with no preferences summary and one door to Preferences',`pfState().page==='dates'&&!document.querySelector('.pf-compact-prefs,.pf-pref-edit')&&document.querySelector('.pf-date-sheet').firstElementChild.classList.contains('pw-month')&&!/exercises avoided/.test(document.getElementById('view').textContent)&&document.querySelectorAll('.pf-workspace [data-pw="pf-prefs"]').length===0&&!!document.querySelector('.pf-steps [data-stage="0"],.pf-steps button')`);
ok2('no motion paints the day cell itself',!/backgroundColor:'var\(--surface\)'|backgroundColor:'var\(--accent\)'/.test(fs.readFileSync(path.join(dir,'js/planner-flow.js'),'utf8')));
ok2('the ink floods the square and is clipped by its corner',/@keyframes pf-ink-in\{from\{clip-path:circle\(0%[^}]*\}to\{clip-path:circle\(78%/.test(pfcss)&&/\.pf-ink::before\{animation:pf-ink-in 260ms/.test(pfcss));
ok2('dropping a day runs the ink back, carrying its own fill',/@keyframes pf-ink-out\{from\{background:var\(--accent\)/.test(pfcss)&&/\.pf-ink-out::before\{animation:pf-ink-out 180ms/.test(pfcss));
ok2('reduced motion gets no flood',/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.pf-ink[^{]*\{animation:none\}\}/.test(pfcss.replace(/\n\s*/g,'')));
ok2('no page scopes its own box onto the step bar',!pfcss.split('}').some(r=>/\.pf-[a-z-]*page[^{]*\.pf-steps[^{]*\{/.test(r+'}')&&/(^|[;{])\s*(margin|padding)/.test(r.split('{')[1]||'')));
ok2('the day cell is taller than the 44 it was',/\.pf-dates-page \.pf-date-sheet \.pf-calendar \.pw-btn\{height:52px\}/.test(pfcss));
/* v4.6.82: EVERY MARK ON THE CALENDAR HAS A NAME UNDER IT. The ring drawn
   around the days the Edit draft covers had no key, so it read as an
   unexplained box next to days that looked the same otherwise. The key
   appears with the ring and leaves with it -- a legend for a mark that is
   not on screen is its own confusion. */
run(`window.__anchorWas=pfState().anchor.slice();pfState().anchor=[...pw().dates];pwRender();`);
test('selection and filled statuses have separate keys',`!document.querySelector('.pf-calendar .pf-editing')&&!!document.querySelector('.pf-key-selected')&&/Draft/.test(document.querySelector('.pf-calendar-key').textContent)&&/Saved plan/.test(document.querySelector('.pf-calendar-key').textContent)`);
run(`pfState().anchor=[];pwRender();`);
test('with nothing drafted the key drops the ring',`!document.querySelector('.pf-calendar .pf-editing')&&!document.querySelector('.pf-key-ring')&&/Saved plan/.test(document.querySelector('.pf-calendar-key').textContent)`);
run(`pfState().anchor=window.__anchorWas;pwRender();`);
test('calendar uses filled icons rather than dots or editing rings',`!document.querySelector('.pf-calendar .pf-plan-dot,.pf-calendar .pf-editing')&&document.querySelectorAll('.pf-calendar-key svg[fill="currentColor"]').length===2`);
test('returning to Dates retains completed steps',`!document.querySelector('[data-stage="2"]').disabled&&!document.querySelector('[data-stage="3"]').disabled`);
run(`pw().dates.push('2026-09-15');pwDay('2026-09-15');pwRender();`);
test('changing date selection disables later steps, retaining saved status icons',`document.querySelector('[data-stage="2"]').disabled&&document.querySelector('[data-stage="3"]').disabled&&document.querySelector('[data-date="2026-09-14"] .pf-status-icon')`);
run(`pw().dates=['2026-09-14'];pwRender();`);
test('restoring exact dates reenables stages',`!document.querySelector('[data-stage="3"]').disabled&&pwSetCount(pwDay('2026-09-14').rows)===5`);
test('saved calendar dates have filled status icons',`document.querySelector('[data-date="2026-09-14"] .pf-status-icon')`);
/* v4.6.157: Set target changes the routine LIVE (the maker's call, 2026-09-28);
   it used to hold a pending number that only Regenerate applied. */
run(`window.__rowsWas=JSON.stringify(pwDay(pw().active).rows);pfNavigate('edit');pfHandle('pf-plus',{dataset:{}});`);
test('Set target + changes the sets live: 5 -> 6, nothing pending (so Save is not held for Regenerate)',`!pfPending()&&pwSetCount(pwDay(pw().active).rows)===6&&!document.querySelector('.pf-changed')`);
run(`pfHandle('pf-minus',{dataset:{}});`);
test('- returns to the original routine exactly',`!pfPending()&&pwSetCount(pwDay(pw().active).rows)===5&&JSON.stringify(pwDay(pw().active).rows.map(r=>{const{added,...x}=r;return x;}))===window.__rowsWas`);
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
test('AI output cannot keep an avoided exercise: it comes out, the draft stays',`(()=>{DB.settings.plannerPreferences.avoid=['Squat'];const c={type:'generate',days:{'2026-09-15':{rows:pwRead('Squat\\n225 lb × 5 5 5\\nLeg Press\\n300 lb × 10 10 10'),notes:[]}}};pfValidateCandidate(c,['2026-09-15']);const r=c.days['2026-09-15'];DB.settings.plannerPreferences.avoid=[];return !r.rows.some(x=>x.ex==='Squat')&&r.rows.some(x=>x.ex==='Leg Press')&&r.notes.some(n=>/Removed Squat: on your avoid list/.test(n));})()`);
/* v4.6.147: a day outside the set range is fitted, not a reason to discard the whole draft */
run(`DB.settings.plannerPreferences={...pfPrefs(),mode:'sets',minSets:15,maxSets:25,avoid:[]};var big=pwRead('Squat\\n135 lb × 10 (warm-up)\\n225 lb × 8 8 8 8 8 8\\nLeg Press\\n300 lb × 10 10 10 10 10 10 10 10\\nLeg Extension\\n100 lb × 12 12 12 12 12 12\\nStanding Calf Raise\\n135 lb × 15 15 15 15 15 15 15 15');var cand={type:'generate',days:{'2026-09-29':{rows:big,notes:[]}}};var before=pwSetCount(big);pfValidateCandidate(cand,['2026-09-29']);`);
/* v4.6.196: no exercise keeps more than five working sets (or your usual, if more), which brings this day inside the range on its own */
test('29 sets with six and eight sets an exercise: each kept to five, 21 in all, not thrown away', `before===29&&pwSetCount(cand.days['2026-09-29'].rows)===21`);
test('...from the exercises with the most sets, warm-up kept, every exercise kept', `(()=>{const r=cand.days['2026-09-29'].rows;return r.filter(x=>x.ex).length===4&&/warm/.test(pwText(r))&&r.every(x=>!x.ex||x.lines.some(l=>l.reps.length));})()`);
test('...and the Checks say what moved', `cand.days['2026-09-29'].notes.some(n=>/^Leg Press: 8 working sets written, kept to 5\\.$/.test(n))`);
run(`var small=pwRead('Squat\\n225 lb × 5 5 5\\nLeg Press\\n300 lb × 10 10');var c2={type:'generate',days:{'2026-09-30':{rows:small,notes:[]}}};pfValidateCandidate(c2,['2026-09-30']);`);
test('5 sets against 15–25: sets added to the lightest exercises, up to 15', `pwSetCount(c2.days['2026-09-30'].rows)===15&&/215 lb × 8 8 8 8 8 8 8 8/.test(pwText(c2.days['2026-09-30'].rows))   /* v4.6.197: and Grow's floor: the 5s are 8s, at 215 -- the record is 8, 8 just under 225, so 225 for 8 is not in reach yet */`);
test('the writer is told the range in plain words', `/must total between 15 and 25 sets/.test(pwPayload(['2026-09-29'],'generate').note)`);
run(`var many=Array.from({length:30},(_,i)=>({kind:'ex',ex:'Lift '+i,lines:[{w:45,reps:[10]}]}));var c3={type:'generate',days:{'2026-10-01':{rows:many,notes:[]}}};var err3=null;try{pfValidateCandidate(c3,['2026-10-01']);}catch(e){err3=e.message;}`);
test('more exercises than the maximum: whole exercises come out, last first, and the plan is kept', `!err3&&pwSetCount(c3.days['2026-10-01'].rows)===25&&c3.days['2026-10-01'].notes.some(n=>n.includes('30 → 25 sets (removed '))`);
run(`DB.settings.plannerPreferences={...pfPrefs(),mode:'time',avoid:[]};`);
test('nothing usable back: says so, the draft stays',`(()=>{try{pfValidateCandidate({days:{}},['2026-09-15']);return false;}catch(e){return /did not return a usable plan/.test(e.message);}})()`);
test('an extra date is dropped, a missing one is listed, and the days that came back are kept',`(()=>{const c={type:'generate',days:{'2026-09-15':{rows:pwRead('Leg Press\\n300 lb × 10 10 10'),notes:[]},'2026-09-20':{rows:pwRead('Leg Press\\n300 lb × 10'),notes:[]}}};pfValidateCandidate(c,['2026-09-15','2026-09-16']);return Object.keys(c.days).join()==='2026-09-15'&&c.missing.join()==='2026-09-16';})()`);
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
 test('past dates have no plan markers while today keeps its marker',`!document.querySelector('[data-date="2026-09-11"] .pf-status-icon')&&document.querySelector('[data-date="2026-09-11"] small').textContent===''&&document.querySelector('[data-date="2026-09-13"] .pf-status-icon')`);
 run(`pw().dates=['2026-09-13','2026-09-15'];pfState().anchor=[];pfState().furthest=1;pwRender();`);
 test('saved selection enables Edit without enabling Done',`!document.querySelector('[data-stage="2"]').disabled&&document.querySelector('[data-stage="3"]').disabled`);
 run(`pfHandle('pf-stage',{dataset:{stage:'2'}});`);
 test('Edit loads all selected saved routines without generating',`pfState().page==='edit'&&document.querySelectorAll('.pf-strip .pf-chip').length===2&&pfMatch()&&pwSetCount(pwDay('2026-09-13').rows)===2&&pwSetCount(pwDay('2026-09-15').rows)===2`);
 /* v4.6.77: picking a day swaps the body under a strip that does not move.
    pfMotion left null is the assertion that matters: 'arrive' is the 360ms
    translate-and-fade of the whole workspace that made every tap bounce. */
 run(`pw().active='2026-09-13';pwRender();pfMotion=null;window.__strip=document.querySelector('.pf-strip');document.querySelector('.pf-strip .pf-chip[data-date="2026-09-15"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));`);
 test('picking a day swaps the routine in place: same strip node, no arrive motion, no navigation',`pw().active==='2026-09-15'&&pfState().page==='edit'&&pfMotion===null&&document.querySelector('.pf-strip')===window.__strip&&document.querySelector('.pf-chip.selected').dataset.date==='2026-09-15'&&document.querySelector('.pf-chip[data-date="2026-09-13"]').getAttribute('aria-selected')==='false'`);
 run(`window.__body=document.querySelector('.pf-day-body');document.querySelector('.pf-strip .pf-chip[data-date="2026-09-15"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));`);
 test('tapping the day you are already on changes nothing at all',`pw().active==='2026-09-15'&&document.querySelector('.pf-day-body')===window.__body`);
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
 /* v4.6.150: choose the day's body parts on the Edit page */
 run(`DB.settings.plannerPreferences={...pfPrefs(),mode:'sets',minSets:1,maxSets:100,avoid:[]};var BD='2026-10-06';if(!pw().dates.includes(BD))pw().dates.push(BD);pw().active=BD;var bd=pwDay(BD);bd.rows=pwRead('Dumbbell Shoulder Press\\n35 lb × 8 8 8\\nLateral Raise\\n15 lb × 15 15 15');bd.parts=pwParts(bd.rows);bd.locks=[];delete bd.partsPick;bd.target=null;pfNavigate('edit');`);
 test('the Edit page shows a Body parts row with the day\'s parts selected and nothing pending',`(()=>{const h=pfDayBodyHTML(),d=document.createElement('div');d.innerHTML=h;const on=[...d.querySelectorAll('[data-pw="pf-part"][aria-pressed="true"]')].map(x=>x.dataset.part);return /Body parts/.test(h)&&on.join()==='Shoulder'&&d.querySelectorAll('[data-pw="pf-part"]').length>=2&&!d.querySelector('.pf-target-pending');})()`);
 run(`pfHandle('pf-part',{dataset:{part:'Shoulder'}});pfHandle('pf-part',{dataset:{part:'Back'}});pfHandle('pf-part',{dataset:{part:'Biceps'}});`);
 test('tapping chips changes the choice, not the exercises',`pwDay(BD).parts.join()==='Back,Biceps'&&pwDay(BD).partsPick===true&&pwExercises(pwDay(BD).rows).length===2`);
 test('a different choice lights Regenerate and says what it will do',`(()=>{const d=document.createElement('div');d.innerHTML=pfDayBodyHTML();return !!d.querySelector('[data-pw="pf-regenerate"].pf-target-pending')&&/Back \\+ Biceps · Regenerate to rebuild this day/.test(d.querySelector('.pf-target-hint').textContent);})()`);
 test('the day tab shows the chosen part at once',`/<u>Back<\\/u>/.test(pfWeekStrip())`);
 test('the writer is asked for the chosen parts',`JSON.stringify(pwPayload([BD]).skeleton[0].due)==='["Back","Biceps"]'`);
 test('an exercise for a part you did not choose comes out of the writer\'s day',`(()=>{const c={type:'generate',days:{[BD]:{rows:pwRead('Lat Pulldown\\n120 lb × 10 10 10\\nLateral Raise\\n15 lb × 15 15\\nEZ Bar Curl\\n55 lb × 12 12 12'),notes:[]}}};pfValidateCandidate(c,[BD]);const r=c.days[BD];return r.rows.map(x=>x.ex).join()==='Lat Pulldown,EZ Bar Curl'&&r.notes.some(n=>/Removed Lateral Raise: not in Back \\+ Biceps/.test(n));})()`);
 test('...but an exercise you locked stays',`(()=>{pwDay(BD).locks=[1];const c={type:'generate',days:{[BD]:{rows:pwRead('Lat Pulldown\\n120 lb × 10 10 10\\nLateral Raise\\n15 lb × 15 15'),notes:[]}}};pfValidateCandidate(c,[BD]);pwDay(BD).locks=[];return c.days[BD].rows.some(x=>x.ex==='Lateral Raise');})()`);
 test('if nothing would be left, the writer\'s day is kept (fit, not reject)',`(()=>{const c={type:'generate',days:{[BD]:{rows:pwRead('Lateral Raise\\n15 lb × 15 15'),notes:[]}}};pfValidateCandidate(c,[BD]);return c.days[BD].rows.length===1&&c.days[BD].notes.some(n=>/did not write for Back \\+ Biceps/.test(n));})()`);
 test('with nothing chosen by you, the writer\'s parts are left alone',`(()=>{const b=pwDay(BD),keep=b.partsPick;delete b.partsPick;const c={type:'generate',days:{[BD]:{rows:pwRead('Lat Pulldown\\n120 lb × 10 10\\nLateral Raise\\n15 lb × 15 15'),notes:[]}}};pfValidateCandidate(c,[BD]);b.partsPick=keep;return c.days[BD].rows.length===2;})()`);
 test('parts and a new set target together: one Regenerate applies both',`(()=>{pwDay(BD).target=8;const c={type:'generate',days:{[BD]:{rows:pwRead('Lat Pulldown\\n120 lb × 10 10 10\\nEZ Bar Curl\\n55 lb × 12 12 12'),notes:[]}}};pfValidateCandidate(c,[BD]);pwDay(BD).target=null;return pwSetCount(c.days[BD].rows)===8&&c.days[BD].rows.length===2;})()`);
 run(`pfHandle('pf-part',{dataset:{part:'Back'}});pfHandle('pf-part',{dataset:{part:'Biceps'}});`);
 test('all chips off: the writer picks, and the line says so',`(()=>{const d=document.createElement('div');d.innerHTML=pfDayBodyHTML();return pwDay(BD).parts.length===0&&/No parts chosen: the writer picks/.test(d.querySelector('.pf-target-hint').textContent)&&pwPayload([BD]).skeleton[0].due.length>0;})()`);
 run(`pw().candidate={type:'generate',days:{[BD]:{rows:pwRead('Lat Pulldown\\n120 lb × 10 10'),notes:[]}}};pwApply();`);
 test('once the new day lands, the chips follow it and nothing is pending',`pwDay(BD).parts.join()==='Back'&&!pwDay(BD).partsPick&&!pfPartsPending(pwDay(BD))`);
 run(`DB.days={};SEED=deriveAll();`);

 console.log(checks+' planner journey checks passed');dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
