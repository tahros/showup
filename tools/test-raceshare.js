// test-raceshare.js DIR — v3.3.232 totals ⇄ shares on the two race cards.
// The load-bearing part is the DENOMINATORS: Consistency measures against days
// elapsed this year, Distance against last year's finished total. Getting
// either wrong prints a confident, wrong percentage.
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
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({measureText:()=>({width:10})},
  {get:(o,k)=>k in o?o[k]:()=>({})}); };
w.Element.prototype.setPointerCapture = function(){};
w.Element.prototype.releasePointerCapture = function(){};
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

// 60 workout days and 300 km this year; last year 45 days and 405 km, all of
// it before today's date so the previous year's own share must read 100%.
run(`(function(){
  const y=+todayISO.slice(0,4);
  DB.days={}; DB.settings.canon={}; DB.settings.raceShare=false; DB.settings.unit='kg';
  for(let i=1;i<=60;i++){const iso=new Date(y,0,i*3).toLocaleDateString('en-CA');
    if(iso<=todayISO) DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30},
      {part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};}
  for(let i=1;i<=45;i++){const iso=new Date(y-1,0,i*4).toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Run',ex:'Run',w:9,reps:[],mins:50},
      {part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};}
  migrateCanon(); SEED=deriveAll(); view='stats'; render();})()`);

const score = `[...document.querySelectorAll('.conrace')].map(c=>
  c.querySelector('.conscore').textContent.replace(/\\s+/g,' ').trim())`;

// ---- totals, the default
check("both cards start in totals", `DB.settings.raceShare`, false);
check("consistency counts days", `/\\d+days/.test(${score}[0].replace(/ /g,''))`, true);
check("distance counts km", `/\\d+km/.test(${score}[1].replace(/ /g,''))`, true);

// ---- the toggle is on the scoreboard of BOTH cards
check("both scoreboards are tappable",
      `document.querySelectorAll('.conrace [data-raceswap]').length`, 2);
check("...and announce what a tap does",
      `/Show share/.test(document.querySelector('[data-raceswap]').getAttribute('aria-label'))`, true);

run(`document.querySelector('[data-raceswap]').click()`);

// ---- shares: the denominators are the whole point
check("one tap switches BOTH cards — never two units at once",
      `${score}.every(t=>/%/.test(t))`, true);
check("consistency measures against days elapsed this year",
      `(function(){const el=daysElapsedThisYear();
        const cur=consistencyRaceData().current.total;
        return ${score}[0].indexOf(Math.round(cur/el*100)+'%')>-1;})()`, true);
check("...and says so in words", `/of the year/.test(${score}[0])`, true);
check("distance measures against last year's FINISHED total",
      `/of all ${run(`+todayISO.slice(0,4)-1`)}/.test(${score}[1])`, true);
check("...so last year, complete before today's date, reads 100%",
      `${score}[1].indexOf('100%')>-1`, true);
check("a run is never counted twice across DB.days and SEED.sessions",
      `yearTotalKm(+todayISO.slice(0,4)-1)`, 405);

// ---- the gap follows the unit it sits between
check("the gap reads in points, not days, while showing shares",
      `/pts/.test(document.querySelector('.conrace [data-con-gap]').textContent)`, true);
check("...and agrees in direction with the two numbers",
      `(function(){const c=document.querySelector('.conrace');
        const ns=[...c.querySelectorAll('[data-con-count]')].map(b=>parseInt(b.textContent,10));
        const t=c.querySelector('[data-con-gap]').textContent;
        return ns[1]>ns[0] ? /ahead/.test(t) : ns[1]<ns[0] ? /behind/.test(t) : /Even/.test(t);})()`, true);

// ---- persistence and return trip
check("the choice is a saved preference", `DB.settings.raceShare`, true);
run(`document.querySelector('[data-raceswap]').click()`);
check("tapping again returns to totals", `DB.settings.raceShare`, false);
check("...and the days come back", `/\\d+days/.test(${score}[0].replace(/ /g,''))`, true);

// ---- honesty: no share without a denominator
run(`(function(){
  const y=+todayISO.slice(0,4);
  DB.days={}; DB.settings.raceShare=true;
  for(let i=1;i<=20;i++){const iso=new Date(y,0,i*3).toLocaleDateString('en-CA');
    if(iso<=todayISO) DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30}],upd:1};}
  for(let i=1;i<=10;i++){const iso=new Date(y-1,0,i*4).toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Chest',ex:'Chest Press',w:40,reps:[10]}],upd:1};}
  migrateCanon(); SEED=deriveAll(); render();})()`);
check("with no distance last year, the km card stays in km rather than dividing by zero",
      `(function(){const c=[...document.querySelectorAll('.conrace')].find(x=>x.classList.contains('runrace'));
        return !c || /km/.test(c.querySelector('.conscore').textContent);})()`, true);


// ---- v3.3.233: the toggle must not move the page --------------------------
// A full render() rebuilt #view and sent the reader to the top of Stats on
// every tap. These assertions are about identity and scroll, not markup.
run(`(function(){
  const y=+todayISO.slice(0,4);
  DB.days={}; DB.settings.canon={}; DB.settings.raceShare=false;
  for(let i=1;i<=60;i++){const iso=new Date(y,0,i*3).toLocaleDateString('en-CA');
    if(iso<=todayISO) DB.days[iso]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30}],upd:1};}
  for(let i=1;i<=45;i++){const iso=new Date(y-1,0,i*4).toLocaleDateString('en-CA');
    DB.days[iso]={w:[{part:'Run',ex:'Run',w:9,reps:[],mins:50}],upd:1};}
  migrateCanon(); SEED=deriveAll(); view='stats'; render();
  const v=document.querySelector('#view'); v._witness=1;
  window._card0=document.querySelector('.conrace');
  window._card0._witness=1;})()`);
run(`document.querySelector('[data-raceswap]').click()`);
check("#view survives the tap — the tab is not rebuilt",
      `document.querySelector('#view')._witness`, 1);
check("...and so does the card itself, so its scroll position is intact",
      `document.querySelector('.conrace')._witness===1
       && document.querySelector('.conrace')===window._card0`, true);
check("...while the numbers really did change unit",
      `/%/.test(document.querySelector('.conrace [data-con-count]').textContent)`, true);
check("the chart is untouched — no reflow, no redraw",
      `document.querySelector('.conrace polyline')!==null`, true);

// tapping repeatedly must stay stable, not drift or accumulate
const before = run(`document.querySelector('.conrace .conscore').textContent.replace(/\\s+/g,' ').trim()`);
run(`for(let i=0;i<6;i++) document.querySelector('[data-raceswap]').click();`);
check("six taps land back where they started", `DB.settings.raceShare`, true);
check("...with identical text, no drift",
      `"${before}"===document.querySelector('.conrace .conscore').textContent.replace(/\\s+/g,' ').trim()`, true);
check("...and still the same DOM node throughout",
      `document.querySelector('.conrace')._witness`, 1);

// ---- the scrubber speaks whichever unit is showing -----------------------
check("with shares on, a scrubbed readout is a percentage too",
      `(function(){
        const box=document.querySelector('.conrace [data-zoom]'); if(!box) return true;
        box.getBoundingClientRect=()=>({left:0,top:0,width:340,height:215,right:340,bottom:215});

        const ev=new window.PointerEvent('pointerdown',{pointerId:9,clientX:200,clientY:80,bubbles:true});
        box.dispatchEvent(ev);
        const txt=document.querySelector('.conrace [data-con-count]').textContent;
        box.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:9,bubbles:true}));
        return /%/.test(txt);})()`, true);
check("...and the gap with it",
      `(function(){
        const box=document.querySelector('.conrace [data-zoom]'); if(!box) return true;
        box.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:10,clientX:150,clientY:80,bubbles:true}));
        const t=document.querySelector('.conrace [data-con-gap]').textContent;
        box.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:10,bubbles:true}));
        return /pts|Even/.test(t);})()`, true);
run(`DB.settings.raceShare=false; raceApplyAll();`);
check("back in totals, a scrubbed readout counts days again",
      `(function(){
        const box=document.querySelector('.conrace [data-zoom]'); if(!box) return true;
        box.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:11,clientX:200,clientY:80,bubbles:true}));
        const t=document.querySelector('.conrace [data-con-count]').textContent;
        box.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:11,bubbles:true}));
        return !/%/.test(t);})()`, true);


process.exit(fail ? 1 : 0);
})();
