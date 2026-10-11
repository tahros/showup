// PW_PORT=8806 NODE_PATH=<playwright modules> node tools/check-club-coin.cjs
const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.PW_CHROME?{executablePath:process.env.PW_CHROME}:{})});try{
 for(const theme of ['light','dark'])for(const width of [320,393]){
  const page=await browser.newPage({viewport:{width,height:1000},serviceWorkers:'block'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));const origin=process.env.PW_ORIGIN||'http://127.0.0.1:'+(process.env.PW_PORT||8806)+'/';
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());await page.goto(origin);await page.waitForTimeout(500);
  await page.evaluate(theme=>{DB={days:{},settings:{name:'Sungjee Yoo',onboarded:true,theme,unit:'lb',skin:'minimal',mascotMotion:'animated',clubAvatar:'roller'}};loadedOK=true;settingsBaseline();session={user:{id:'coin-fixture',created_at:'2026-07-13'}};clubMembershipCache.set(clubMembershipKey(),{member_no:'0',joined_at:'2026-07-13'});document.querySelector('#onb')?.remove();SEED=deriveAll();view='sync';lastView=null;applyTheme();render();},theme);
  const coin=page.locator('[data-club-coin]');await coin.waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(500);
  assert.equal(await coin.locator('.club-coin-number').textContent(),'000000');
  const geometry=await page.evaluate(()=>{const a=document.querySelector('.club-brand>img').getBoundingClientRect(),b=document.querySelector('[data-club-coin]').getBoundingClientRect();return {delta:Math.abs(a.y+a.height/2-b.y-b.height/2),size:b.width,overflow:document.documentElement.scrollWidth>innerWidth,font:getComputedStyle(document.querySelector('.club-coin-number>span')).fontFamily,weight:getComputedStyle(document.querySelector('.club-coin-number>span')).fontWeight}});
  assert(geometry.delta<1);assert(geometry.size>=44);assert(!geometry.overflow);assert(geometry.font.includes('IBM Plex Sans'));assert.equal(geometry.weight,'700');
  const before=await page.evaluate(()=>JSON.stringify(DB));
  const idleStart=Number(await coin.getAttribute('data-angle'));await page.waitForTimeout(500);const idleEnd=Number(await coin.getAttribute('data-angle'));assert(idleEnd>idleStart+2&&idleEnd<idleStart+12,'slow unattended rotation');
  assert((await coin.locator('.club-coin-face').first().evaluate(e=>getComputedStyle(e).clipPath)).startsWith('circle('),'circular clip contains shimmer');
  assert.notEqual(await coin.evaluate(e=>getComputedStyle(e,'::before').filter),'none','soft shadow beneath coin');
  await coin.evaluate(e=>e.style.top='2000px');await page.waitForTimeout(200);const paused=await coin.getAttribute('data-angle');await page.waitForTimeout(200);assert.equal(await coin.getAttribute('data-angle'),paused,'offscreen coin pauses');
  await coin.evaluate(e=>e.style.top='');await page.waitForTimeout(500);assert(Number(await coin.getAttribute('data-angle'))>Number(paused),'visible coin resumes idle turn');
  await page.emulateMedia({reducedMotion:'reduce'});await coin.click();assert.equal(await coin.getAttribute('data-angle'),'180');
  await page.waitForTimeout(200);assert.equal(await coin.getAttribute('data-angle'),'180','reduced motion stops idle spin');
  assert.equal(await coin.locator('.club-coin-rotor').evaluate(e=>getComputedStyle(e).transformStyle),'preserve-3d');
  assert((await coin.locator('.club-coin-wordmark').evaluate(e=>getComputedStyle(e).maskImage)).includes('showuppp-wordmark-light.svg'));
  if(process.env.PW_SHOTS&&width===393)await page.screenshot({path:path.join(process.env.PW_SHOTS,'coin-back-'+theme+'.png'),fullPage:true});
  await coin.press('ArrowLeft');assert.equal(await coin.getAttribute('data-angle'),'0');
  if(process.env.PW_SHOTS&&width===393)await page.screenshot({path:path.join(process.env.PW_SHOTS,'coin-front-'+theme+'.png'),fullPage:true});
  await page.emulateMedia({reducedMotion:'no-preference'});
  async function flick(dir,delay){await page.evaluate(()=>clubBindCoin());const b=await coin.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;await page.mouse.move(x,y);await page.mouse.down();for(let i=1;i<=3;i++){await page.waitForTimeout(delay);await page.mouse.move(x+dir*i*8,y);}await page.mouse.up();const start=Number(await coin.getAttribute('data-angle'));await page.waitForTimeout(140);return {start,end:Number(await coin.getAttribute('data-angle'))};}
  const slow=await flick(1,100),fast=await flick(1,12),left=await flick(-1,12);assert(fast.end-fast.start>slow.end-slow.start,'faster swipe has more momentum');assert(left.end<left.start,'left flick continues left');
  const continuity=await page.evaluate(()=>{const a=Number(document.querySelector('[data-club-coin]').dataset.angle);DB.settings.theme=DB.settings.theme==='dark'?'light':'dark';applyTheme();render();const b=Number(document.querySelector('[data-club-coin]').dataset.angle);DB.settings.theme=DB.settings.theme==='dark'?'light':'dark';applyTheme();render();return {a,b,c:Number(document.querySelector('[data-club-coin]').dataset.angle),speed:clubCoinMotion.speed}});assert.equal(continuity.a,continuity.b,'theme retains angle');assert.equal(continuity.b,continuity.c,'round trip retains angle');assert(continuity.speed<0,'theme retains leftward momentum');
  await page.evaluate(()=>{DB.settings.mascotMotion='still';clubObserveMotion();clubBindCoin()});const stillAngle=Number(await coin.getAttribute('data-angle'));await coin.click();assert.equal(Number(await coin.getAttribute('data-angle')),stillAngle+180);
  assert.equal(await page.evaluate(()=>JSON.stringify(DB.days)),JSON.stringify(JSON.parse(before).days));
  await page.evaluate(()=>{DB.settings.mascotMotion='animated'});assert.equal(await page.evaluate(()=>JSON.stringify(DB)),before);
  await page.evaluate(()=>{clubMembershipCache.set(clubMembershipKey(),{member_no:'28',joined_at:'2026-07-13'});clubPaintMembership()});assert.equal(await coin.locator('.club-coin-number').textContent(),'000028');
  assert.deepEqual(errors,[]);console.log('PASS coin registry, geometry, reduced motion, keyboard, swipe speed and direction '+width+' '+theme);await page.close();
 }
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
