// v4.2.4 — the completion mascot is blue, and still jumps.
// Blue was only reachable as mode 'cool', and mode also chooses the animation,
// so asking for blue meant giving up the motion. Driven through the real
// ceremony markup, because the claim is about what that screen emits.
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=process.argv[2]||'.',html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();w.fetch=()=>Promise.reject(Error('offline'));
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});   /* v4.5.12: bindPlateStats disposes its listener */w.scrollTo=()=>{};w.navigator.vibrate=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:()=>({width:10})},{get:(o,k)=>o[k]||(()=>({}))});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))
  vm.runInContext(fs.readFileSync(path.join(dir,m[1]),'utf8'),ctx,{filename:m[1]});
const run=s=>vm.runInContext(s,ctx);let fails=0;
const ok=(n,e,g)=>{let good;try{good=typeof e==='string'?run(e):e;}catch(err){good=false;console.log(err.message);}
  let shown=g;if(typeof g==='string'){try{shown=run(g);}catch(_){shown=g;}}
  console.log(`${good?'PASS':'FAIL'} ${n}`+(g!==undefined?` → ${shown}`:''));if(!good)fails++;};
run(`DB.settings.mascotMotion='animated';document.documentElement.dataset.theme='light';`);

// ---- tone is its own argument
ok('a blue mascot can be asked for without giving up its motion',
   run(`/data-mascot="jump"/.test(mascotHTML('jump','','blue')) && /mascot-blue\\.png/.test(mascotHTML('jump','','blue'))`),
   `mascotHTML('jump','','blue').slice(0,96)`);
ok('...and the tone rides on the element for the 3D renderer to read',
   run(`/data-mascot-tone="blue"/.test(mascotHTML('dance','','blue'))`));
ok('...while dance stays dance', run(`/data-mascot="dance"/.test(mascotHTML('dance','','blue'))`));

// ---- nothing that did not ask changes
ok('a plain mascot is still charcoal in light',
   run(`/mascot-charcoal\\.png/.test(mascotHTML('hello')) && !/data-mascot-tone/.test(mascotHTML('hello'))`),
   `mascotHTML('hello').slice(0,80)`);
run(`document.documentElement.dataset.theme='dark';`);
ok('...and white in dark', run(`/mascot-white\\.png/.test(mascotHTML('hello'))`));
run(`document.documentElement.dataset.theme='light';`);
ok('...and "cool" still means blue, as it always did',
   run(`/mascot-blue\\.png/.test(mascotHTML('cool'))`));

// ---- the ceremony itself
const src=fs.readFileSync(path.join(dir,'js/app.js'),'utf8');
ok('the completion moment asks for blue on its jump',
   /mascotHTML\('jump','','blue'\)/.test(src));
ok('...and on its dance', /mascotHTML\('dance','','blue'\)/.test(src));
ok('...and no longer leaves either to the theme',
   !/mascotHTML\('jump'\)/.test(src) && !/mascotHTML\('dance'\)/.test(src));

// ---- the renderer colours by tone, not by mode
const rsrc=fs.readFileSync(path.join(dir,'js/mascot-renderer.js'),'utf8');
// Compile the entire function body too: regex checks alone missed malformed
// update(next={...}) syntax that stopped every dynamic import in browsers.
let parses=true;try{new vm.Script(rsrc.replace(/^import .*;$/m,'').replace('export function','function'));}catch(e){parses=false;console.error(e.message);}
ok('the complete renderer parses, not just its tone snippets',parses);
ok('the 3D mascot takes its colour from the tone',
   /const isBlue=\(\)=>tone==='blue'\|\|\(!tone&&mode==='cool'\)/.test(rsrc) &&
   /const base=isBlue\(\)\?\['#2033af'/.test(rsrc));
ok('...while the motion still comes from the mode',
   /const motion=motions\[mode==='cool'\?'jump':mode\]/.test(rsrc));
ok('...so a blue jump is a jump, not the cool routine',
   !/isBlue\(\)\?'jump'/.test(rsrc));

/* v4.5.12: the plate card's mascot is blue on every logged day. Its colour used
   to be a side effect of `done`: 'cool' implies blue, 'jump' passed no tone and
   fell through to the theme, so the character reported whether the Done button
   had been tapped. The card's own markup is built BOTH ways and the tone read
   out of that markup, not out of the source. (plateStatsHTML directly rather
   than render(): the whole stats view through this harness exhausts the heap.) */
{
  const card=`(function(done){DB.settings.unit='lb';DB.settings.onboarded=true;DB.settings.mascotMotion='animated';
    document.documentElement.dataset.theme='light';
    DB.days={};DB.days[todayISO]={w:[{part:'Legs',ex:'Squat',w:toKg(225),reps:[8,8,8],at:1}],upd:1};
    if(done)DB.days[todayISO].doneAll=true;
    SEED=deriveAll();
    const d=document.createElement('div');d.innerHTML=plateStatsHTML();
    const el=d.querySelector('.plate-mascot-button [data-mascot]');
    return JSON.stringify({found:!!el,mode:el&&el.dataset.mascot,tone:el&&el.dataset.mascotTone,
      src:el&&el.querySelector('img').getAttribute('src'),heading:d.querySelector('h2')&&d.querySelector('h2').textContent});})`;
  const sealed=JSON.parse(run(card+'(true)')), open_=JSON.parse(run(card+'(false)'));
  ok('(fixture) the card draws a mascot both ways', sealed.found&&open_.found);
  ok('a day that was never closed still draws the BLUE mascot', /mascot-blue\.png/.test(open_.src||''), open_.src);
  ok('a closed day draws it blue too -- unchanged', /mascot-blue\.png/.test(sealed.src||''), sealed.src);
  ok('...so the two cannot differ by colour at all', open_.src===sealed.src);
  ok('the charcoal mascot is unreachable from this card in light theme',
     !/charcoal/.test(open_.src||'')&&!/charcoal/.test(sealed.src||''));
  ok('but the MOTION still tells them apart: cool when sealed, jump when open',
     sealed.mode==='cool'&&open_.mode==='jump', sealed.mode+' vs '+open_.mode);
  ok('...and the heading still reports the seal, so the flag is not ignored',
     /completed/i.test(sealed.heading||'')&&!/completed/i.test(open_.heading||''),
     JSON.stringify(sealed.heading)+' vs '+JSON.stringify(open_.heading));
  ok('...the tone rides on the element, so the 3D renderer gets blue too',
     open_.tone==='blue'&&sealed.tone==='blue', open_.tone+' / '+sealed.tone);
}

process.exit(fails?1:0);
