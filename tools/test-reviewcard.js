/* test-reviewcard.js — v4.5.4, the review card is the screen the maker uses.
 * Every fix in v4.5.3 was proved against stats.js while the review card quietly
 * overrode it in stats-story.js, so his screen never changed. These assertions
 * read the RENDERED card, which is the only place that can tell them apart.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};

run(`todayISO='2026-09-11';checkDate=()=>false;DB.settings.unit='lb';DB.settings.onboarded=true;DB.days={};
  for(let i=0;i<20;i++){const d=new Date('2026-09-11T00:00');d.setDate(d.getDate()-i);
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8,8,8],at:1},
      {part:'Chest',ex:'Barbell Bench Press',w:toKg(155),reps:[8,8],at:2}],upd:1};}
  SEED=deriveAll();view='stats';render();`);

// ---- the axis the maker actually sees
const ticks=JSON.parse(run(`JSON.stringify([...document.querySelectorAll('.pmixaxis text')].map(t=>t.textContent))`));
ok('the axis on screen starts at zero', ticks[0]==='0', ticks.join(' / '));
ok('...and every tick is a whole number, no decimal point',
   ticks.every(t=>!/\./.test(t)), ticks.join(' / '));
ok('...evenly stepped, so the gaps are readable',
   (function(){const v=ticks.map(t=>/k$/.test(t)?parseFloat(t)*1000:parseFloat(t.replace(/,/g,'')));
     const d=v[1]-v[0]; return v.every((x,i)=>i===0||Math.abs((x-v[i-1])-d)<1);})(), ticks.join(' / '));
ok('...in the same type as the legend beside it',
   [...new Set(JSON.parse(run(`JSON.stringify([...document.querySelectorAll('.pmixaxis text')].map(t=>t.getAttribute('font-size')+'/'+t.getAttribute('font-family')))`)))].join()==='11/var(--body)',
   run(`document.querySelector('.pmixaxis text').getAttribute('font-size')`));

// ---- and it is not a second copy of the rule
const story=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
ok('the review axis uses the SAME rounded max as the plot, not its own',
   /pmixNiceMax\(pmixMax\(partMix\(PMIX_DAYS/.test(story));
ok('...and follows PMIX_H rather than a hard-coded box',
   !/viewBox="0 0 42 164"/.test(story));

// ---- the legend stays on one line
ok('the review legend does not wrap', /#view\.review-stats \.pmixlgd\{[^}]*flex-wrap:nowrap/.test(story));
ok('...and scrolls instead', /#view\.review-stats \.pmixlgd\{[^}]*overflow-x:auto/.test(story));
ok('...with each entry held to its own width',
   /#view\.review-stats \.pmixlgd>span\{[^}]*flex:0 0 auto/.test(story));

// ---- the dates line up with the columns they name
const align=run(`(function(){
  const svg=document.querySelector('#pmixWrap svg'); if(!svg) return 'no svg';
  const cols=[...svg.querySelectorAll('.pmixcol')].map(c=>+c.getAttribute('x')+ (+c.getAttribute('width'))/2);
  const labs=[...svg.querySelectorAll('text')].filter(t=>/^\\d+\\/\\d+$/.test(t.textContent))
    .map(t=>+t.getAttribute('x'));
  if(cols.length!==labs.length) return 'count '+cols.length+' vs '+labs.length;
  const worst=Math.max(...cols.map((c,i)=>Math.abs(c-labs[i])));
  return worst<=2 ? 'ok' : 'drift '+worst.toFixed(1);})()`);
ok('every date sits under the column it names', align==='ok', align);

// ---- plates read as plates
ok('the gap between plates is wide enough to see',
   /height-Math\.min\(1\.1,height\*\.34\)/.test(story));
process.exit(fails?1:0);
