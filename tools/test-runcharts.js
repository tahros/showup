// test-runcharts.js DIR — Distance month axis, a nine-month Pace chart with
// direct labels and touch reading, and headroom in Every week.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail = 0;
const check = (name, expr, want) => {
  const got = run(expr), ok = String(got) === String(want);
  console.log((ok?"PASS":"FAIL"), name, "→", got);
  if (!ok) fail++;
};

(async () => {
await new Promise(r => setTimeout(r, 80));

// 14 months of timed runs, so both charts have more history than they show
run(`(function(){
  const y=+todayISO.slice(0,4);
  DB.days={}; DB.settings.canon={};
  for(let m=0;m<15;m++) for(let k=0;k<4;k++){
    const d=new Date(y,0,1); d.setMonth(d.getMonth()-14+m); d.setDate(3+k*7);
    const iso=d.toLocaleDateString('en-CA'); if(iso>todayISO) continue;
    DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:36+(m%4),secs:0}],upd:1};
  }
  migrateCanon(); SEED=deriveAll(); view='stats'; render();})()`);

// ---- 1. Distance: the month row exists again
// `+todayISO.slice(5)` parsed "08-14" as NaN, so the loop never ran once.
const monthLetters = `[...document.querySelectorAll('.runrace text')]
  .map(t=>t.textContent).filter(t=>/^[JFMAMJJASOND]$/.test(t)).join('')`;
check("the distance chart labels its months",
      `${monthLetters}.length > 0`, true);
check("...one per month elapsed this year, in order",
      `${monthLetters}`, run(`'JFMAMJJASOND'.slice(0,+todayISO.slice(5,7))`));
check("...and the parse that broke it is gone",
      `${!/\+todayISO\.slice\(5\)-1/.test(fs.readFileSync(path.join(dir,"js/lift.js"),"utf8"))}`, "true");
check("...with every label inside the viewBox",
      `(function(){const svg=document.querySelector('.runrace svg');
        const vb=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
        return [...svg.querySelectorAll('text')].every(t=>+t.getAttribute('y')<=vb[3]);})()`, true);

// ---- 2. Pace: nine months, every value above its point, mono-tone marks
check("pace shows nine months, not six",
      `document.querySelectorAll('.pacepoint').length`, 9);
check("...more months than the chart used to hold", `PACE_MONTHS > 6`, true);
check("every point prints a value inline",
      `document.querySelectorAll('.paceval').length === document.querySelectorAll('.pacepoint').length`, true);
check("every value sits centered directly above its own point",
      `(function(){const ps=[...document.querySelectorAll('.pacepoint')],vs=[...document.querySelectorAll('.paceval')];
        return ps.every((p,i)=>+vs[i].getAttribute('x')===+p.getAttribute('cx')
          && +vs[i].getAttribute('y')<+p.getAttribute('cy')
          && vs[i].getAttribute('text-anchor')==='middle');})()`, true);
check("all pace points use one blue mark colour, with no red exception",
      `[...document.querySelectorAll('.pacepoint')].every(p=>p.getAttribute('fill')==='var(--accent)')
       && ![...document.querySelectorAll('.pacepoint')].some(p=>p.classList.contains('fastest'))`, true);
check("the month row uses the same J F M A initials as the other charts",
      `(function(){const ps=[...document.querySelectorAll('.pacepoint')],ms=[...document.querySelectorAll('.pacemonth')];
        return ms.length===ps.length && ms.every((t,i)=>t.textContent==='JFMAMJJASOND'[+ps[i].dataset.pm.slice(5)-1]);})()`, true);
check("every point carries its month and pace for the readout",
      `[...document.querySelectorAll('.pacepoint')].every(p=>/^\\d{4}-\\d{2}$/.test(p.dataset.pm) && +p.dataset.pp>0)`, true);

// ---- the drag itself
check("the readout starts empty but holds its height",
      `document.querySelector('[data-pacecap]').textContent.trim()`, "");
check("the plot has a transparent backdrop, so gaps between points are live",
      `(function(){const r=document.querySelector('.pacepad');
        return !!r && +r.getAttribute('width')>0;})()`, true);
run(`(function(){
  const svg=document.querySelector('.pacescrub');
  svg.getBoundingClientRect=()=>({left:0,top:0,width:330,height:142,right:330,bottom:142});
  const ev=new window.Event('pointerdown',{bubbles:true});
  ev.clientX=0; ev.clientY=60; ev.isPrimary=true; ev.pointerId=1;
  svg.dispatchEvent(ev);})()`);
check("dragging names a month and its pace",
      `/[A-Z][a-z]{2} \\d{4}.*\\d+'\\d{2}"/.test(
        document.querySelector('[data-pacecap]').textContent.replace(/\\s+/g,' '))`, true);
check("...and rings the point it read",
      `document.querySelector('.pacehalo').getAttribute('opacity')`, 1);
check("...on the leftmost point, since the press was at the left edge",
      `(function(){const halo=document.querySelector('.pacehalo');
        const first=document.querySelector('.pacepoint');
        return halo.getAttribute('cx')===first.getAttribute('cx');})()`, true);
check("the readout matches that point's own data",
      `(function(){const halo=document.querySelector('.pacehalo');
        const p=[...document.querySelectorAll('.pacepoint')].find(x=>x.getAttribute('cx')===halo.getAttribute('cx'));
        return document.querySelector('[data-pacecap]').textContent.indexOf(paceStr(+p.dataset.pp))>-1;})()`, true);
check("the reading survives releasing the finger",
      `(function(){const svg=document.querySelector('.pacescrub');
        const up=new window.Event('pointerup',{bubbles:true}); up.pointerId=1;
        svg.dispatchEvent(up);
        return svg.querySelector('.pacehalo').getAttribute('opacity');})()`, 1);
check("the pace chart is on the tab-swipe blocklist",
      `${/closest\('\.pacescrub'\)/.test(fs.readFileSync(path.join(dir,"js/util.js"),"utf8"))}`, "true");

// ---- 3. Every week: the tallest bar's value clears the card caption
check("the tallest weekly value label sits clear of the year caption",
      `(function(){const svg=[...document.querySelectorAll('svg')]
          .find(s=>s.textContent.indexOf('THROUGH')>-1);
        if(!svg) return true;
        const cap=[...svg.querySelectorAll('text')].find(t=>/THROUGH/.test(t.textContent));
        const vals=[...svg.querySelectorAll('text')].filter(t=>/^\\d+$/.test(t.textContent));
        const highest=Math.min(...vals.map(t=>+t.getAttribute('y')));
        return highest - +cap.getAttribute('y') >= 12;})()`, true);
check("...and the chart still fits its viewBox",
      `(function(){const svg=[...document.querySelectorAll('svg')]
          .find(s=>s.textContent.indexOf('THROUGH')>-1);
        if(!svg) return true;
        const vb=svg.getAttribute('viewBox').split(/\\s+/).map(Number);
        return [...svg.querySelectorAll('text')].every(t=>+t.getAttribute('y')<=vb[3]);})()`, true);

process.exit(fail ? 1 : 0);
})();
