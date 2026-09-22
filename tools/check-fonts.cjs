/* v4.6.104: the app's type must come from the app, never a CDN.
   Two claims, both measured, not read off the markup:
     1. loading the page makes NO request outside its own origin;
     2. IBM Plex actually renders -- the same string is measurably
        wider/narrower than it is in the fallback stack, which it cannot be
        if the face failed to load and the browser silently fell back.
   PW_PORT/PW_CHROME override the defaults. */
const {chromium}=require('playwright'),assert=require('assert');
const PORT=process.env.PW_PORT||8784;
(async()=>{
 const b=await chromium.launch({executablePath:process.env.PW_CHROME||process.env.CHROMIUM_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({serviceWorkers:'block'}),foreign=[],errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('request',r=>{const u=new URL(r.url());
    if(u.hostname!=='127.0.0.1'&&u.protocol!=='data:'&&u.protocol!=='blob:')foreign.push(r.url());});
  await p.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'networkidle'});
  assert.deepEqual(foreign,[],'page reached off-origin: '+foreign.join(', '));
  console.log('PASS no off-origin request at load');

  await p.evaluate(()=>document.fonts.ready);
  for(const [fam,weights] of [['IBM Plex Sans',[400,500,600,700]],['IBM Plex Mono',[400,500,600]]])
   for(const w of weights){
    /* a face with unicode-range only downloads when something needs it, so
       ask for it explicitly: a load that resolves empty means the file is
       missing or invalid, which is the failure worth catching. */
    const got=await p.evaluate(async ([f,w])=>{
      const faces=await document.fonts.load(`${w} 16px "${f}"`);
      return faces.length>0 && document.fonts.check(`${w} 16px "${f}"`);
    },[fam,w]);
    assert(got,`${fam} ${w} did not load`);
   }
  console.log('PASS all seven faces loaded');

  /* rendered proof: measure the same string in the face and in the fallback */
  const m=await p.evaluate(()=>{
    const measure=f=>{const s=document.createElement('span');
      s.style.cssText=`position:absolute;visibility:hidden;white-space:pre;font:600 40px ${f}`;
      s.textContent='ShowUp 1,000 days';document.body.appendChild(s);
      const w=s.getBoundingClientRect().width;s.remove();return w;};
    /* fall back to a DELIBERATELY dissimilar generic: if the face loaded the
       two differ a lot, and if it silently failed they are identical. A
       same-genre fallback can sit within a pixel of Plex and prove nothing. */
    return {plex:measure("'IBM Plex Sans',monospace"),fallback:measure('monospace'),
            mono:measure("'IBM Plex Mono',serif"),monoFallback:measure('serif')};
  });
  const gap=(a,b)=>Math.abs(a-b)/b;
  assert(gap(m.plex,m.fallback)>.05,`IBM Plex Sans is not rendering (${m.plex} vs fallback ${m.fallback})`);
  assert(gap(m.mono,m.monoFallback)>.05,`IBM Plex Mono is not rendering (${m.mono} vs fallback ${m.monoFallback})`);
  console.log(`PASS faces render: sans ${m.plex.toFixed(1)} vs ${m.fallback.toFixed(1)}, mono ${m.mono.toFixed(1)} vs ${m.monoFallback.toFixed(1)}`);

  assert.deepEqual(errors,[]);
 } finally { await b.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
