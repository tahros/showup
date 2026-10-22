// PW_PORT=8978 node tools/check-routine-drag.cjs   (serve dist/ or the repo root on that port)
// v4.6.378: dragging a session on "Your week, your way" lifts the whole card
// (title and chips), slides the others aside, shows the day it would land on,
// and drops it there. v4.6.384: the card itself moves -- no copy, no empty slot.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({executablePath:process.env.PW_CHROME||'/opt/pw-browsers/chromium'});try{
const origin='http://127.0.0.1:'+(process.env.PW_PORT||8978)+'/';
const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
await p.goto(origin);await p.waitForSelector('[data-onbact="local"]');
for(const s of ['[data-onbact="local"]','[data-onbact="toCrew"]','[data-onbact="skip"]','[data-onbact="path"][data-v="fresh"]']){await p.click(s);await p.waitForTimeout(400);}
await p.click('[data-onbact="fcount"][data-v="5"]');await p.click('[data-onbact="frt"]');await p.waitForTimeout(700);
const names=()=>p.evaluate(()=>[...document.querySelectorAll('#onb .ob-rt-ses[data-rtcard] b')].map(b=>b.textContent));
const before=await names();
const g=p.locator('#onb [data-rthandle="0"]');await g.scrollIntoViewIfNeeded();const bb=await g.boundingBox(),x=bb.x+bb.width/2,y=bb.y+bb.height/2;
const cardH=await p.locator('#onb .ob-rt-ses[data-rtcard="0"]').evaluate(e=>e.offsetHeight+8);
await p.mouse.move(x,y);await p.mouse.down();
for(let i=1;i<=10;i++){await p.mouse.move(x,y+i*cardH*2/10);await p.waitForTimeout(25);}
await p.waitForTimeout(300);
const mid=await p.evaluate(()=>{const g=document.querySelector('#onb .ob-rt-ses.ob-rt-moving');const vis=g?getComputedStyle(g):null;return {lift:!!g,chips:g?g.querySelectorAll('.pf-rot-tag,[class*="chip"],[class*="tag"]').length:0,title:g?.querySelector('b')?.textContent,day:g?.querySelector('.ob-rt-day')?.textContent,shown:!!vis&&vis.opacity==='1'&&vis.visibility==='visible'&&[...g.children].every(c=>getComputedStyle(c).visibility==='visible'),under:g?Math.abs(g.getBoundingClientRect().top-(window.__y0||0)):0,copies:document.querySelectorAll('#onb .ob-rt-lift,#onb .ob-rt-slot').length,moved:[...document.querySelectorAll('#onb .ob-rt-ses[data-rtcard]')].filter(c=>c.style.transform).length};});
assert(mid.lift,'the whole card lifts');assert.equal(mid.title,before[0]);assert(mid.chips>0,'the lifted card carries its chips');
assert(mid.shown,'what you hold stays fully visible');assert.equal(mid.copies,0,'no copy, no empty slot');assert(mid.moved>=2,'the others slide aside');assert.equal(mid.day,'Day 3','the lifted card reads the day it would land on');
await p.mouse.up();await p.waitForTimeout(450);
const after=await names();
assert.deepEqual(after,[before[1],before[2],before[0],before[3],before[4]],JSON.stringify({before,after}));
assert(!await p.locator('#onb .ob-rt-moving').count(),'nothing is left lifted');
assert.deepEqual(errors,[]);
console.log('PASS dragging a session moves the whole card, and it lands where it shows');
}finally{await b.close();}})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
