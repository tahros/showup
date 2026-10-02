// v4.6.173: your verdict on an exercise (DB.settings.exPref), keyed by id.
// The maker hates Romanian Deadlift and Calf Raises and had no way to say so.
// Covers: the store (by id, alias-safe, neutral = no entry), the one-time move
// of the planner's avoid list, the planner's own picks (avoided skipped, liked
// first), the writer's menu (avoided off it, the muscle still covered), the
// legacy list still honoured, and the log left untouched.
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

/* a Legs history: the maker's lifts, including the two he hates */
run(`todayISO='2026-10-01';checkDate=()=>false;
DB={days:{},settings:{unit:'lb',onboarded:true,plannerPreferences:{frequency:5,mode:'time',minutes:45,minSets:20,maxSets:25,emphasis:{},avoid:['Standing Calf Raise'],split:'auto'}}};
var mk=(d,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part:'Legs',ex,w:lb/2.20462,reps,at:Date.parse(d+'T18:00')});};
mk('2026-09-20','Romanian Deadlift',185,[8,8,8]);mk('2026-09-22','Lying Leg Curl',90,[12,12,12]);
mk('2026-09-24','Standing Calf Raise',45,[12,12,12]);mk('2026-09-26','Leg Extension',110,[12,12,12]);
mk('2026-09-28','Squat',245,[6,6,6,6]);
var logBefore=JSON.stringify(DB.days);
migrateCanon();migrateAvoidToPrefs();SEED=deriveAll();`);

test('the planner avoid list moves into verdicts, by id',`exPref('Standing Calf Raise')==='avoid'&&DB.settings.exPref['standing-calf-raise'].v==='avoid'&&DB.settings.exPrefFrom===1`);
test('...once: removing it later is not undone by the migration',`(()=>{setExPref('Standing Calf Raise',null);migrateAvoidToPrefs();const ok=exPref('Standing Calf Raise')===null;setExPref('Standing Calf Raise','avoid');return ok;})()`);
run(`setExPref('Romanian Deadlift','avoid');`);
test('an avoid is stored by id with its time',`DB.settings.exPref['romanian-deadlift'].v==='avoid'&&DB.settings.exPref['romanian-deadlift'].at>0`);
test('Include is the absence of an entry',`exPref('Squat')===null&&!('squat' in DB.settings.exPref)&&!isAvoided('Squat')`);
test('there is no "like" any more: it is not stored, and a v4.6.173 one is cleared on load',`(()=>{setExPref('Leg Extension','like');const a=!('leg-extension' in DB.settings.exPref);DB.settings.exPref['leg-extension']={v:'like',at:1};migrateAvoidToPrefs();return a&&!('leg-extension' in DB.settings.exPref)&&exPref('Leg Extension')===null;})()`);
test('a rename keeps the avoid (same id)',`(()=>{const c=DB.settings.canon['romanian-deadlift'];const old=c.name;c.name='RDL';c.al=[old];const ok=isAvoided('RDL')&&isAvoided('Romanian Deadlift');c.name=old;c.al=[];return ok;})()`);
test('avoiding does not touch the log',`JSON.stringify(Object.fromEntries(Object.entries(DB.days).map(([d,v])=>[d,{...v,w:v.w.map(s=>{const {cid,...r}=s;return r;})}])))===logBefore`);

/* the planner's own picks: Set target + and Add candidates */
run(`var cday={rows:pwRead('Squat\\n  245 lb × 6 6 6 6'),parts:['Legs']};var cands=pwAddCandidates(cday);`);
test('what the app adds on its own skips what you avoid',`!cands.includes('Romanian Deadlift')&&!cands.includes('Standing Calf Raise')&&cands.includes('Lying Leg Curl')`);

/* Claude: told, not just kept in the dark */
run(`var pay;try{pay=writerPayload({});}catch(e){pay={err:e.message};}`);
test('the writer payload builds',`!pay.err&&!!pay.catalog`);
test('the avoid list goes to Claude by name, with part and muscle',`(()=>{const a=pay.avoid||[],r=a.find(x=>x.exercise==='Romanian Deadlift'),c=a.find(x=>x.exercise==='Standing Calf Raise');return !!r&&r.part==='Legs'&&r.muscle==='hamstrings'&&!!c&&c.muscle==='calves';})()`);
test('...and they are off the menu too',`!pay.catalog.Legs.includes('Romanian Deadlift')&&!pay.catalog.Legs.includes('Standing Calf Raise')`);
test('...the muscle map still offers the hamstrings a lift (leg curls)',`(pay.heads.Legs.hamstrings||[]).includes('Lying Leg Curl')&&!(pay.heads.Legs.hamstrings||[]).includes('Romanian Deadlift')`);
test('your past Romanian Deadlift sets still count toward hamstring coverage',`pay.coverage.Legs.hamstrings>=6`);
test('...and still reach Claude in the history (an honest record)',`pay.history.some(h=>h[2]==='Romanian Deadlift')`);
run(`var chk,chkErr;try{chk=writerCheck({days:[{date:pay.days[0],part:'Legs',title:'Legs',text:'Squat\\n  245 lb × 6 6 6 6\\nRomanian Deadlift\\n  185 lb × 8 8 8\\nLying Leg Curl\\n  90 lb × 12 12 12'}],reason:{head:'Legs',text:'Legs are due.'}},{payload:pay});}catch(e){chkErr=e;}`);
test('an avoided exercise in Claude\'s answer is removed on the device, and named',`(()=>{if(chkErr)return false;const d=(chk.days||chk.out||[])[0]||chk.sessions?.[0];const txt=JSON.stringify(chk);return !/"ex":"Romanian Deadlift"/.test(JSON.stringify(d||chk))&&/Romanian Deadlift: you avoid it/.test(txt)&&/Lying Leg Curl/.test(txt);})()`);
test('the server rule is in Claude\'s instructions and its request',`/AVOIDED EXERCISES: payload\\.avoid/.test(SRV)&&/payload\\.avoid \\|\\| \\[\\]/.test(SRV)`);

/* planning preferences read and write the same list */
test('Planning preferences list the avoided exercises',`(()=>{const p=pfPrefs();return p.avoid.includes('Romanian Deadlift')&&p.avoid.includes('Standing Calf Raise')&&!('like' in p);})()`);
test('...a device on an older version writing the legacy list still counts',`(()=>{DB.settings.plannerPreferences.avoid=['Leg Press'];const p=pfPrefs();const ok=p.avoid.includes('Leg Press')&&p.avoid.includes('Romanian Deadlift')&&writerAvoids('Leg Press');DB.settings.plannerPreferences.avoid=[];return ok;})()`);
test('a plan row you avoid comes out of a generated day; the rest stays',`(()=>{const c={type:'generate',days:{'2026-10-02':{rows:pwRead('Romanian Deadlift\\n185 lb × 8 8 8\\nLying Leg Curl\\n90 lb × 12 12 12'),notes:[]}}};try{pfValidateCandidate(c,['2026-10-02']);}catch(e){}const rows=c.days['2026-10-02'].rows.map(r=>r.ex);return !rows.includes('Romanian Deadlift')&&rows.includes('Lying Leg Curl');})()`);

/* a saved plan: the row is flagged, the swap is offered, nothing moves alone */
run(`var D='2026-10-02';pwOpen(D);var ps=pw();ps.dates=[D];var pd=pwDay(D);
pd.rows=pwRead('Squat\\n  245 lb × 6 6 6 6\\nRomanian Deadlift\\n  185 lb × 8 8 8\\nStanding Calf Raise\\n  45 lb × 12 12 12');pd.parts=['Legs'];pd.locks=[];ps.active=D;ps.step='edit';pfState().page='edit';
var before=pwText(pd.rows);var html=pfEditRows();`);
test('an avoided row in a saved plan is flagged, not changed',`/xp-avoided/.test(html)&&/Replace it on (Thursday|Friday)/.test(html)&&/xp-avtag/.test(html)&&pwText(pd.rows)===before`);
test('swaps: a done lift first, then the day\'s own body part (Seated Leg Curl before Deadlift)',`pfSwapOptions(pd,pd.rows[1]).join()==='Lying Leg Curl,Seated Leg Curl'`);
test('Remove from this day is always offered',`(html.match(/data-pw="pf-remove-ex"/g)||[]).length>=2&&/No hamstrings on (Thursday|Friday)|covers? hamstrings/.test(html)`);
test('calves: the only other calf lift is new to you',`pfSwapOptions(pd,pd.rows[2]).join()==='Seated Calf Raise'&&/New to you · starts by feel/.test(html)`);
run(`pfRoutineHandle('pf-xp-swap',{dataset:{index:'1',ex:'Lying Leg Curl'}},pd,pfState());`);
test('Swap puts in your last Lying Leg Curl sets; the rest of the day stays',`pd.rows[1].ex==='Lying Leg Curl'&&/90 lb × 12 12 12/.test(pwText([pd.rows[1]]))&&pd.rows[0].ex==='Squat'&&pd.rows[2].ex==='Standing Calf Raise'`);
test('...and says what it replaced, with Undo',`/swapped from Romanian Deadlift/.test(pfEditRows())&&/pf-xp-undo/.test(pfEditRows())`);
run(`pfRoutineHandle('pf-xp-undo',{dataset:{index:'1'}},pd,pfState());`);
test('Undo brings the original row back exactly',`pwText(pd.rows)===before`);
run(`pfRoutineHandle('pf-xp-swap',{dataset:{index:'2',ex:'Seated Calf Raise'}},pd,pfState());`);
test('a lift you have not done starts by feel, same sets and reps',`pd.rows[2].ex==='Seated Calf Raise'&&/by feel × 12 12 12/.test(pwText([pd.rows[2]]))`);

/* Settings and Train */
run(`view='sync';render();`);
test('Settings lists only avoided exercises, each with Include',`(()=>{const t=document.getElementById('view').textContent;return /Avoided exercises/.test(t)&&/Romanian Deadlift/.test(t)&&/Standing Calf Raise/.test(t)&&document.querySelectorAll('[data-xp-include]').length===2&&!/Leg Extension/.test(document.querySelector('.xp-list').textContent);})()`);
run(`document.querySelector('[data-xp-include="Standing Calf Raise"]').click();`);
test('...Include brings it back and the row leaves the list',`!isAvoided('Standing Calf Raise')&&document.querySelectorAll('[data-xp-include]').length===1`);
run(`setExPref('Standing Calf Raise','avoid');view='lift';lift={part:'Legs',ex:null};render();`);
test('Train: avoided exercises leave Go-to and wait at the bottom, tagged',`(()=>{const hs=[...document.querySelectorAll('#view h2')],last=hs[hs.length-1];const goto=document.querySelector('#view .gotohead');const tagged=[...document.querySelectorAll('#view .xp-tag')].length;return last&&last.textContent==='Avoided'&&tagged===2&&!/Romanian Deadlift/.test((goto&&goto.nextElementSibling||{}).textContent||'');})()`);
run(`lift={part:'Legs',ex:'Romanian Deadlift',weight:84};render();`);
test('the exercise screen says Avoided, with Include, and logging is untouched',`!!document.querySelector('#view .xp-banner')&&document.querySelector('[data-expref="avoid"]').getAttribute('aria-pressed')==='true'&&!!document.querySelector('#view .zone')`);
run(`document.querySelector('.xp-banner [data-expref="include"]').click();`);
test('...Include there clears it',`!isAvoided('Romanian Deadlift')&&!document.querySelector('#view .xp-banner')`);
run(`document.querySelector('[data-expref="avoid"]').click();`);
test('...and Avoid sets it again',`isAvoided('Romanian Deadlift')&&!!document.querySelector('#view .xp-banner')`);
console.log(checks+' exercise-preference checks passed');dom.window.close();process.exit(0);
