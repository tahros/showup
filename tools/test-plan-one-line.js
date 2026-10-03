// v4.6.199: neighbouring plan lines at the same load print as one line.
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
run(`todayISO='2026-10-03';checkDate=()=>false;DB={days:{},settings:{unit:'lb',onboarded:true}};SEED=deriveAll();
var L=(w,reps,x)=>({w:w/2.20462,reps,...(x||{})});
var PLN={items:[
 {ex:'Deadlift',lines:[L(135,[8]),L(235,[3]),L(235,[3]),L(235,[3]),L(235,[3])]},
 {ex:'Bent-Over Row',lines:[L(155,[12]),L(155,[12]),L(155,[12,12])]},
 {ex:'Pull Up',lines:[L(25/1,[6],{bw:true}),L(25,[6],{bw:true}),L(25,[6],{bw:true}),L(25,[6],{bw:true})]},
 {ex:'Single-Arm Dumbbell Row',lines:[L(60,[8]),L(60,[8,8,8])]},
 {ex:'Plank',lines:[{w:0,bw:true,su:SET_SEC,reps:[60]},{w:0,bw:true,su:SET_SEC,reps:[60]}]}]};
var keep=JSON.stringify(PLN);document.body.insertAdjacentHTML('beforeend','<div id="t">'+planCardHTML(PLN,false)+'</div>');
var rowsOf=n=>{const b=[...document.querySelectorAll('#t .planrow')].find(x=>x.querySelector('.pn').textContent.startsWith(n));return [...b.querySelectorAll('.pv')].map((v,k)=>v.textContent+' × '+b.querySelectorAll('.pr')[k].textContent);};`);
test('four lines at 235 read as one: 235 lb × 3 3 3 3, under the 135 warm-up',`rowsOf('Deadlift').join('|')==='135 lb × 8|235 lb × 3 3 3 3'`);
test('155 × 12 / 12 / 12 12 is one line',`rowsOf('Bent-Over Row').join('|')==='155 lb × 12 12 12 12'`);
test('a belted bodyweight lift too',`rowsOf('Pull Up').join('|')==='BW+25 lb × 6 6 6 6'`);
test('60 × 8 / 8 8 8 is one line',`rowsOf('Single-Arm Dumbbell Row').join('|')==='60 lb × 8 8 8 8'`);
test('timed holds stay as written',`rowsOf('Plank').length===2`);
test('seven lines where there were sixteen',`document.querySelectorAll('#t .pv').length===7`);
test('the saved plan itself is untouched',`JSON.stringify(PLN)===keep`);
test('the reps column is sized for the merged line',`/--planr:11ch/.test(document.querySelector('#t .plancard').getAttribute('style'))`);
/* live card: each numeral dims from its own line's spend */
run(`DB.days[todayISO]={w:[{part:'Back',ex:'Bent-Over Row',w:155/2.20462,reps:[12,12],at:Date.now()}]};SEED=deriveAll();document.getElementById('t').innerHTML=planCardHTML(PLN,true);
var b=[...document.querySelectorAll('#t .planrow')].find(x=>x.querySelector('.pn').textContent.startsWith('Bent'));`);
test('on today’s card the sets already done dim, the rest do not, on the one line',`b.querySelectorAll('.pv').length===1&&b.querySelectorAll('.rp').length===4&&b.querySelectorAll('.rp.rspent').length===2`);
console.log(checks+' checks');process.exit(0);
