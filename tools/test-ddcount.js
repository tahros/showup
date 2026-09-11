/* test-ddcount.js — v4.3.5, the ceremony number counts up.
 * It was written finished, so the one number the whole screen is built around
 * simply appeared. Driven by opening the real overlay and watching the frames.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
function boot(reduced){
  const d=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),
    {url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
  const w=d.window,c=d.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
  w.matchMedia=q=>({matches:reduced&&/reduce/.test(String(q)),addEventListener(){}});
  w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
  w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
  /* hand-driven clock and frames, so the animation can be watched a step at a time */
  let t=0; const frames=[];
  w.performance.now=()=>t;
  w.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};
  for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
    vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),c,{filename:m[1]});
  const run=s=>vm.runInContext(s,c);
  run(`DB.settings.onboarded=true;DB.settings.mascotMotion='off';todayISO='2026-09-11';
    checkDate=()=>false;DB.days={};
    for(let i=0;i<40;i++){const d=new Date('2026-09-11T00:00');d.setDate(d.getDate()-i);
      DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:90,reps:[8],at:1}],upd:1};}
    SEED=deriveAll();`);
  run(`celebrateDayDone(true)`);
  const tick=ms=>{t+=ms;const q=frames.splice(0);q.forEach(fn=>fn(t));};
  const text=()=>run(`document.querySelector('.ddn')?document.querySelector('.ddn').textContent:''`);
  return {run,tick,text,frames};
}

// ---- motion allowed
{
  const a=boot(false);
  ok('the ceremony number declares a range to travel',
     a.run(`document.querySelector('.ddn').dataset.from`)==='0' &&
     a.run(`document.querySelector('.ddn').dataset.to`)==='40',
     a.run(`document.querySelector('.ddn').dataset.from`)+' → '+a.run(`document.querySelector('.ddn').dataset.to`));
  ok('...from ZERO, not from yesterday — 39 to 40 is one frame and says nothing',
     a.run(`document.querySelector('.ddn').dataset.from`)==='0');
  a.tick(0);
  const first=a.text();
  ok('the first frame is not the final number', first!=='40', first);
  a.tick(300); const mid=a.text();
  ok('...it climbs', +mid>+first && +mid<40, first+' → '+mid);
  a.tick(900); a.tick(200);
  ok('...and lands exactly on the total, not near it', a.text()==='40', a.text());
}
// ---- reduced motion
{
  const b=boot(true);
  ok('with reduced motion the number simply arrives whole', b.text()==='40', b.text());
  ok('...and asks for no frames at all', b.frames.length===0, String(b.frames.length));
}
// ---- and the dead call it replaces
{
  const src=fs.readFileSync(path.join(dir,'js/today.js'),'utf8');
  const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');
  const emitted=fs.readdirSync(path.join(dir,'js')).some(f=>/class="[^"]*\bdayn\b/.test(fs.readFileSync(path.join(dir,'js',f),'utf8')));
  ok('(noted) dayCountUp still targets .rhythm .big.dayn, which no markup emits',
     /\.rhythm \.big\.dayn/.test(src) && /\.rhythm \.big\.dayn/.test(css) && !emitted,
     emitted?'markup exists':'CSS only — the call is a no-op');
}
process.exit(fails?1:0);
