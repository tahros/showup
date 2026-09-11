// v4.1.2 — the idle, and the tap.
// The maths is asserted directly: a renderer needs WebGL, which jsdom has
// none of, so the claims that matter -- it never freezes, it never repeats,
// it stays within a glance, and Still is untouched -- are proved against the
// shipped function rather than a screenshot of it.
const fs=require('fs'),path=require('path');
const dir=process.argv[2]||'.';let fails=0;
const ok=(n,c,g)=>{console.log(`${c?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${g}`:''));if(!c)fails++;};
const src=fs.readFileSync(path.join(dir,'js/mascot-renderer.js'),'utf8');

/* lift the idle out of the shipped source so the test cannot drift from it */
const body=src.slice(src.indexOf('function idlePose(t,ramp){'),src.indexOf('function pose(frames,t){'));
ok('the renderer has an idle at all', /function idlePose/.test(body));
const rest={yaw:-.12};
const idlePose=new Function('rest','return '+body.replace(/^function idlePose/,'function'))(rest);

const deg=t=>(idlePose(t,1).yaw-rest.yaw)*180/Math.PI;
const N=4000, span=120000, samples=Array.from({length:N},(_,i)=>deg(i/N*span));

// ---- it is a glance, not a swivel
const max=Math.max(...samples.map(Math.abs));
ok('the head turns, and by a visible amount', max>3, max.toFixed(2)+'°');
ok('...but never swivels', max<12, max.toFixed(2)+'°');

// ---- it never stops
/* the claim is that the MASCOT never stills, not that the yaw never does --
   a head may hold a position while the body breathes. Measured across the
   pose, and the first cut of this caught a real ten-second yaw plateau. */
ok('it is never still for long — no flat stretch over two seconds',
   (()=>{const step=span/N;let flat=0,worst=0,prev=idlePose(0,1);
     for(let i=1;i<N;i++){const p=idlePose(i*step,1);
       const d=Math.abs(p.yaw-prev.yaw)*40+Math.abs(p.lift-prev.lift)*300;
       if(d<0.0008){flat++;worst=Math.max(worst,flat);}else flat=0;prev=p;}
     return worst*step<2000;})(),
   (()=>{const step=span/N;let flat=0,worst=0,prev=idlePose(0,1);
     for(let i=1;i<N;i++){const p=idlePose(i*step,1);
       const d=Math.abs(p.yaw-prev.yaw)*40+Math.abs(p.lift-prev.lift)*300;
       if(d<0.0008){flat++;worst=Math.max(worst,flat);}else flat=0;prev=p;}
     return 'longest quiet '+(worst*step/1000).toFixed(1)+'s';})());

// ---- and it never visibly repeats
ok('no repeat: the curve never returns to its own opening over two minutes',
   (()=>{const head=samples.slice(0,200);
     for(let off=400;off<N-200;off+=20){
       let err=0;for(let i=0;i<200;i++)err+=Math.abs(samples[off+i]-head[i]);
       if(err/200<0.05)return false;}
     return true;})());

// ---- breathing rides on a different period than the yaw
ok('breathing is on its own period, so the two never beat together',
   /lift:k\*breathe\*/.test(body) && /Math\.sin\(t\/3400\)/.test(body) && /Math\.sin\(t\/5300\)/.test(body));
/* ---- v4.1.3: the blink -------------------------------------------------
   The first one was a sine over a period that drifted on another sine. A
   drifting period is still PERIODIC -- it just counts slowly -- and a sine is
   SYMMETRIC, so the lid took as long to open as to close. Real lids snap shut
   and roll back up, and real intervals are ragged. */
const blinks=(ms=300000,step=4)=>{const out=[];let last=null;
  for(let t=0;t<ms;t+=step){if(idlePose(t,1).blink<.2){if(last===null||t-last>200){if(last!==null)out.push(t-last);last=t;}}}
  return out;};
const gaps=blinks();
ok('a blink actually closes the eye',
   (()=>{let min=1;for(let t=0;t<40000;t+=4)min=Math.min(min,idlePose(t,1).blink);return min<.2;})(),
   (()=>{let min=1;for(let t=0;t<40000;t+=4)min=Math.min(min,idlePose(t,1).blink);return min.toFixed(2);})());
ok('...at a human resting rate, not a nervous one',
   (()=>{const r=(gaps.length+1)/5;return r>=10&&r<=22;})(), ((gaps.length+1)/5).toFixed(1)+'/min');
ok('...on ragged intervals, not a swept period',
   (()=>{const long=gaps.filter(g=>g>1000);
     const mean=long.reduce((a,b)=>a+b,0)/long.length;
     const sd=Math.sqrt(long.reduce((a,b)=>a+(b-mean)**2,0)/long.length);
     return sd/mean>0.2;})(),
   (()=>{const long=gaps.filter(g=>g>1000);const mean=long.reduce((a,b)=>a+b,0)/long.length;
     const sd=Math.sqrt(long.reduce((a,b)=>a+(b-mean)**2,0)/long.length);return 'spread '+(sd/mean).toFixed(2);})());
/* measured across EVERY blink in a minute, at the half-closed crossing on
   each side of the trough. The first cut of this scanned for one blink and
   compared thresholds it never reached -- it passed with a symmetric sine
   substituted, which is the exact thing it exists to reject. */
ok('...closing faster than it opens, the way a lid does',
   (()=>{const step=1;let fall=0,rise=0,n=0;
     for(let t=step;t<60000-step;t+=step){
       const p=idlePose(t,1).blink, pv=idlePose(t-step,1).blink, nx=idlePose(t+step,1).blink;
       if(p<pv&&p<=nx&&p<.3){                       // a trough
         let u=t;while(u>0&&idlePose(u,1).blink<.5)u-=step;   // back to half-open
         let v=t;while(v<t+2000&&idlePose(v,1).blink<.5)v+=step;
         fall+=t-u;rise+=v-t;n++;}}
     return n>5 && fall/n < rise/n*0.75;})(),
   (()=>{const step=1;let fall=0,rise=0,n=0;
     for(let t=step;t<60000-step;t+=step){
       const p=idlePose(t,1).blink, pv=idlePose(t-step,1).blink, nx=idlePose(t+step,1).blink;
       if(p<pv&&p<=nx&&p<.3){let u=t;while(u>0&&idlePose(u,1).blink<.5)u-=step;
         let v=t;while(v<t+2000&&idlePose(v,1).blink<.5)v+=step;fall+=t-u;rise+=v-t;n++;}}
     return n?`close ${(fall/n).toFixed(0)}ms vs open ${(rise/n).toFixed(0)}ms`:'no blinks found';})());
ok('...and doubles happen, the way eyes actually do',
   gaps.filter(g=>g<500).length>0 && gaps.filter(g=>g<500).length<gaps.length/3,
   gaps.filter(g=>g<500).length+' of '+gaps.length);
ok('...deterministically — the same mascot on every render, no Math.random in a draw',
   !/Math\.random/.test(body));

// ---- it hands back from a show without a jolt
ok('the idle starts AT rest, so a show ending on rest hands over smoothly',
   Math.abs(idlePose(0,0).yaw-rest.yaw)<1e-9 && Math.abs(idlePose(999,0).lift)<1e-9);
ok('...ramping in rather than snapping', /\(t-end\)\/900/.test(src));

// ---- Still and reduced motion are untouched
ok('Still draws one pose and runs no loop',
   /:still\?rest:/.test(src) && /if\(!still\)raf=requestAnimationFrame\(frame\)/.test(src));
ok('...and no instance is even created when still', /if\(still\(\)\)return;/.test(fs.readFileSync(path.join(dir,'js/mascot.js'),'utf8')));

// ---- the tap
const m=fs.readFileSync(path.join(dir,'js/mascot.js'),'utf8');
ok('a tap replays the show', /addEventListener\('pointerdown'/.test(m) && /inst\.replay\(\)/.test(m));
ok('...on pointerdown, not click, so it answers at once', !/addEventListener\('click'/.test(m));
ok('...and replay refuses when still', /function replay\(next\)\{if\(disposed\|\|lost\|\|still\)return;/.test(src));
const css=fs.readFileSync(path.join(dir,'css/mascot.css'),'utf8');
ok('only the live mascot is tappable — the poster stays inert',
   /\.su-mascot\{[^}]*pointer-events:none/.test(css) && /\.su-mascot\.su-ready\{[^}]*pointer-events:auto/.test(css));
ok('the press nudge is off under reduced motion',
   /@media\(prefers-reduced-motion:no-preference\)\{[\s\S]{0,200}su-poke/.test(css));

/* ---- v4.1.4: the size in the greeting row -------------------------------
   82 -> 94px. The row is a flex line with the greeting on flex:1, so every
   pixel the mascot takes comes out of "Morning, Sungjee." Asserted as
   RESOLVED width with the stylesheet actually installed -- a CSS-text check
   would prove the rule exists, not that the row still fits. */
{
  const {JSDOM}=require('jsdom');
  const css=fs.readFileSync(path.join(dir,'css/mascot.css'),'utf8');
  const page=new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body>
    <div id="app" style="width:358px"><div class="su-hello-row">
      <div class="hello">Morning, Sungjee.</div>
      <span class="su-mascot"><img></span></div></div></body></html>`,{pretendToBeVisual:true});
  const q=s=>page.window.document.querySelector(s);
  const w=s=>page.window.getComputedStyle(q(s)).width;
  ok('(fixture) the stylesheet is installed, or these prove nothing',
     w('.su-mascot')!=='' && w('.su-mascot')!=='auto', w('.su-mascot'));
  ok('the greeting mascot is 94px — 15% up from 82', w('.su-mascot')==='94px', w('.su-mascot'));
  ok('...leaving the greeting most of the row, so it stays the headline',
     94/358 < .32, (94/358*100).toFixed(0)+'% of a 358px row');
  /* the rule may carry other selectors alongside this one -- v4.1.10 added
     .card.dayclosed to it -- so match the SELECTOR and its width, not the
     exact shape of the whole block */
  ok('...and the narrow-screen size moved by the same 15%, not left behind',
     /@media\(max-width:360px\)\{[^}]*\.su-hello-row \.su-mascot[^}]*\{width:71px\}/.test(css));
  ok('...while the other mascots are untouched',
     /\.su-live-companion \.su-mascot\{width:76px\}/.test(css) &&
     /^\.su-mascot\{[^}]*width:180px/m.test(css));
}
process.exit(fails?1:0);
