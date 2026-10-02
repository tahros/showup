// v4.6.192: a weight on a bodyweight exercise in a plan is weight ADDED to the
// body. The writer wrote "Dip / 50 lb x 10 10 10 10" and the plan showed "50 lb"
// under a last time of "BW+45 lb". Covers: reading (paste, saved plan), the
// writer's rows on apply, the text a plan saves as, the label on the Edit page,
// and what is left alone (by feel, already-BW, holds, non-bodyweight lifts).
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
run(`todayISO='2026-10-01';checkDate=()=>false;localStorage.setItem('showup:planner-flow','flow');
DB={days:{},settings:{unit:'lb',onboarded:true,planningWorkspace:true}};
(DB.days['2026-09-05']={w:[]}).w.push({part:'Chest',ex:'Dip',w:45/2.20462,bw:true,reps:[8,10,6],at:Date.parse('2026-09-05T18:00')});
migrateCanon();SEED=deriveAll();
var R=pwRead('Dip\\n  50 lb × 10 10 10 10\\n\\nPull Up\\n  BW × 8 8\\n\\nHanging Leg Raise\\n  by feel × 12 12\\n\\nBarbell Bench Press\\n  135 lb × 7 6 5\\n\\nPlank\\n  BW × 60 sec × 2');`);
test('Dip is a bodyweight exercise here, Barbell Bench Press is not',`isBody('Dip')&&!isBody('Barbell Bench Press')`);
test('a plain weight on Dip is read as added weight',`R[0].lines[0].bw===true&&R[0].lines[0].w===50&&!R[0].lines[0].nw`);
test('...and the Edit page says BW+50 lb',`pfLoadText(R[0].lines[0])==='BW+50 lb'`);
test('...and the plan is saved as BW +50 lb',`/Dip\\n  BW \\+50 lb × 10 10 10 10/.test(pwText(R))`);
test('a line already BW stays BW',`pfLoadText(R[1].lines[0])==='BW'`);
test('a by-feel line stays by feel',`R[2].lines[0].nw&&!R[2].lines[0].bw&&pfLoadText(R[2].lines[0])==='By feel'`);
test('a barbell lift is untouched',`!R[3].lines[0].bw&&pfLoadText(R[3].lines[0])==='135 lb'`);
test('a timed hold keeps its seconds',`/Plank\\n  BW × 60 sec × 2/.test(pwText(R))`);
test('reading it back changes nothing more',`pwText(pwRead(pwText(R)))===pwText(R)`);
run(`pwOpen('2026-10-03');var S=pw();S.dates=['2026-10-03'];S.active='2026-10-03';
S.candidate={type:'generate',days:{'2026-10-03':{rows:parsePlan('Dip\\n  50 lb × 10 10 10 10\\n\\nBarbell Bench Press\\n  135 lb × 7 6 5'),notes:[]}}};pwApply();var B=pwDay('2026-10-03');`);
test('the writer’s rows are fixed when its answer is applied',`B.rows[0].ex==='Dip'&&B.rows[0].lines[0].bw===true&&B.rows[0].lines[0].w===50&&!B.rows[1].lines[0].bw`);
run(`pfState().page='edit';S.step='edit';pwRender();var H=document.getElementById('view').innerHTML;`);
test('the Edit page shows BW+50 lb for Dip, with last time BW+45 lb under it',`/BW\\+50 lb/.test(document.querySelector('[data-pw-row="0"]').textContent.replace(/\\s+/g,' '))&&/BW\\+45 lb/.test(document.querySelector('[data-pw-row="0"]').textContent.replace(/\\s+/g,' '))`);
run(`B.rows[0].lines[0].bw=false;`);
test('a draft kept from before the fix is put right when the day is opened',`pwDay('2026-10-03').rows[0].lines[0].bw===true`);
console.log(checks+' checks');process.exit(0);
