// PW_PORT=8798 NODE_PATH=<playwright modules> node tools/check-logger-feedback.cjs
// Fresh browser only; never uses the owner's signed-in storage.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({headless:true});try{
for(const width of [320,393,520])for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width,height:1100},serviceWorkers:'block'}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));const origin=process.env.PW_URL||'http://127.0.0.1:'+(process.env.PW_PORT||8798)+'/';
 await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 await p.addInitScript(()=>{window.__taps=[];navigator.vibrate=x=>{__taps.push(x);return true;};window.__sounds=0;const A=window.AudioContext;window.AudioContext=class extends A{createBufferSource(){const s=super.createBufferSource(),start=s.start.bind(s);s.start=(...a)=>{window.__sounds++;start(...a);};return s;}};});
 await p.goto(origin);await p.waitForTimeout(2200);
 await p.evaluate(theme=>{todayISO='2026-10-07';checkDate=()=>false;DB={days:{'2026-09-30':{w:[{ex:'Incline Barbell Bench Press',part:'Chest',w:175/LB,reps:[6,6],at:1}]}},settings:{unit:'lb',onboarded:true,founding:'2026-09-22',theme,skin:'minimal'}};SEED=deriveAll();lift={part:'Chest',ex:'Incline Barbell Bench Press',weight:175/LB,rep:6};view='lift';lastView=null;document.querySelector('#onb')?.remove();applyTheme();render();},theme);
 await p.locator('#addrep').waitFor();await p.evaluate(()=>document.fonts.ready);
 if(process.env.PW_SHOTS&&width===393)await p.screenshot({path:require('path').join(process.env.PW_SHOTS,'logger-'+theme+'.png'),fullPage:true});
 const old=await p.evaluate(()=>JSON.stringify(DB.days['2026-09-30']));
 for(const s of ['#addrep','.barviz .pl','.plate-mini-mark'])assert.notEqual(await p.locator(s).first().evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
 const a=await p.locator('.barviz .pl').first().evaluate(e=>getComputedStyle(e,'::after').backgroundPosition);await p.waitForTimeout(400);const z=await p.locator('.barviz .pl').first().evaluate(e=>getComputedStyle(e,'::after').backgroundPosition);if(a===z){await p.waitForTimeout(1400);assert.notEqual(a,await p.locator('.barviz .pl').first().evaluate(e=>getComputedStyle(e,'::after').backgroundPosition));}
 await p.locator('.rr[data-rep="7"]').click();await p.waitForTimeout(450);assert.equal(await p.evaluate(()=>repRulerValue()),7);
 const clicks=await p.evaluate(()=>__sounds);assert(clicks>0);assert.equal(await p.evaluate(()=>day(todayISO).w.length),0);
 await p.locator('.repruler').hover();await p.mouse.wheel(44,0);await p.waitForTimeout(600);
 assert(await p.evaluate(()=>repRulerValue()>7));assert(await p.evaluate(()=>__sounds)>clicks);assert.equal(await p.evaluate(()=>day(todayISO).w.length),0);
 await p.locator('[data-w="1"]').click();assert.equal(await p.locator('#wv').inputValue(),'185');
 const rep=await p.evaluate(()=>repRulerValue());await p.locator('#addrep').click();
 assert.equal(await p.evaluate(()=>DB.days[todayISO].w.length),1);assert.equal(await p.evaluate(()=>DB.days[todayISO].w[0].reps[0]),rep);assert.equal(await p.evaluate(()=>Math.round(DB.days[todayISO].w[0].w*LB)),185);assert.equal(await p.evaluate(()=>JSON.stringify(DB.days['2026-09-30'])),old);
 assert(await p.evaluate(()=>__sounds>=2&&__taps.some(Array.isArray)));assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.equal(await p.locator('.plate-mini-mark svg').count(),1);assert.match(await p.locator('.plate-mini > span:last-child').innerText(),/today/);
 await p.waitForTimeout(3600);assert.equal(await p.locator('.plate-mini-mark svg').count(),1);assert.match(await p.locator('.plate-mini > span:last-child').innerText(),/moved today/);
 await p.evaluate(()=>{flushSave();view='sync';lastView=null;render();});const db=await p.evaluate(()=>JSON.stringify(DB));
 await p.locator('[data-club-group="training"] summary').click();await p.locator('[data-logger-feedback="sound"]').click();await p.locator('[data-logger-feedback="touch"]').click();assert.equal(await p.evaluate(()=>JSON.stringify(DB)),db);
 assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem(LOGGER_FEEDBACK_KEY))),{sound:false,touch:false});
 const sounds=await p.evaluate(()=>__sounds);await p.evaluate(()=>{view='lift';lastView=null;render();});await p.locator('#addrep').click();assert.equal(await p.evaluate(()=>__sounds),sounds);assert.equal(await p.evaluate(()=>DB.days[todayISO].w.length),2);
 await p.emulateMedia({reducedMotion:'reduce'});for(const s of ['#addrep','.barviz .pl','.plate-mini-mark'])assert.equal(await p.locator(s).first().evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
 assert.deepEqual(errors,[]);console.log('PASS logger + theme + mute + unchanged history '+width+' '+theme);await p.close();
}
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
