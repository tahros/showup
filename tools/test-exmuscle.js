// v4.6.188: an exercise's muscle is yours to set (setExMuscle), stored on its
// canon entry by id. Covers: the store, a rename keeping it, a bad muscle being
// ignored, the default a new exercise starts on, a built-in mapping overruled,
// the writer's muscle map and the planner's swaps following it, and the log
// left untouched.
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
run(`todayISO='2026-10-01';checkDate=()=>false;
DB={days:{},settings:{unit:'lb',onboarded:true,custom:{'High Cable Press':{part:'Chest',equip:'cable'}}}};
var mkS=(d,part,ex,lb,reps)=>{(DB.days[d]=DB.days[d]||{w:[]}).w.push({part,ex,w:lb/2.20462,reps,at:Date.parse(d+'T18:00')});};
mkS('2026-09-28','Chest','Dip',45,[8,8,8]);mkS('2026-09-28','Chest','High Cable Press',30,[12,12]);mkS('2026-09-24','Chest','Incline Barbell Bench Press',175,[8,8,8]);
migrateCanon();SEED=deriveAll();var logB=JSON.stringify(DB.days);`);
test('an exercise you created starts on its body part’s default',`exMuscle('High Cable Press','Chest')==='chest'`);
test('setting its muscle stores it on the canon entry, by id',`setExMuscle('High Cable Press','lower-chest')===canonId('High Cable Press')&&canon()[canonId('High Cable Press')].m==='lower-chest'&&exMuscle('High Cable Press','Chest')==='lower-chest'`);
test('a rename keeps it (same id)',`(()=>{const c=canon()[canonId('High Cable Press')],old=c.name;c.name='HCP';c.al=[old];const ok=exMuscle('HCP','Chest')==='lower-chest'&&exMuscle('High Cable Press','Chest')==='lower-chest';c.name=old;c.al=[];return ok;})()`);
test('a muscle the app does not know is ignored',`setExMuscle('High Cable Press','forearms')===null&&exMuscle('High Cable Press','Chest')==='lower-chest'`);
test('a built-in mapping can be overruled, and put back',`exMuscle('Dip','Chest')==='lower-chest'&&!!setExMuscle('Dip','chest')&&exMuscle('Dip','Chest')==='chest'&&!!setExMuscle('Dip','lower-chest')&&exMuscle('Dip','Chest')==='lower-chest'`);
test('a new exercise starts on the muscle asked for when it belongs to the part, else the part’s first',`exMuscleDefault('Chest','lower-chest')==='lower-chest'&&exMuscleDefault('Chest',['abs','chest'])==='chest'&&exMuscleDefault('Chest',null)==='upper-chest'&&exMuscleDefault('Chest','abs')==='upper-chest'&&exMuscleDefault('Legs',[])==='quads'`);
test('the writer’s muscle map follows',`writerPayload({scope:'day',days:new Set(['2026-10-02']),rewrite:true,focus:[],objective:'grow',note:'',part:'Chest'}).heads.Chest['lower-chest'].includes('High Cable Press')`);
test('the planner’s swap for an avoided lower-chest lift offers it',`(()=>{setExPref('Dip','avoid');const b={rows:pwRead('Dip\\n  BW × 8 8 8'),parts:['Chest'],locks:[]};const o=pfSwapOptions(b,b.rows[0]);setExPref('Dip',null);return o.includes('High Cable Press');})()`);
test('no logged set is edited',`JSON.stringify(DB.days)===logB`);
console.log(checks+' checks');process.exit(0);
