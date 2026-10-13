// v4.6.306: a tip rides with its target. Fixed and re-placed on scroll, the bubble and ring trailed
// the button by a frame on iOS and jittered. Now they share the target's layer: every frame of a
// scroll keeps the same offset to the button, page tips are absolute, tab-bar tips stay fixed.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]]){const tag=`${w}:`;
 const ctx=await b.newContext({viewport:{width:w,height:h},hasTouch:true,isMobile:true,serviceWorkers:'block'});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE);await p.waitForTimeout(4500);
 await p.click('[data-onbact="local"]');await p.waitForTimeout(700);await p.click('[data-onbact="skip"]');await p.waitForTimeout(900);
 await p.click('[data-onbact="go"][data-onbgo="train"]');await p.waitForTimeout(1600);
 await p.click('#view [data-ex]');await p.waitForTimeout(1600);
 let s=await p.evaluate(()=>{const n=document.querySelector('.tipn'),r=document.querySelector('.tipr');return n&&{k:n.dataset.tip,pos:getComputedStyle(n).position,ring:getComputedStyle(r).position,parent:n.parentElement===document.body};});
 ok(`${tag} the set tip sits in the page (absolute), not fixed`,s&&s.k==='set'&&s.pos==='absolute'&&s.ring==='absolute',s);
 /* sample every frame while the page scrolls by touch: the offsets to #addrep must not move */
 await p.evaluate(()=>{window.__f=[];const go=()=>{const a=document.getElementById('addrep')?.getBoundingClientRect(),n=document.querySelector('.tipn')?.getBoundingClientRect(),r=document.querySelector('.tipr')?.getBoundingClientRect();
   if(a&&n&&r)__f.push([n.top-a.top,r.top-a.top,scrollY]);if(__f.length<400)window.__raf=requestAnimationFrame(go);};go();});
 const cdp=await ctx.newCDPSession(p);
 for(const [y1,y2] of [[h*.7,h*.55],[h*.55,h*.68],[h*.68,h*.6]]){await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:w/2,y:y1}]});
  for(let i=1;i<=10;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:w/2,y:y1+(y2-y1)*i/10}]});await p.waitForTimeout(16);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(250);}
 await p.evaluate(()=>{scrollBy(0,40);});await p.waitForTimeout(120);await p.evaluate(()=>{scrollBy(0,-25);});await p.waitForTimeout(400);
 const f=await p.evaluate(()=>{cancelAnimationFrame(__raf);return __f;});
 const moved=new Set(f.map(x=>x[2])).size,spread=i=>Math.max(...f.map(x=>x[i]))-Math.min(...f.map(x=>x[i]));
 ok(`${tag} while the page scrolls, the bubble and ring hold their place against Add set every frame`,f.length>20&&moved>3&&spread(0)<=1&&spread(1)<=1,{frames:f.length,scrolls:moved,bubble:spread(0),ring:spread(1)});
 s=await p.evaluate(()=>{const n=document.querySelector('.tipn'),r=n.getBoundingClientRect(),a=document.getElementById('addrep').getBoundingClientRect();return {k:n.dataset.tip,below:r.top>=a.bottom,under:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('.tipn')!=null};});
 ok(`${tag} still the same tip, still under the button, still on top`,s.k==='set'&&s.below&&s.under,s);
 /* v4.6.308: a page tip passes under the header and the tab bar; it opens below a target near the header */
 const z=await p.evaluate(()=>{const n=document.querySelector('.tipn'),r=document.querySelector('.tipr');return {n:+getComputedStyle(n).zIndex,r:+getComputedStyle(r).zIndex,hd:+getComputedStyle(document.querySelector('header')).zIndex,nav:+getComputedStyle(document.getElementById('nav')).zIndex};});
 ok(`${tag} the bubble and ring sit under the header and the tab bar`,z.n<z.hd&&z.r<z.hd&&z.n<z.nav,z);
 await p.evaluate(()=>{const a=document.getElementById('addrep'),hb=document.querySelector('header').getBoundingClientRect().bottom;scrollBy(0,a.getBoundingClientRect().top-hb-10);});await p.waitForTimeout(200);
 const hit=await p.evaluate(()=>{const n=document.querySelector('.tipn').getBoundingClientRect(),hd=document.querySelector('header').getBoundingClientRect();const el=document.elementFromPoint(n.left+n.width/2,Math.max(1,hd.top+hd.height/2));return {covered:n.top<hd.bottom,headerOnTop:!!el?.closest('header')};});
 ok(`${tag} scrolled under the header, the header covers the tip, not the other way round`,!hit.covered||hit.headerOnTop,hit);
 await p.evaluate(()=>{tipCur.dir=null;TIP_BY.set.dir='down';tipPlace(true);});
 const d=await p.evaluate(()=>{const n=document.querySelector('.tipn').getBoundingClientRect();return {dir:tipCur.dir,top:n.top,hb:document.querySelector('header').getBoundingClientRect().bottom};});
 await p.evaluate(()=>{TIP_BY.set.dir='up';tipPlace(true);});
 ok(`${tag} a tip that would open above a target right under the header opens below it instead`,d.dir==='up'&&d.top>=d.hb,d);
 /* a tab-bar target stays fixed */
 const fx=await p.evaluate(()=>{const n=document.createElement('span');document.getElementById('nav').append(n);return tipHost(n).mode;});
 ok(`${tag} a target on the tab bar keeps a fixed tip`,fx==='fixed',fx);
 ok(`${tag} no page errors`,!errors.length,errors);await ctx.close();}
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
