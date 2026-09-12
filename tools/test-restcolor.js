/* test-restcolor.js — v4.5.14.
 *  1. The rest card is GREEN, including after a visit to Stats. #view kept
 *     `stats-system` forever, and that rule set carries an ID, so it outranked
 *     .crcard.resting and the rest grid silently drew in the training blue.
 *  2. The green arrives rather than appearing, and honours reduced motion.
 *  3. The weekday sentence still comes from the data, but is not the same
 *     sentence for ever.
 */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined?' → '+g:''));if(!c)fails++;};
const css=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');

run(`todayISO='2026-09-12';checkDate=()=>false;DB.settings.unit='lb';DB.settings.onboarded=true;DB.days={};
 const D=n=>{const t=new Date(todayISO+'T00:00');t.setDate(t.getDate()-n);return t.toLocaleDateString('en-CA');};
 for(let n=400;n>=1;n--){ if(new Date(D(n)+'T00:00').getDay()===0) continue;
   DB.days[D(n)]={w:[{part:'Legs',ex:'Squat',w:100,reps:[8]}],upd:1}; }
 DB.days[todayISO]={w:[],rest:1,upd:1};SEED=deriveAll();`);

// ---- 1. the leak
{
  run(`view='today';render();`);
  ok('a clean Today carries no stats-only classes',
     run(`document.getElementById('view').className`).trim()==='',
     JSON.stringify(run(`document.getElementById('view').className`)));

  run(`view='stats';render();`);
  ok('(fixture) Stats really does put stats-system on #view',
     /stats-system/.test(run(`document.getElementById('view').className`)));

  run(`view='today';render();`);
  const after=run(`document.getElementById('view').className`);
  ok('THE BUG: returning to Today drops stats-system, so the rest green is not outranked',
     !/stats-system|review-stats/.test(after), JSON.stringify(after));
  ok('...and the rest card is still the resting one', run(`!!document.querySelector('#view .crcard.resting')`));

  // the override that used to win, and why it mattered
  const story=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
  ok('(fixture) the stats override really is ID-scoped, hence the specificity loss',
     /#view\.stats-system \.heatgrid \.hc\.on\{background-color:var\(--accent\)\}/.test(story));
  ok('the green rule exists for the rest grid and the number',
     /\.crcard\.resting \.heatgrid \.hc\.on\{background-color:var\(--rest\)\}/.test(css)&&
     /\.crcard\.resting \.crtotal b\{color:var\(--rest-ink\)\}/.test(css));

  // Train and History must not carry it either
  run(`view='lift';render();`);
  ok('...nor does Train inherit it', !/stats-system/.test(run(`document.getElementById('view').className`)));
  run(`view='history';render();`);
  ok('...nor History', !/stats-system/.test(run(`document.getElementById('view').className`)));
  run(`view='sync';render();`);
  ok('but Settings, which is styled by it on purpose, keeps it',
     /stats-system/.test(run(`document.getElementById('view').className`)));
}

// ---- 2. the arrival
{
  run(`view='today';render();`);
  ok('every lit rest cell carries its column, so the fill can stagger',
     run(`[...document.querySelectorAll('.crcard.resting .heatgrid .hc.on')].every(e=>/--c:\\d+/.test(e.getAttribute('style')||''))`),
     run(`document.querySelector('.crcard.resting .heatgrid .hc.on')?.getAttribute('style')`));
  ok('...and the column is the WEEK, not the day index',
     run(`(function(){const c=[...document.querySelectorAll('.crcard.resting .heatgrid .hc')].slice(0,15)
       .map(e=>+(e.getAttribute('style')||'').replace(/\\D/g,''));return c[0]===0&&c[6]===0&&c[7]===1&&c[13]===1&&c[14]===2;})()`));
  ok('the grid animates from the empty-cell colour to the rest green',
     /@keyframes restfill\{from\{background-color:var\(--surface2\)\}to\{background-color:var\(--rest\)\}\}/.test(css));
  ok('...the number travels too',
     /@keyframes restink\{from\{color:var\(--accent-ink\)\}to\{color:var\(--rest-ink\)\}\}/.test(css));
  ok('...staggered across the week and capped so a long grid still finishes',
     /animation-delay:calc\(min\(var\(--c,0\),\d+\) \* \d+ms\)/.test(css));
  ok('...and it holds still when motion is unwelcome',
     /@media \(prefers-reduced-motion:reduce\)\{\s*\.crcard\.resting \.heatgrid \.hc\.on,\.crcard\.resting \.crtotal b\{animation:none\}\}/.test(css));
}

// ---- 3. the sentence
{
  const line=()=>run(`document.querySelector('.restweek .rwline')?.textContent`);
  const seen=new Set();
  for(const d of ['2026-09-12','2026-09-13','2026-09-14','2026-09-15','2026-09-16','2026-09-17','2026-09-18','2026-09-19','2026-09-20','2026-09-21']){
    run(`todayISO='${d}';DB.days['${d}']={w:[],rest:1,upd:1};SEED=deriveAll();view='today';render();`);
    const l=line(); if(l) seen.add(l);
  }
  ok('the weekday sentence is not the same string for ever', seen.size>1,
     [...seen].join(' / '));
  ok('...and every wording names the day the data actually found',
     [...seen].every(l=>/Sunday/.test(l)), [...seen].join(' / '));
  ok('...none of them praises, scores or sets a target',
     [...seen].every(l=>!/good|great|well done|keep|should|goal|target|streak|best/i.test(l)));

  // same day, same sentence -- twice in a row, and after a re-render
  run(`todayISO='2026-09-12';DB.days['2026-09-12']={w:[],rest:1,upd:1};SEED=deriveAll();view='today';render();`);
  const a=line();run(`render();`);const b=line();
  ok('the same day gives the same sentence, so it cannot flicker on re-render', a===b, JSON.stringify(a));
}

console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
