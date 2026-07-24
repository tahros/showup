const { JSDOM } = require("jsdom");
const fs=require("fs"), path=require("path"), vm=require("vm");
const dir=process.argv[2];
const html=fs.readFileSync(path.join(dir,"index.html"),"utf8");
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,""),{url:"https://tahros.github.io/showup/",runScripts:"outside-only",pretendToBeVisual:true});
const w=dom.window, ctx=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(new Error("offline"));
w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},removeEventListener(){}}));
w.navigator.vibrate=()=>{}; w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),"utf8"),ctx,{filename:s});
w.document.dispatchEvent(new w.Event("DOMContentLoaded",{bubbles:true}));
// 918 real-shaped days, the actual archive size
vm.runInContext(`
  const _t0=new Date(todayISO+'T00:00');
  for(let i=1;i<=918;i++){
    const d=new Date(_t0); d.setDate(d.getDate()-i);
    const iso=d.toLocaleDateString('en-CA');
    const w=[{part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30,30,30,30]},
             {part:'Shoulder',ex:'Dumbbell Side Raise',w:10,reps:[15,15]},
             {part:'Back',ex:'Pull Up',w:70,reps:[8,8]}];
    if(i%2===0) w.push({part:'Run',ex:'Run',w:3.4,mins:27,secs:0});
    DB.days[iso]={w,upd:1};
  }
  SEED=deriveAll(); _fireDist=null;
  const t=dayMeta(); t.w.push({part:'Shoulder',ex:'Dumbbell Press',w:16,reps:[30]});
  view='today';
`,ctx);
const time=(label,code,n)=>{const a=Date.now();for(let i=0;i<n;i++)vm.runInContext(code,ctx);const ms=(Date.now()-a)/n;console.log(label.padEnd(34), ms.toFixed(1)+" ms");return ms;};
time("allDays() alone","allDays();",5);
time("partSessions off a fresh allDays","partSessions('Shoulder',allDays());",5);
time("renderToday LIVE (part digest)","renderToday();",5);
vm.runInContext("dayMeta().doneAll=true;",ctx);
time("renderToday sealed (Daily Fire)","renderToday();",5);
