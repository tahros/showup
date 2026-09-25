/* check-heat-replay.cjs — v4.6.128: Replay on "You keep showing up".
 * Needs a local server on :8784 (python3 -m http.server 8784 from the repo) and
 * Chromium; PW_CHROME overrides the Windows path below.
 * 1. Nothing plays without a tap: no canvas after render, re-render, scrolling.
 * 2. After Replay finishes the canvas is gone, the DOM heatmap is unchanged and
 *    pixel-identical to the render before it, and the scroller is on today.
 * 3. The replay's last frame matches the DOM it hands over to: identical pixels
 *    once aligned, and aligned within one device pixel (0.33pt at 3x). Today's
 *    ring is held still (same clock on both sides) and masked from the pixel
 *    comparison -- a stroked ring and a CSS border anti-alias differently -- and
 *    the frame's sheen is hidden on both sides. Exact device-pixel snapping is the engine's (Blink
 *    and WebKit round the scroller differently); one device pixel is the bound.
 * 4. A tap anywhere during the replay jumps to the end.
 * 5. Reduced motion: no button, and no canvas ever appears, even when forced. */
const {chromium}=require('playwright'),assert=require('assert');
const EXE=process.env.PW_CHROME||'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe';
const SEED=`(()=>{document.querySelector('#onb')?.remove();todayISO='2026-09-25';checkDate=()=>false;DB.settings={...DB.settings,theme:window.__theme,onboarded:true};DB.days={};
let s=7;const r=()=>{s=(s*16807)%2147483647;return s/2147483647};
for(let d=new Date('2021-12-06T12:00');d<=new Date('2026-09-24T12:00');d.setDate(d.getDate()+1)){const iso=d.toLocaleDateString('en-CA');if(r()<(d.getDay()?0.85:0.25))DB.days[iso]={w:[{ex:'Squat',part:'Legs',w:90,reps:[8],at:+d}],upd:1};}
SEED=deriveAll();applyTheme();view='stats';render();})()`;
(async()=>{const b=await chromium.launch({executablePath:EXE});let n=0;const pass=m=>{console.log('PASS',m);n++;};
try{for(const theme of ['light','dark']){
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:3,serviceWorkers:'block'});
 const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8784/')?r.continue():r.abort());
 await p.goto('http://127.0.0.1:8784/');await p.waitForTimeout(1000);await p.evaluate(t=>window.__theme=t,theme);await p.evaluate(SEED);await p.waitForTimeout(600);
 await p.locator('.crcard').first().evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(1500);
 /* 1 */
 await p.evaluate(()=>render());await p.waitForTimeout(400);await p.mouse.wheel(0,200);await p.waitForTimeout(300);
 await p.locator('.crcard').first().evaluate(e=>e.scrollIntoView({block:'center'}));await p.waitForTimeout(600);
 assert.equal(await p.locator('.heat-replay-canvas').count(),0);pass(theme+': no canvas without a tap (render, re-render, scroll)');
 assert.equal(await p.locator('.crcard.resting .heat-replay').count(),0);
 const clip=await p.evaluate(()=>{const cs=[...document.querySelectorAll('.crcard:not(.resting) .hc')].map(c=>c.getBoundingClientRect()),w=document.querySelector('.crcard:not(.resting) .heatwrap').getBoundingClientRect();
   return {x:w.left,y:Math.min(...cs.map(c=>c.top))-4,width:w.width,height:Math.max(...cs.map(c=>c.bottom))-Math.min(...cs.map(c=>c.top))+8};});
 const dom=()=>p.evaluate(()=>{const g=document.querySelector('.crcard:not(.resting) .heatgrid');return {html:g.innerHTML,scroll:g.closest('.heatwrap').scrollLeft,max:g.closest('.heatwrap').scrollWidth-g.closest('.heatwrap').clientWidth,num:document.querySelector('.crcard:not(.resting) .crtotal').innerHTML};});
 await p.evaluate(()=>{document.getAnimations().forEach(a=>a.pause());const st=document.createElement('style');st.id='hr-check';st.textContent='.heatframe::after{visibility:hidden!important}';document.head.append(st);});
 const d0=await dom(),s0=await p.screenshot({clip});
 /* 3 */
 await p.click('.heat-replay');await p.waitForTimeout(40);
 assert.equal(await p.locator('.heat-replay-canvas').count(),1);pass(theme+': a tap on Replay starts it');
 await p.evaluate(()=>{document.getAnimations().forEach(a=>a.pause());heatReplay.live.seek(heatReplay.duration());});
 const last=await p.screenshot({clip});if(process.env.DUMP)require('fs').writeFileSync(process.env.DUMP+'-last-'+theme+'.png',last);
 await p.evaluate(()=>heatReplay.finish());await p.waitForTimeout(600);
 const s1=await p.screenshot({clip}),d1=await dom();if(process.env.DUMP)require('fs').writeFileSync(process.env.DUMP+'-dom-'+theme+'.png',s1);
 /* 2 */
 assert.equal(await p.locator('.heat-replay-canvas').count(),0);pass(theme+': the canvas is gone after the replay');
 assert.deepEqual(d1,d0);assert(Math.abs(d1.scroll-d1.max)<=1);pass(theme+': DOM heatmap, count and scroll position unchanged (on today)');
 assert(s1.equals(s0),'pixel-identical to the no-replay render');pass(theme+': pixel-identical to the no-replay render');
 const diff=await p.evaluate(async([a,b,cl])=>{const im=async s=>{const i=new Image();i.src='data:image/png;base64,'+s;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return {d:x.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};};
   const A=await im(a),B=await im(b);let best=null;const T=document.querySelector('.crcard:not(.resting) .hc.tod').getBoundingClientRect(),R=[(T.left-cl.x-5)*3,(T.top-cl.y-5)*3,(T.right-cl.x+5)*3,(T.bottom-cl.y+5)*3];
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let n=0,m=0,px=0;for(let y=4;y<A.h-4;y++)for(let x=4;x<A.w-4;x++){const i=(y*A.w+x)*4,j=((y+dy)*A.w+x+dx)*4;if(x>=R[0]&&x<=R[2]&&y>=R[1]&&y<=R[3])continue;px++;const d=Math.max(Math.abs(A.d[i]-B.d[j]),Math.abs(A.d[i+1]-B.d[j+1]),Math.abs(A.d[i+2]-B.d[j+2]));if(d>8)n++;if(d>m)m=d;}
     if(!best||n<best.n)best={n,m,px,dx,dy};}
   return best;},[last.toString('base64'),s1.toString('base64'),clip]);
 assert(diff.n/diff.px<0.002,JSON.stringify(diff));pass(theme+`: last frame vs DOM: offset (${diff.dx},${diff.dy}) device px; then ${diff.n} of ${diff.px} px differ by more than 8/255`);
 await p.evaluate(()=>document.getElementById('hr-check')?.remove());
 /* 4 */
 await p.evaluate(()=>document.getAnimations().forEach(a=>a.play()));
 await p.click('.heat-replay');await p.waitForTimeout(600);
 assert.equal(await p.locator('.heat-replay-canvas').count(),1);
 await p.mouse.click(200,120);await p.waitForTimeout(60);
 assert.equal(await p.locator('.heat-replay-canvas').count(),0);assert.deepEqual((await dom()).html,d0.html);assert.equal((await dom()).num,d0.num);
 pass(theme+': a tap anywhere mid-replay jumps to the end');
 /* 5 */
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(100);
 assert(!(await p.locator('.heat-replay').isVisible()));
 await p.evaluate(()=>{const c=document.querySelector('.crcard:not(.resting)');heatReplay.play(c);c.querySelector('.heat-replay').click();});await p.waitForTimeout(300);
 assert.equal(await p.locator('.heat-replay-canvas').count(),0);pass(theme+': reduced motion: no button, no canvas even when forced');
 assert.deepEqual(errs,[]);await p.close();
}console.log(`\n${n} passed`);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
