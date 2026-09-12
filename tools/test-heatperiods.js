/* test-heatperiods.js — v4.5.10, the sticky year/month rail on the streak cards.
 * The old rows (heatticks, heatyears) were painted per column, all caps, with
 * the year over its January -- off-screen from the first paint. The rail is the
 * .work-periods mechanism rebuilt against week-columns. These assertions read
 * the RENDERED rail on both cards, and one of them scrolls, because a rail that
 * never moves is the bug the mock shipped with.
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
    DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8,8,8],at:1}],upd:1};}
  SEED=deriveAll();view='stats';render();`);

const story=fs.readFileSync(path.join(dir,'js/stats-story.js'),'utf8');
const monthOf=iso=>new Date(iso+'T00:00').toLocaleDateString('en-US',{month:'short'});

// ---- the attendance card on Stats
ok('Stats draws the attendance card with one rail, a child of .heatframe, NOT inside .heatwrap -- inside, it scrolls away with the grid',
   run(`(function(){const f=document.querySelector('#view .crcard .heatframe');const r=f&&f.querySelectorAll('.heat-periods');
     return !!r&&r.length===1&&r[0].parentElement===f&&!r[0].closest('.heatwrap');})()`));
ok('...its year is bare, its month sentence case',
   run(`(function(){const r=document.querySelector('#view .crcard .heat-periods');const y=r.querySelector('.yr').textContent,m=r.querySelector('.mo').textContent;
     return /^\\d{4}$/.test(y)&&/^[A-Z][a-z]{2}$/.test(m);})()`), run(`document.querySelector('#view .crcard .heat-periods').textContent`));

// ---- the rest card on TODAY (test-rest's own fixture: a declared rest today)
run(`(function(){const D=n=>{const t=new Date(todayISO+'T00:00');t.setDate(t.getDate()-n);return t.toLocaleDateString('en-CA');};
  DB.days={};DB.plan=null;DB.week=null;for(let n=27;n>=1;n--){if(n%7===3)continue;DB.days[D(n)]={w:[{part:'Chest',ex:'Dip',w:40,bw:true,reps:[8],at:1}],upd:1};}
  DB.days[todayISO]={w:[],rest:1,upd:1};SEED=deriveAll();view='today';render();})()`);
ok('Today carries the rest card', run(`!!document.querySelector('#view .crcard.resting')`));
ok('...with exactly one rail, outside the scroller',
   run(`(function(){const f=document.querySelector('.crcard.resting .heatframe');const r=f.querySelectorAll('.heat-periods');return r.length===1&&r[0].parentElement===f&&!r[0].closest('.heatwrap');})()`));

// ---- what the rail says, on the rest card (the one with the extra wording risk)
const first=run(`document.querySelector('.crcard.resting .heatgrid .hc').getAttribute('aria-label').slice(0,10)`);
const yr=run(`document.querySelector('.crcard.resting .heat-periods .yr')?.textContent`);
const mo=run(`document.querySelector('.crcard.resting .heat-periods .mo')?.textContent`);
ok('the year is the first column\'s year, bare -- four digits and nothing else',
   yr===first.slice(0,4), JSON.stringify(yr)+' for column 0 = '+first);
ok('...no day count rides along with it', !/day/i.test(run(`document.querySelector('.crcard.resting .heat-periods').textContent`)));
ok('the month is the first column\'s month in sentence case, not the old all-caps tick',
   mo===monthOf(first)&&mo!==mo.toUpperCase(), JSON.stringify(mo));
ok('year sits on the top line and month 14px under it, the .work-periods stack',
   run(`(function(){const r=document.querySelector('.crcard.resting .heat-periods');return r.querySelector('.yr').style.top==='0px'&&r.querySelector('.mo').style.top==='14px';})()`));

// ---- and it MOVES. A rail that only paints once is the mock's bug.
{
  const cols=run(`[...document.querySelectorAll('.crcard.resting .heatgrid .hc')].filter((_,i)=>i%7===0).map(c=>c.getAttribute('aria-label').slice(0,10))`);
  const target=cols.findIndex(d=>d.slice(0,7)!==cols[0].slice(0,7));   // first column of the second month
  ok('(fixture) the grid spans more than one month', target>0, target+' columns into the second month');
  const after=run(`(function(){const w=document.querySelector('.crcard.resting .heatwrap');w.scrollLeft=${target}*15+1;w.dispatchEvent(new Event('scroll'));
     return document.querySelector('.crcard.resting .heat-periods .mo').textContent;})()`);
  ok('scrolling to the second month re-pins the month label to it',
     after===monthOf(cols[target])&&after!==mo, mo+' → '+after);
}

// ---- the rows the rail replaces are hidden, and the three numbers that keep the
//      weekday rail on the Monday row agree (rail height = grid offset = rail padding)
const px=re=>{const m=story.match(re);return m?parseFloat(m[1]):null;};
ok('the old month and year rows are hidden on the card, whichever view draws it',
   /\.crcard \.heatticks,\.crcard \.heatyears\{display:none\}/.test(story));
const railH=px(/\.heat-periods\{[^}]*?height:([\d.]+)px/),gridTop=px(/\.crcard \.heatgrid\{margin-top:([\d.]+)px/),wdTop=px(/\.crcard \.wdrail\{padding-top:([\d.]+)px/);
ok('rail height, grid offset and weekday-rail padding are one number',
   railH!==null&&railH===gridTop&&railH===wdTop, `${railH} / ${gridTop} / ${wdTop}`);
ok('no second rule in stats-story sets .wdrail padding-top',
   (story.match(/\.wdrail\{[^}]*padding-top/g)||[]).length===1);

// ---- v4.5.11: the three things the maker circled
const cssA=fs.readFileSync(path.join(dir,'css/app.css'),'utf8');

// (1) streak and best on two lines, on BOTH cards
run(`view='stats';render();`);
ok('the attendance card puts streak and best in two elements, not one nowrap string',
   run(`document.querySelectorAll('#view .crcard:not(.resting) .crstreak > span').length`)===2,
   run(`[...document.querySelectorAll('#view .crcard:not(.resting) .crstreak > span')].map(s=>s.textContent).join(' | ')`));
ok('...best is the SECOND one, so it lands on the lower line',
   /^best /.test(run(`document.querySelectorAll('#view .crcard:not(.resting) .crstreak > span')[1].textContent`)));
ok('...and the stacking rule is no longer scoped to .resting',
   /\.crcard \.crstreak\{[^}]*flex-direction:column/.test(cssA) && !/\.crcard\.resting \.crstreak\{[^}]*flex-direction:column/.test(cssA));

// (2) today's halo has a gutter to breathe into. The ring reaches inset:-3.5px,
//     so anything less than 3.5px of padding still clips it.
{
  const pad=story.match(/\.crcard \.heatgrid\{[^}]*padding:0 ([\d.]+)px ([\d.]+)px 0/);
  const peak=Math.abs(parseFloat((cssA.match(/60%\s*\{opacity:[\d.]+;\s*inset:(-[\d.]+)px/)||[])[1]));
  ok('(fixture) the halo peak is known from todbreath', !isNaN(peak), 'inset -'+peak+'px');
  ok('the grid reserves at least the halo peak on the right and the bottom',
     !!pad && parseFloat(pad[1])>=peak && parseFloat(pad[2])>=peak,
     pad?`right ${pad[1]}px, bottom ${pad[2]}px vs a ${peak}px halo`:'no padding rule');
  ok('...and the squares themselves did not move -- no left or top padding',
     !!pad && /padding:0 [\d.]+px [\d.]+px 0/.test(story));
}

// (3) no month label is left hanging off the rail's right edge.
//     jsdom has no layout, so a naive "does it fit" check waves itself through.
//     Geometry is stubbed AND the scroll is parked so the next month lands 10px
//     from the right edge with 21px of text to draw -- the exact situation that
//     cut "Sep" to "Se". Without the clamp this must overflow.
{
  const cols=run(`[...document.querySelectorAll('#view .crcard .heatgrid .hc')].filter((_,i)=>i%7===0).map(c=>c.getAttribute('aria-label').slice(0,10))`);
  const target=cols.findIndex(d=>d.slice(0,7)!==cols[0].slice(0,7));
  ok('(fixture) a second month exists to push against the edge', target>0, 'column '+target);
  const res=run(`(function(){
    const w=document.querySelector('#view .crcard .heatwrap'),r=document.querySelector('#view .crcard .heat-periods');
    const ROOM=200, CH=7, PITCH=15, MARGIN=10;
    Object.defineProperty(r,'clientWidth',{value:ROOM,configurable:true});
    Object.defineProperty(w,'clientWidth',{value:ROOM,configurable:true});
    Object.defineProperty(w,'scrollWidth',{value:5000,configurable:true});
    const orig=Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect=function(){
      if(this.classList&&(this.classList.contains('yr')||this.classList.contains('mo')))
        return {width:(this.textContent||'').length*CH,height:14,top:0,left:0,right:0,bottom:0};
      return orig.call(this);
    };
    w.scrollLeft=${target}*PITCH-(ROOM-MARGIN);          // next month lands at x = ROOM-10
    w.dispatchEvent(new Event('scroll'));
    const out=[...r.querySelectorAll('span')].map(s=>({t:s.textContent,l:parseFloat(s.style.left),w:s.textContent.length*CH}));
    Element.prototype.getBoundingClientRect=orig;
    return JSON.stringify({room:ROOM,all:out,over:out.filter(o=>o.l+o.w>ROOM+0.5).map(o=>o.t),neg:out.filter(o=>o.l<0).map(o=>o.t)});
  })()`);
  const g=JSON.parse(res);
  const incoming=g.all.filter(o=>o.l>g.room/2);
  ok('(fixture) a label really is pressed against the right edge', incoming.length>0,
     g.all.map(o=>o.t+'@'+o.l).join(' '));
  ok('every label ends inside the rail -- none is cut off mid-word', g.over.length===0,
     g.over.length?'overflowing: '+g.over.join(', '):'none overflow');
  ok('...and none was pushed off the left edge to achieve it', g.neg.length===0,
     g.neg.length?'negative left: '+g.neg.join(', '):'none negative');
}

console.log(fails?`FAIL ${fails}`:'ALL PASS');process.exit(fails?1:0);
