/* check-dist.cjs — prove dist/ is complete by RUNNING it, not by reading it.
 *
 * build-dist.py copies directories, so the question it cannot answer is
 * whether anything the app reaches for at runtime is missing -- and half this
 * app's assets are named by concatenation, so no parse of the markup would
 * answer it either. This serves dist/ ALONE on a throwaway port, walks every
 * tab, cycles the mascot tones, and fails on any request that does not come
 * back 200 or any error on the page. A missing font, mascot or vendor module
 * shows up here as a 404, which is exactly how it would show up on a phone
 * with no network.
 *
 * PW_CHROME overrides the browser path.
 */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),
      path=require('path'),assert=require('assert');
const ROOT=path.resolve(process.argv[2]||'.','dist');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};

(async()=>{
 if(!fs.existsSync(ROOT)) { console.error('no dist/ -- run tools/build-dist.py first'); process.exit(1); }
 const server=http.createServer((req,res)=>{
   const rel=decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/,'')||'index.html';
   const file=path.join(ROOT,rel);
   if(!file.startsWith(ROOT)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('404');}
   res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});
   fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const port=server.address().port;
 const b=await chromium.launch({executablePath:process.env.PW_CHROME||process.env.CHROMIUM_PATH||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
 try{
  const p=await b.newPage({serviceWorkers:'block',viewport:{width:402,height:874},deviceScaleFactor:2});
  const bad=[],errors=[],offOrigin=[];
  p.on('pageerror',e=>errors.push(e.message));
  p.on('requestfailed',r=>bad.push(`FAILED ${r.url()} (${r.failure()?.errorText})`));
  p.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`);});
  p.on('request',r=>{const u=new URL(r.url());
    if(u.hostname!=='127.0.0.1'&&u.protocol!=='data:'&&u.protocol!=='blob:')offOrigin.push(r.url());});

  await p.goto(`http://127.0.0.1:${port}/`,{waitUntil:'networkidle'});
  await p.evaluate(()=>{
    document.querySelector('#onb')?.remove();
    DB.settings.onboarded=true;DB.settings.name='Dist';DB.settings.mascotMotion='still';
    for(let i=1;i<40;i++){const x=new Date();x.setDate(x.getDate()-i);
      if(i%7)DB.days[x.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',w:45,reps:[8],at:1}],doneAll:true,upd:1};}
    SEED=deriveAll();applyTheme();render();
  });
  await p.waitForTimeout(400);

  /* every tab, because each one pulls its own scripts and art */
  for(const v of ['today','lift','stats','history','today']){
    await p.evaluate(v=>{view=v;render();},v);
    await p.waitForTimeout(350);
  }
  /* the mascot art is named by concatenation -- cycle every tone so each file is really fetched */
  await p.evaluate(async()=>{
    for(const tone of ['','rest','hello','live','done']){
      document.querySelectorAll('.su-mascot img,img.su-mascot').forEach(el=>{
        if(typeof mascotTint==='function')try{mascotTint(el,tone);}catch(e){}
      });
      await new Promise(r=>setTimeout(r,120));
    }
  });
  /* both themes: the art and the wash differ */
  for(const t of ['dark','light']){
    await p.evaluate(t=>{DB.settings.theme=t;applyTheme();render();},t);
    await p.waitForTimeout(300);
  }
  await p.waitForTimeout(500);

  assert.deepEqual(offOrigin,[],'dist reached off-origin: '+offOrigin.join(', '));
  assert.deepEqual([...new Set(bad)],[],'missing from dist:\n  '+[...new Set(bad)].join('\n  '));
  assert.deepEqual(errors,[],'page errors:\n  '+errors.join('\n  '));
  const seen=await p.evaluate(()=>performance.getEntriesByType('resource').length);
  assert(seen>30,`only ${seen} resources loaded — the app did not really start`);
  console.log(`PASS dist/ is complete and self-contained — ${seen} resources, 0 failures, 0 off-origin`);
 } finally { await b.close(); server.close(); }
})().catch(e=>{console.error(e.message||e);process.exitCode=1});
