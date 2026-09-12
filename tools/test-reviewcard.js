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
ok('the rendered SVG height is not overridden by a shorter CSS box',
   !/work-history :is\(\.pmixaxis,\.pmixwrap>svg\)\{height:\d+px!important\}/.test(story));

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

// ---- v4.5.5: the dates are VISIBLE, not merely present
/* v4.5.4 asserted the dates lined up with their columns and passed -- while
   every one of them carried visibility:hidden. The sync that hides labels
   outside the scroll window ran before the wrap had a width, so all of them
   failed the test, and nothing re-ran it. Present is not visible. */
const vis=JSON.parse(run(`JSON.stringify([...document.querySelectorAll('#pmixWrap svg text')]
  .filter(t=>/^\\d+\\/\\d+$/.test(t.textContent)).map(t=>getComputedStyle(t).visibility))`));
ok('the dates are visible on a fresh paint', vis.length>0 && vis.every(v=>v!=='hidden'),
   vis.length+' labels, '+vis.filter(v=>v==='hidden').length+' hidden');
ok('...and the hide-outside-window rule never runs against a zero width',
   /if\(wrap\.clientWidth>0\) wrap\.querySelectorAll\('svg>text'\)/.test(story));

// ---- the period rail: three-letter months, in the axis's own type
const periods=JSON.parse(run(`JSON.stringify([...document.querySelectorAll('.work-periods span')].map(s=>s.textContent))`));
ok('the month above the chart is three letters', periods.some(p=>/^[A-Z][a-z]{2}$/.test(p)), periods.join(' · '));
ok('...never the long name', !periods.some(p=>/^(January|February|March|April|June|July|August|September|October|November|December)$/.test(p)), periods.join(' · '));
ok('...in the same size and face as the axis', /work-periods span\{[^}]*font:400 11px\/14px var\(--body\)/.test(story));

// ---- no empty band under the caption
const bankH=run(`(function(){const b=document.querySelector('.work-hero .plate-bank');return b?getComputedStyle(b).height:'none'})()`);
ok('an empty bank takes no height under the caption', bankH==='0px'||bankH==='none', bankH);

// ---- v4.5.6: no band of empty card under the caption
/* the hero's height was fixed at 328.5px when the legend and bank still sat
   under the caption. Both are hidden on this view and the replay button moved
   into the heading, so 68px of the card held nothing.
   jsdom has no layout engine, so a computed height here is null and comparing
   it proves nothing -- the first cut of this assertion "passed" on null. The
   stylesheet is the thing that can actually be checked: the card's own height
   must not exceed the heights it declares for its parts. */
{
  const px=re=>{const m=story.match(re);return m?parseFloat(m[1]):null;};
  const card   =px(/\.work-hero\{(?:[^}]*?;)?height:([\d.]+)px/);
  const minCard=px(/\.work-hero\{[^}]*?min-height:([\d.]+)px/);
  const heading=px(/\.work-hero \.plate-heading\{(?:[^}]*?;)?height:([\d.]+)px/);
  const scene  =px(/\.work-hero \.plate-scene\{(?:[^}]*?;)?height:([\d.]+)px/);
  const total  =px(/\.work-hero \.plate-total\{(?:[^}]*?;)?height:([\d.]+)px/);
  const caption=px(/\.work-hero \.plate-caption\{(?:[^}]*?;)?height:([\d.]+)px/);
  /* v4.5.7: padding counts. The caption carries equal padding above and below
     so the gaps around "18 sets · 6 exercises" match; a sum that ignored it
     would report the card as taller than its contents and be wrong. */
  const capPT=px(/\.work-hero \.plate-caption\{(?:[^}]*?;)?padding-top:([\d.]+)px/);
  const capPB=px(/\.work-hero \.plate-caption\{(?:[^}]*?;)?padding-bottom:([\d.]+)px/);
  ok('the space above and below the sets line is the same',
     capPT!==null && capPT===capPB, `${capPT}px above, ${capPB}px below`);
  ok('the sets line has the approved extra breathing room',
     capPT>=12, `${capPT}px above and below`);
  /* v4.5.8: the check above only reads ONE rule's own padding-top/bottom and
     was true both before and after a stray `.plate-caption{margin-top:10px}`
     in a different style block doubled the space above -- one scoped rule
     being internally symmetric proves nothing about what else targets the
     same class from outside that scope. This sums top vs bottom spacing
     across EVERY rule block anywhere in the file whose selector contains
     .plate-caption, so a leftover rule in another block is not invisible. */
  {
    let top=0,bottom=0;
    for(const m of story.matchAll(/([^{}]*\.plate-caption[^{}]*)\{([^}]*)\}/g)){
      const body=m[2];
      const val=prop=>{const mm=body.match(new RegExp(prop+':([\\d.]+)px'));return mm?parseFloat(mm[1]):0;};
      top+=val('margin-top')+val('padding-top');
      bottom+=val('margin-bottom')+val('padding-bottom');
    }
    ok('...and no OTHER rule anywhere adds to one side but not the other',
       top===bottom, `${top}px total above, ${bottom}px total below (summed across every .plate-caption rule)`);
  }
  ok('...and nothing else adds slack between them',
     px(/\.work-hero \.plate-total\{(?:[^}]*?;)?height:([\d.]+)px/)===
     px(/\.work-hero \.plate-total b\{font-size:([\d.]+)px/),
     'total box '+total+'px around a '+px(/\.work-hero \.plate-total b\{font-size:([\d.]+)px/)+'px numeral');
  const parts=[heading,scene,total,caption,capPT,capPB];
  ok('(fixture) the card declares a height for each of its parts',
     parts.every(v=>v!==null), JSON.stringify({heading,scene,total,caption}));
  const sum=parts.reduce((a,b)=>a+(b||0),0);
  ok('the card is not pinned taller than its own parts',
     card===null, card===null?'no fixed height, min-height '+minCard+'px':'pinned to '+card+'px');
  ok('...and the floor it does set matches what is in it',
     minCard!==null && Math.abs(minCard-sum)<=2, `min-height ${minCard}px vs parts ${sum}px`);
  /* the legend and bank are hidden here, so they must not be counted in */
  ok('...counting only the parts this view actually shows',
     /#view\.stats-system \.work-hero \.plate-legend\{display:none\}/.test(story) &&
     /\.work-hero \.plate-bank:empty\{display:none;height:0\}/.test(story));
}

// ---- v4.5.7: a plate too thin to see is not a plate
/* the plot is squashed to about 0.6, so a 3-unit step reaches the screen as
   1.8px and the v4.5.4 gap took most of what was left. On the maker's record
   that was ~0.8px of colour per plate and he reported the chart as having no
   bars. He was right. Below a legible size the segment is left whole. */
ok('a segment too thin to split is left whole rather than shredded',
   /const onScreen=step\*squash;/.test(story) && /if\(onScreen<3\)\{[^}]*return;\}/.test(story));
{
  /* driven: a record whose plate unit is tiny against the axis top */
  run(`DB.days={};
    for(let i=1;i<120;i++){const d=new Date(todayISO+'T00:00');d.setDate(d.getDate()-i);
      DB.days[d.toLocaleDateString('en-CA')]={w:[
        {part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8,8,8,8],at:1},
        {part:'Back',ex:'Deadlift',w:toKg(215),reps:[8,8,8,8],at:2}],upd:1};}
    SEED=deriveAll();PMIX_MODE='weight';render();`);
  const tall=run(`(function(){
    const els=[...document.querySelectorAll('#pmixWrap svg .pmixplate')];
    if(!els.length) return 'no bars at all';
    const squash=Math.round(Math.max(PMIX_BASE+16,Math.round(PMIX_H*0.9))*0.52)/(PMIX_BASE-PMIX_TOP);
    const thin=els.filter(e=>(+e.getAttribute('height'))*squash<1.5).length;
    return thin===0 ? 'ok' : thin+' of '+els.length+' under 1.5px';})()`);
  ok('THE BARS ARE VISIBLE on a record with a small plate unit', tall==='ok', tall);
}

// ---- plates read as plates
ok('the gap between plates is wide enough to see',
   /height-Math\.min\(1\.1,height\*\.34\)/.test(story));
process.exit(fails?1:0);
