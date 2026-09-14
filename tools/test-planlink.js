// Stage 1 synthetic-only tests. No credentials, network or user records.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:false,addEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);
let checks=0;
function test(name,code){assert(run(code),name);console.log('PASS '+name);checks++;}
run(`DB={days:{},settings:{unit:'lb',name:'Sungjee',sex:'M',onboarded:true}};
todayISO='2026-09-13';checkDate=()=>false;
lift={part:'Legs',ex:'Squat',weight:60};
var doc={items:[{ex:'Squat',lines:[{w:60,reps:[8],qual:'warm-up'},{w:100,reps:[8,8]}]},{ex:'Plank',lines:[{w:0,bw:true,su:'s',reps:[60]}]}]};
DB.plan={d:todayISO,...plCopy(doc)}; var profile=JSON.stringify(DB.settings);plCapture();
var first=plCurrent(todayISO),before=JSON.stringify(first);`);
test('save captures an immutable revision without creating workout records',`first.id&&first.targets.length===4&&Object.keys(DB.days).length===0`);
test('targets have unique stable IDs and canonical exercise IDs',`new Set(first.targets.map(t=>t.id)).size===4&&first.targets[0].exerciseId&&first.targets[0].qualifier==='warm-up'`);
run('plCapture();');
test('unchanged saves do not mint revisions',`Object.keys(DB.planTracking.revisions).length===1`);
run(`var old={part:'Legs',ex:'Squat',w:60,reps:[8],at:1};DB.days[todayISO]={w:[old]};
var oldJSON=JSON.stringify(old);var a=plLog({part:'Legs',ex:'Squat',w:55,reps:[6],at:2});`);
test('past sets stay unlinked and byte-for-byte intact',`JSON.stringify(old)===oldJSON&&!old.setId&&!old.planRef`);
test('different actual load and reps retain the original target',`a.planRef.target.w===60&&a.planRef.target.reps===8&&a.w===55&&a.reps[0]===6&&a.setId`);
test('rendering comparison is read-only',`(()=>{const s=JSON.stringify(DB);plHTML('Squat');return s===JSON.stringify(DB);})()`);
run(`DB.plan.items[0].lines[1].w=110;plCapture();var second=plCurrent(todayISO);
var b=plLog({part:'Legs',ex:'Squat',w:95,reps:[7],at:3});`);
test('mid-workout editing preserves started plan and original revisions',`first.id!==second.id&&second.parentId===first.id&&JSON.stringify(DB.planTracking.revisions[first.id])===before&&b.planRef.target.w===100&&b.planRef.revisionId===first.id`);
run(`var c=plChoice('Squat');lift.linkChoice={key:c.key,slot:-1};
var extra=plLog({part:'Legs',ex:'Squat',w:50,reps:[12],at:4});`);
test('extra set is explicit and does not consume a target',`!extra.planRef&&extra.planLinkStatus==='unplanned'&&plChoice('Squat').target.ordinal===3`);
run(`DB.days[todayISO].w=DB.days[todayISO].w.filter(s=>s!==b);`);
test('deleting a logged set releases its target',`plChoice('Squat').target.ordinal===2`);
run(`DB.days[todayISO].w.push(b);`);
test('undo restores original identity and linkage',`plChoice('Squat').target.ordinal===3&&DB.days[todayISO].w.at(-1).setId===b.setId`);
run(`DB.plan=null;plCapture();`);
test('clearing a plan cannot erase started targets or history',`plBasis(todayISO).id===first.id&&Object.keys(DB.planTracking.revisions).length===2&&plChoice('Squat').target.ordinal===3`);
run(`var held=plLog({part:'Sixpack',ex:'Plank',w:0,reps:[45],su:'s',at:5});`);
test('holds retain seconds and actual duration',`held.planRef.target.su==='s'&&held.planRef.target.reps===60&&held.reps[0]===45`);
test('rep and hold targets cannot cross-match',`plChoice('Plank','').target===null`);
run(`var current=JSON.parse(JSON.stringify(DB)),remote=plCopy(current);
delete remote.days[todayISO].planBasis;remote.days[todayISO].w.forEach(s=>{delete s.planRef;delete s.setId;delete s.planLinkStatus;});
plMergeDayMetadata(remote.days[todayISO],current.days[todayISO]);`);
test('legacy round-trip retains linkage without duplicating facts',`remote.days[todayISO].w.length===current.days[todayISO].w.length&&remote.days[todayISO].w[1].setId===a.setId&&sig(remote.days[todayISO].w[1])===sig(a)&&remote.days[todayISO].planBasis.revision.id===first.id`);
run(`var full=plCopy(DB);DB.planTracking={v:1,revisions:{},heads:{}};plMerge(full);plMerge(full);`);
test('revision union is idempotent',`Object.keys(DB.planTracking.revisions).length===2`);
test('profile was not touched',`DB.settings.name==='Sungjee'&&DB.settings.sex==='M'`);
run(`todayISO='2026-09-14';lift.linkChoice=null;var noPlan=plLog({part:'Legs',ex:'Squat',w:50,reps:[8],at:6});
DB.plan={d:todayISO,...plCopy(doc)};plCapture();var later=plLog({part:'Legs',ex:'Squat',w:60,reps:[8],at:7});`);
test('a plan added after logging does not backfill or relabel a workout',`!noPlan.planRef&&!later.planRef&&DB.days[todayISO].planBasis.revision===null`);
run(`todayISO='2026-09-15';DB.plan={d:todayISO,...plCopy(doc)};plCapture();lift={ex:'Squat',part:'Legs'};
var q=plChoice('Squat');lift.linkChoice={key:q.key,slot:3};var chosen=plLog({part:'Legs',ex:'Squat',w:100,reps:[5],at:8});`);
test('explicit selection supports out-of-order sets',`chosen.planRef.target.ordinal===3&&plChoice('Squat').target.ordinal===1`);
test('lb/kg display changes never modify stored targets',`(()=>{const s=JSON.stringify(plBasis(todayISO));DB.settings.unit='kg';plHTML('Squat');return JSON.stringify(plBasis(todayISO))===s;})()`);
test('warm-up labels survive real parser conversion',`planItemsFrom(parsePlan('Squat\\n  135 lb × 8 (warm-up)')).items[0].lines[0].qual==='warm-up'`);
run(`DB.days={};DB.planTracking=null;DB.plan=null;DB.week=null;
todayISO='2026-09-16';lift={ex:'Squat',part:'Legs',weight:0};view='lift';DB.settings.unit='lb';SEED=deriveAll();
planSave([{ex:'Squat',lines:[{w:60,reps:[8],qual:'warm-up'},{w:100,reps:[8,8]}]}],'','',todayISO);render();`);
test('new plan renders individual targets with details collapsed',`document.querySelectorAll('.pl-result').length===3&&!document.querySelector('.pl-details').open`);
run(`document.querySelector('[data-link-slot="3"]').click();`);
test('target selection loads the logger without logging',`lift.weight===100&&day(todayISO).w.length===0&&plChoice('Squat').target.ordinal===3`);
run(`document.getElementById('wv').value='210';repRulerTo(6,false);document.getElementById('addrep').click();`);
test('real Add set handler stores chosen target and actual result',`day(todayISO).w[0].planRef.target.ordinal===3&&day(todayISO).w[0].reps[0]===6&&Math.abs(toU(day(todayISO).w[0].w)-210)<0.01`);
test('result row preserves both numbers and disables reusing the target',`document.querySelector('[data-link-slot="3"]').disabled&&document.querySelector('[data-link-slot="3"]').textContent.includes('210')`);
run(`document.querySelector('[data-link-slot="-1"]').click();document.getElementById('addrep').click();`);
test('Extra set button logs without consuming target',`!day(todayISO).w[1].planRef&&plChoice('Squat').target.ordinal===1`);
run(`planSave([{ex:'Squat',lines:[{w:120,reps:[10]}]}],'','',todayISO);render();`);
test('mid-session revision explains why started targets stay',`document.querySelectorAll('.pl-result').length===3&&document.querySelector('.plan-link').textContent.includes('Plan edited since you started')`);
run(`var edit=day(todayISO).w[0],originalId=edit.setId,originalRef=JSON.stringify(edit.planRef);edit.reps=[5,4,3];plSplitEditedSet(day(todayISO),edit);`);
test('multi-set edit preserves original identity and gives extras distinct IDs',`edit.setId===originalId&&JSON.stringify(edit.planRef)===originalRef&&edit.reps.length===1&&new Set(day(todayISO).w.map(s=>s.setId)).size===day(todayISO).w.length`);
run(`var moved=plMovedSet(edit,'Romanian Deadlift','Legs');`);
test('moving an exercise preserves identity but detaches the incompatible target',`moved.setId===edit.setId&&!moved.planRef&&moved.previousPlanRef.setId===edit.planRef.setId&&edit.planRef`);
(async()=>{
  run(`DB.settings.demo=false;session={access_token:'test',refresh_token:'test',expires_at:Date.now()+600000,user:{id:'test-only'}};pulledOK=true;`);
  let sent;w.fetch=async(url,opt)=>{sent=JSON.parse(opt.body);return {ok:true,json:async()=>({})};};
  assert(await run('cloudPushNow()'));
  assert(sent.doc.planTracking.revisions[run('plBasis(todayISO).id')]);
  assert(sent.doc.days[run('todayISO')].w[0].planRef.setId);
  console.log('PASS real cloud push includes revisions, workout basis and actual-set links');checks++;
  const remote=JSON.parse(JSON.stringify(sent.doc));
  run(`DB.planTracking=null;freshToken=async()=>'test-only';`);
  w.fetch=async()=>({ok:true,json:async()=>[{doc:remote}]});
  await run('cloudPull()');
  test('real cloud pull restores revision archive and preserves profile',`Object.keys(DB.planTracking.revisions).length>0&&DB.settings.name==='Sungjee'&&DB.settings.sex==='M'`);

  /* v4.6.10: logging today moves the review to today -- but only on the day's
     FIRST set, and only if the card was parked on another day. Browsing back
     mid-session has to keep sticking, or the fix trades one annoyance for a
     worse one. */
  /* stats-story keeps reviewSelected inside an IIFE, so the test watches the EVENT
     that carries the fact across, and the day the review layer resolves to. */
  run(`window.__firstSet=[];document.addEventListener('showup:first-set',e=>window.__firstSet.push(e.detail.date));
       DB.days['2026-09-11']={w:[{part:'Legs',ex:'Squat',w:100,reps:[8],at:1,setId:'x1'}],upd:1};
       delete DB.days[todayISO];`);
  run(`plLog({part:'Legs',ex:'Squat',w:100,reps:[8],at:Date.now()});`);
  test("today's FIRST set announces itself",`window.__firstSet.length===1&&window.__firstSet[0]===todayISO`);
  run(`plLog({part:'Legs',ex:'Squat',w:100,reps:[8],at:Date.now()+1});`);
  test('...and a later set does not, so a day you opened on purpose keeps sticking',
       `window.__firstSet.length===1`);
  run(`delete DB.days[todayISO];window.__firstSet=[];plLog({part:'Run',ex:'Run',w:5,reps:[],mins:27,at:Date.now()});`);
  test('...a run counts as the first set too -- it is still the day starting',
       `window.__firstSet.length===1`);
  /* storyWorkoutDate lives in the same IIFE and is deliberately not reachable.
     What is assertable from here is the wiring: the listener exists and clears the
     stale selection. The resolved day is covered by the browser suite. */
  {
    const story=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
    assert(/addEventListener\('showup:first-set'/.test(story),'stats-story listens for the first set');
    console.log('PASS stats-story listens for the first set');checks++;
    assert(/reviewSelected=null;/.test(story),'...and clears the stale selection rather than forcing a date');
    console.log('PASS ...and clears the stale selection rather than forcing a date');checks++;
  }

  console.log(checks+' linkage checks passed');dom.window.close();process.exit(0);
})().catch(e=>{console.error(e);dom.window.close();process.exit(1)});
