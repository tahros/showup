/* test-trial-count.js DIR -- v4.6.392: the 20 free days are days logged in ShowUppp.
 * An import (each set it brings carries imp) used to use up the free days before a set was
 * logged here. A day counts when at least one of its sets was logged in the app. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8'),order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx);
run(`DB={days:{},settings:{onboarded:true,unit:'lb'},plan:null,week:null};todayISO='2026-10-22';
  for(let i=1;i<=100;i++)DB.days[rtAddDays(todayISO,-i)]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[5],at:1,imp:'imp-1'}]};SEED=deriveAll();`);
ok('a hundred imported days use none of the free days', run('trialDays()')===0);
run(`DB.days[todayISO]={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[5],at:2}]};DB.days[rtAddDays(todayISO,-1)].w.push({part:'Back',ex:'Lat Pulldown',w:50,reps:[10],at:3});`);
ok('a day logged here counts, also when it shares a date with imported sets', run('trialDays()')===2);
run(`DB.days[rtAddDays(todayISO,-2)]={w:[]};`);ok('an empty day does not count', run('trialDays()')===2);
run(`DB.settings.demo=true;`);ok('sample data counts nothing', run('trialDays()')===0);
run(`delete DB.settings.demo;`);ok('every trained day still counts for medals and the club card', run('loggedDays()')===100);
console.log(fails?`\n${fails} FAILING`:'\nALL PASS');process.exit(fails?1:0);
