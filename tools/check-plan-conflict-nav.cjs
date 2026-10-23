// PORT=8784 PW_CHROME=... node tools/check-plan-conflict-nav.cjs   (serve the repo root on PORT)
// v4.6.402: "changed while you were editing" no longer traps the planner. With the card up,
// tapping Dates goes to Dates; the draft is untouched; Save asks again.
const {chromium,devices}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{
 const ctx=await b.newContext({...devices['iPhone 13'],serviceWorkers:'block'});
 await ctx.addInitScript(()=>{if(location.protocol==='http:'&&window.name!=='s'){window.name='s';localStorage.clear();localStorage.setItem('tracker-v1',JSON.stringify({days:{},settings:{onboarded:true,unit:'lb',tips:{on:0}}}));}});
 const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());
 await p.goto(BASE);await p.waitForTimeout(2500);
 await p.evaluate(async()=>{const t=new Date(todayISO+'T12:00');t.setDate(t.getDate()+1);const d=t.toLocaleDateString('en-CA');window.__d=d;
  pwOpen(d,'dates');await new Promise(r=>setTimeout(r,400));const s=pw();s.dates=[d];s.active=d;pfAnchor&&pfAnchor();
  pwDay(d).rows=pwRead('Dumbbell Curl\n  30 lb × 12 12 12');pwDay(d).base=pwFingerprint(d);
  /* the saved plan changes underneath the draft */
  DB.week={from:d,to:d,days:{[d]:{...planItemsFrom(pwRead('Dumbbell Curl\n  30 lb × 12 12')),raw:'Dumbbell Curl\n  30 lb × 12 12'}},at:Date.now()};
  pfState().page='edit';pwPersist();pwRender();});
 await p.waitForTimeout(300);
 await p.evaluate(()=>{try{pfSave(true);}catch(e){pw().error=e.message;pwRender();}});await p.waitForTimeout(300);
 ok('Save meets the newer plan: the card is up',await p.evaluate(()=>!!document.querySelector('.pf-conflict')));
 await p.tap('[data-pw="pf-stage"][data-stage="1"]');await p.waitForTimeout(400);
 ok('tapping Dates goes to Dates: calendar on screen, card gone',await p.evaluate(()=>!document.querySelector('.pf-conflict')&&!!document.querySelector('.pf-dates-page .pf-calendar')));
 ok('the draft is untouched (3 sets)',await p.evaluate(()=>pwSetCount(pwDay(window.__d).rows)===3));
 await p.evaluate(()=>{try{pfNavigate('edit');pfSave(true);}catch(e){pw().error=e.message;pwRender();}});await p.waitForTimeout(300);
 ok('Save asks again',await p.evaluate(()=>!!document.querySelector('.pf-conflict')));
 await p.evaluate(()=>document.querySelector('[data-pw="replace-newer"]').click());await p.waitForTimeout(300);
 ok('Keep my edits clears it',await p.evaluate(()=>!document.querySelector('.pf-conflict')));
 ok('no page errors',!errors.length,errors);
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
