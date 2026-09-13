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
/* v4.5.15: a plain mascot in the light theme is CHROME, not charcoal, and the
   resolved tone is always written to the element -- CSS needs it to hang the
   satin highlight on, and "chrome" is never requested, only resolved, so the
   old "no attribute unless asked" rule left it blank in the one case that
   needed it. Charcoal is asserted gone: shipping both would be two tones for
   one decision. */
ok('a plain mascot in the light theme is chrome',
   run(`/mascot-chrome\\.png/.test(mascotHTML('hello'))&&/data-mascot-tone="chrome"/.test(mascotHTML('hello'))`),
   run(`mascotHTML('hello').slice(0,96)`));
ok('...and charcoal is not reachable from a plain mascot any more',
   run(`!/mascot-charcoal/.test(mascotHTML('hello'))`));
ok('...the resolved tone rides on the element for every mascot, not only asked ones',
   run(`['hello','jump','cool','dance'].every(m=>/data-mascot-tone="[a-z]+"/.test(mascotHTML(m)))`));
ok('...and the img and the attribute always name the SAME tone',
   run(`['hello','jump','cool','dance'].every(m=>{const h=mascotHTML(m);
     return h.match(/mascot-([a-z]+)\\.png/)[1]===h.match(/data-mascot-tone="([a-z]+)"/)[1];})`));
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


/* v4.5.15: the satin highlight, and the two-renderers trap. The PNG path and the
   WebGL path are separate implementations of one decision; the whole bug class
   this repo keeps hitting is a fix landing in the copy the maker is not running,
   so chrome is asserted in BOTH, and the highlight is asserted to switch off once
   the canvas takes over. */
{
  const css=fs.readFileSync(path.join(dir,'css/mascot.css'),'utf8');
  const rsrc=fs.readFileSync(path.join(dir,'js/mascot-renderer.js'),'utf8');

  ok('the chrome asset exists and is precached',
     fs.existsSync(path.join(dir,'assets/mascot-chrome.png')) &&
     /\.\/assets\/mascot-chrome\.png/.test(fs.readFileSync(path.join(dir,'sw.js'),'utf8')));
  ok('the WebGL renderer knows chrome too, so the 3D mascot is not left charcoal',
     /chrome:\[/.test(rsrc) && /tone===.chrome.\?tones\.chrome/.test(rsrc));
  /* v4.5.16: the claim for chrome is the SPREAD, not the floor. A flat lift reads
     as grey paint; what makes metal look polished is a wide gap between its darkest
     and brightest stop, with the dark one still clearly lifted off the old charcoal
     (#2c2c2c). Asserting "every stop is at least mid grey" would have banned the
     horizon that makes it chrome in the first place. */
  {
    const stops=(rsrc.match(/chrome:\['#([0-9a-f]{6})','#([0-9a-f]{6})','#([0-9a-f]{6})'\]/)||[]).slice(1)
      .map(h=>parseInt(h.slice(0,2),16));
    ok('(fixture) the renderer declares three chrome stops', stops.length===3, stops.join(' → '));
    ok('...they run dark to bright with a wide gap -- polished, not painted',
       stops.length===3&&stops[2]-stops[0]>=0x50&&stops[0]<stops[1]&&stops[1]<stops[2],
       stops.map(n=>n.toString(16)).join(' → ')+' (spread '+(stops[2]-stops[0])+')');
    ok('...and even its darkest stop is well clear of the old charcoal',
       stops.length===3&&stops[0]>0x44, stops[0]&&stops[0].toString(16));
  }
  ok('no second CSS highlight can overpower the selected ultra-soft reflection',
     !/su-satin|mask:url\(\.\.\/assets\/mascot-chrome/.test(css));
  ok('chrome and blue use actual reflected studio lighting over their existing base',
     /MeshPhysicalMaterial/.test(rsrc)&&/PMREMGenerator/.test(rsrc)&&/mix\(silverBase,outgoingLight,reflectionMix\)/.test(rsrc));
  ok('the final B reflection strengths are retained: chrome .03, blue .08',
     /reflectionMix.value=blue\?\.08:\.03/.test(rsrc));
  ok('the reflection clock freezes for still/reduced motion',
     /const time=still\?0:t/.test(rsrc)&&/envMapRotation.set/.test(rsrc));
  ok('white keeps the approved A shading, without a reflective material',
     /white:\['#bfc2c7','#e6e8eb','#ffffff'\]/.test(rsrc)&&/!whiteBody&&tone==='chrome'\?'chrome':'matte'/.test(rsrc));
  ok('the dark theme is untouched -- still white, no chrome',
     run(`(function(){document.documentElement.dataset.theme='dark';const h=mascotHTML('hello');
       document.documentElement.dataset.theme='light';return /mascot-white\\.png/.test(h)&&!/chrome/.test(h);})()`));
  ok('...and blue still wins over the theme, so a logged day is unaffected',
     run(`/mascot-blue\\.png/.test(mascotHTML('jump','','blue'))&&/mascot-blue\\.png/.test(mascotHTML('cool'))`));
}


/* v4.5.24: the face. On charcoal, white and blue the features are knocked OUT of a
   dark body, so white is maximum contrast; on chrome the body is light and a white
   face measured 12 brightness levels from its background -- all but invisible at the
   94px the Rest header actually draws. The asset carries a #3A3A3A face now, and the
   WebGL material follows the tone, because those are two renderers of one decision. */
{
  const rsrc=fs.readFileSync(path.join(dir,'js/mascot-renderer.js'),'utf8');
  ok('the WebGL face is no longer permanently white',
     /faceMaterial\.color\.set\(/.test(rsrc));
  ok('...chrome has the approved #363636 expression; white retains its dark face',
     /whiteBody\?0x303030:!pulse&&tone==='chrome'\?0x363636:0xffffff/.test(rsrc));
  ok('...blue still keeps its white face, whatever the tone says',
     /faceMaterial.color.set\(isBlue\(\)\?0xffffff/.test(rsrc));
  ok('the face material exists before any face geometry uses it',
     rsrc.indexOf('const faceMaterial=')<rsrc.indexOf('new THREE.Mesh(geometry,faceMaterial)'));
  /* [^)]* cannot cross the nested TubeGeometry(...) call, so the meshes are counted
     by the material they are handed rather than by the shape of the constructor. */
  ok('...and one material serves eyes, mouth and caps, so the face cannot half-change',
     /new THREE.Mesh\(geometry,faceMaterial\)/.test(rsrc)&&/stroke\(mouth,\.045,faceMaterial\)/.test(rsrc)&&
     /SphereGeometry\(radius,12,8\),ink\)/.test(rsrc));
}


/* The asset, measured rather than trusted. A face is only a face if you can see it:
   the white one sat 12 brightness levels from the chrome body, which is why it
   disappeared at 94px. PNG decoding here is a tiny hand-rolled reader -- no image
   library in this harness -- but the claim is worth the twenty lines. */
{
  const zlib=require('zlib');
  const read=f=>{
    const buf=fs.readFileSync(path.join(dir,f));let i=8,w=0,h=0,idat=[];
    while(i<buf.length){const len=buf.readUInt32BE(i),type=buf.toString('ascii',i+4,i+8);
      if(type==='IHDR'){w=buf.readUInt32BE(i+8);h=buf.readUInt32BE(i+12);}
      if(type==='IDAT')idat.push(buf.slice(i+8,i+8+len));
      i+=12+len;}
    const raw=zlib.inflateSync(Buffer.concat(idat)),px=[],stride=w*4;
    let prev=Buffer.alloc(stride);
    for(let y=0,o=0;y<h;y++){const ft=raw[o++];const line=Buffer.from(raw.slice(o,o+stride));o+=stride;
      for(let x=0;x<stride;x++){const a=x>=4?line[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;
        if(ft===1)line[x]=(line[x]+a)&255;else if(ft===2)line[x]=(line[x]+b)&255;
        else if(ft===3)line[x]=(line[x]+((a+b)>>1))&255;
        else if(ft===4){const p2=a+b-c,pa=Math.abs(p2-a),pb=Math.abs(p2-b),pc=Math.abs(p2-c);
          line[x]=(line[x]+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255;}}
      px.push(line);prev=line;}
    return {w,h,px};
  };
  const chrome=read('assets/mascot-chrome.png'), charcoal=read('assets/mascot-charcoal.png');
  ok('(fixture) both mascot assets decode at the same size',
     chrome.w===charcoal.w&&chrome.h===charcoal.h, chrome.w+'x'+chrome.h);
  let faceSum=0,faceN=0,bodySum=0,bodyN=0;
  for(let y=0;y<chrome.h;y++)for(let x=0;x<chrome.w;x++){
    const o=x*4, cl=charcoal.px[y], ch=chrome.px[y];
    if(ch[o+3]<200)continue;
    const v=(ch[o]+ch[o+1]+ch[o+2])/3;
    bodySum+=v;bodyN++;
    if(cl[o+3]>200&&(cl[o]+cl[o+1]+cl[o+2])/3>200){faceSum+=v;faceN++;}
  }
  const face=Math.round(faceSum/Math.max(1,faceN)), body=Math.round(bodySum/Math.max(1,bodyN));
  ok('(fixture) the face pixels were found', faceN>500, faceN+' pixels');
  ok('the chrome face is DARK against its body, not a white ghost on light metal',
     body-face>60, `face ${face} vs body ${body} (gap ${body-face})`);
}

process.exit(fails?1:0);
