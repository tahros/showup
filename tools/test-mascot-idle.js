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
// ---- blinking drifts
ok('the blink period itself drifts, so it never lands on a beat',
   /every=5200\+900\*Math\.sin/.test(body));
ok('...and a blink actually closes the eye',
   (()=>{let min=1;for(let t=0;t<40000;t+=13)min=Math.min(min,idlePose(t,1).blink);return min<.2;})(),
   (()=>{let min=1;for(let t=0;t<40000;t+=13)min=Math.min(min,idlePose(t,1).blink);return min.toFixed(2);})());

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
process.exit(fails?1:0);
