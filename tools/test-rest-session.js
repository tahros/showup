/* test-rest-session.js DIR — v4.6.138: the landscape rest timer's line counts
 * the workout you are in, not the day.
 * Real: every script in index.html order, tickRest, sessionRows, liveWorkoutSummary.
 * Faked: landscape and the clock's starting points.
 * The maker's report (2026-09-25): 15 sets, Complete pressed, two hours later one
 * EZ bar curl -> the timer read "16 sets · 3h in" while the live bar said 1 set. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const srcs=Object.fromEntries(order.map(s=>[s,fs.readFileSync(path.join(dir,s),'utf8')]));
async function boot(){
  const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=dom.window,ctx=dom.getInternalVMContext();
  w.localStorage.setItem('showup:planning-interface','previous');
  w.localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,unit:'lb'}}));
  w.fetch=()=>Promise.reject(new Error('offline'));
  w.matchMedia=q=>({matches:/landscape/.test(q),addEventListener(){},removeEventListener(){}});
  w.navigator.vibrate=()=>{};w.scrollTo=()=>{};
  w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
  for(const s of order) vm.runInContext(srcs[s],ctx,{filename:s});
  for(let i=0;i<60;i++) await new Promise(r=>setTimeout(r,0));
  return c=>vm.runInContext(c,ctx);
}
const SETUP=`const N=Date.now(),H=3600e3,t=day(todayISO);t.w=[];
  for(let i=0;i<15;i++)t.w.push({ex:'Squat',part:'Legs',w:100,reps:[5],at:N-3*H+i*4*60e3});`;
const READ=`tickRest();JSON.stringify({sub:document.querySelector('#hTimer .rt-sub')?.textContent||'',bar:liveWorkoutSummary().text})`;
(async()=>{
 { const run=await boot();
   const r=JSON.parse(run(`${SETUP}t.doneAll=true;t.doneEx=['Squat'];t.donePart=['Legs'];t.closed=[N-2*H];t.completedAt=N-2*H;
     t.w.push({ex:'EZ Bar Curl',part:'Biceps',w:30,reps:[12],at:N-60e3});t.doneAll=false;lastSetAt=N-60e3;${READ}`));
   ok("after Complete, a new set: the line counts the new workout only", /^1 set\s+·\s+1 min in$/.test(r.sub), r.sub);
   ok('and agrees with the live bar', /1 set/.test(r.bar), r.bar);
 }
 { const run=await boot();
   const r=JSON.parse(run(`${SETUP}t.w.push({ex:'EZ Bar Curl',part:'Biceps',w:30,reps:[12],at:N-60e3});lastSetAt=N-60e3;${READ}`));
   ok('no Complete, but a gap of two hours or more: a new workout too', /^1 set\s+·\s+1 min in$/.test(r.sub), r.sub);
 }
 { const run=await boot();
   const r=JSON.parse(run(`${SETUP}t.w.forEach((z,i)=>z.at=N-3*H+i*(3*H-60e3)/14);lastSetAt=N-60e3;${READ}`));
   ok('one unbroken workout: every set counts, from its first set', /^15 sets\s+·\s+3h in$/.test(r.sub), r.sub);
 }
 console.log(fails?`\n${fails} FAILED`:'\nall passed'); process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
