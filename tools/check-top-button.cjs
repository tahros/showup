/* check-top-button.cjs — v4.6.149: the "↑ top" button sits just above the tab bar.
 * Needs a local server on :8784 (python3 -m http.server 8784 from the repo) and
 * Chromium; PW_CHROME overrides the path below.
 * Found on the phone: mid-workout, scrolled down in Train, the button rose to the
 * top right beside the red header. It was measuring its height from the live
 * workout bar, which moved into the floating header. Checked with and without a
 * live workout, light and dark: its bottom edge is 12px above the tab bar's top,
 * and it does not overlap the header or the tab bar. */
const {chromium}=require('playwright'),assert=require('assert');
const EXE=process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
(async()=>{const b=await chromium.launch({executablePath:EXE});let n=0;
try{for(const theme of ['light','dark'])for(const live of [false,true]){
 const p=await b.newPage({viewport:{width:430,height:932},serviceWorkers:'block'});
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1200);
 await p.evaluate(([theme,live])=>{document.querySelector('#onb')?.remove();DB.settings.theme=theme;applyTheme();
  const N=Date.now();for(let i=1;i<40;i++){const d=new Date(N-i*864e5).toLocaleDateString('en-CA');DB.days[d]={w:[{part:'Run',ex:'Run',w:5,reps:[],mins:30,secs:0,at:N-i*864e5}],doneAll:true};}
  if(live)DB.days[todayISO]={w:[{part:'Run',ex:'Run',w:2.3,reps:[],mins:15,secs:0,at:N-60e3}]};
  SEED=deriveAll();view='lift';lift.part='Run';lift.ex='Run';render();},[theme,live]);
 await p.waitForTimeout(600);await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(500);
 const m=await p.evaluate(()=>{const r=e=>e&&e.getBoundingClientRect();const t=document.getElementById('calReturn');return {shown:t&&!t.hidden,top:r(t),nav:r(document.getElementById('nav')),hdr:r(document.querySelector('header')),live:!!document.getElementById('liveWorkoutBar')&&!document.getElementById('liveWorkoutBar').hidden};});
 assert(m.shown,'the button is shown when scrolled deep');
 assert.equal(m.live,live,'live workout state as set up');
 assert(Math.abs(m.nav.top-m.top.bottom-12)<=1,`12px above the tab bar (gap ${Math.round(m.nav.top-m.top.bottom)})`);
 assert(m.top.top>m.hdr.bottom,'below the header');
 console.log(`PASS ${theme}${live?', live workout':''}: 12px above the tab bar, clear of the header`);n++;
 await p.close();}
console.log(`\n${n} passed`);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
