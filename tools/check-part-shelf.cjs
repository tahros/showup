// v4.6.318: THE PART SHELF. Under "This week" in Stats: eight flat figures, each lighting its part
// (Cardio lights the heart), with days trained or weight moved, this month or this year, in body
// order or most first. Counted by each set's primary muscle, like "This week". The first view fills
// every part from the floor and counts the numbers up; tapping a part opens its muscles.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'/opt/pw-browsers/chromium-1194/chrome-linux/chrome','C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,BASE=`http://127.0.0.1:${PORT}/`;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
const iso=n=>{const d=new Date('2026-10-14T12:00');d.setDate(d.getDate()-n);return d.toLocaleDateString('en-CA');};
/* a known month: Oct 1-13 holds 3 chest days, 2 back days (Deadlift counts for hamstrings -> Legs), 1 run */
const days={};
const add=(d,w)=>days[d]={w:w.map((e,k)=>({part:e[0],ex:e[1],w:e[2],reps:e[3]||[10,8],at:k+1})),upd:1};
add('2026-10-02',[['Chest','Barbell Bench Press',60],['Shoulder','Lateral Raise',9]]);
add('2026-10-05',[['Chest','Incline Dumbbell Bench Press',27]]);
add('2026-10-07',[['Back','Lat Pulldown',60],['Back','Deadlift',140]]);
add('2026-10-09',[['Back','Seated Cable Row',55],['Run','Run',5,[30]]]);
add('2026-09-20',[['Shoulder','Face Pull',20]]);
days['2026-10-14']={w:[{part:'Chest',ex:'Barbell Bench Press',w:60,reps:[10,8],at:1}],doneAll:1};
const db={days,settings:{onboarded:true,unit:'lb',theme:'light',name:'Sungjee',companionAsked:'x',partShelf:{p:'m'}}};
const ctx=await b.newContext({viewport:{width:430,height:900},serviceWorkers:'block'});
await ctx.addInitScript(D=>{if(location.protocol==='http:'&&window.name!=='seeded'){window.name='seeded';localStorage.clear();localStorage.setItem('tracker-v1',D);}},JSON.stringify(db));
const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
try{
 await p.route('**/*',r=>r.request().url().startsWith(BASE)?r.continue():r.abort());await p.goto(BASE);await p.waitForLoadState('networkidle').catch(()=>{});await p.waitForTimeout(3500);
 await p.evaluate(()=>{todayISO='2026-10-14';SEED=deriveAll();view='stats';render();});await p.waitForTimeout(1500);
 const order=await p.evaluate(()=>[...document.querySelectorAll('#view h2')].map(h=>h.firstChild?.textContent?.trim()));
 const i7=order.findIndex(t=>/This week|last 7/.test(t||'')),iP=order.findIndex(t=>/Every part/.test(t||''));
 ok('the shelf sits right under "This week"',i7>=0&&iP===i7+1,order);
 const read=()=>p.evaluate(()=>Object.fromEntries([...document.querySelectorAll('#psCard .ps-t')].map(t=>[t.dataset.part,t.querySelector('b').textContent])));
 /* let the entrance finish before reading numbers */
 await p.evaluate(()=>{const c=document.getElementById('psCard');c.scrollIntoView({block:'center'});});await p.waitForTimeout(2600);
 ok('the entrance has played once the card is seen',await p.evaluate(()=>document.getElementById('psCard').classList.contains('ps-played')));
 let v=await read();
 ok('this month, days: Chest 3, Back 2, Legs 1 (the deadlift), Shoulders 1, Cardio 1',v.Chest==='3'&&v.Back==='2'&&v.Legs==='1'&&v.Shoulder==='1'&&v.Run==='1',v);
 ok('eight tiles in body order',(await p.evaluate(()=>[...document.querySelectorAll('#psCard .ps-t')].map(t=>t.dataset.part).join())) ==='Chest,Back,Shoulder,Legs,Biceps,Triceps,Sixpack,Run');
 ok('Core is called Core, here and in "This week"',await p.evaluate(()=>/Core/.test(document.getElementById('psCard').textContent)&&!/Sixpack/.test(document.querySelector('.mccard').textContent)));
 ok('today\'s part is marked to glow',await p.evaluate(()=>document.querySelector('.ps-t[data-part="Chest"]').classList.contains('ps-today')&&!document.querySelector('.ps-t[data-part="Back"]').classList.contains('ps-today')));
 await p.click('[data-ps="o"][value="most"]');await p.waitForTimeout(500);
 ok('Most puts Chest first and remembers it',(await p.evaluate(()=>document.querySelector('#psCard .ps-t').dataset.part))==='Chest'&&(await p.evaluate(()=>DB.settings.partShelf.o))==='most');
 await p.click('[data-ps="m"][value="w"]');await p.waitForTimeout(1200);v=await read();
 ok('weight moved: Chest in lb, Cardio in miles, never ranked above pounds',/^\d/.test(v.Chest)&&(await p.evaluate(()=>[...document.querySelectorAll('#psCard .ps-t')].at(-1).dataset.part))!=='Chest'&&await p.evaluate(()=>/mi/.test(document.querySelector('.ps-t[data-part="Run"] small').textContent)),v);
 await p.click('[data-ps="m"][value="d"]');await p.click('[data-ps="o"][value="body"]');await p.waitForTimeout(900);
 /* the sheet */
 await p.click('.ps-t[data-part="Shoulder"]');await p.waitForTimeout(700);
 const sh=await p.evaluate(()=>{const d=document.querySelector('dialog.ps-sheet[open]');if(!d)return null;return {title:d.querySelector('h3').textContent,rows:[...d.querySelectorAll('.ps-mrow')].map(r=>r.querySelector('b').textContent+'='+r.querySelector('em').textContent.trim()+'|'+r.querySelector('span small').textContent),figs:d.querySelectorAll('.ps-big').length,locked:modalOpen()};});
 ok('tapping Shoulders opens its muscles, front and back',sh&&sh.title==='Shoulders'&&sh.figs===2&&sh.locked,sh);
 ok('...side delts 1 day this month, rear delts 0 but last trained 24 days ago',sh&&sh.rows.some(r=>/^Side delts=1 day/.test(r))&&sh.rows.some(r=>/^Rear delts=0 days\|Last trained 24 days ago/.test(r)),sh&&sh.rows);
 await p.click('.ps-x');await p.waitForTimeout(500);
 ok('closing removes the sheet and lets the page go',await p.evaluate(()=>!document.querySelector('dialog.ps-sheet')&&!modalOpen()));
 await p.click('.ps-t[data-part="Run"]');await p.waitForTimeout(600);
 ok('Cardio opens run days and distance',await p.evaluate(()=>{const d=document.querySelector('dialog.ps-sheet[open]');return !!d&&/Run days/.test(d.textContent)&&/Distance/.test(d.textContent);}));
 await p.keyboard.press('Escape');await p.waitForTimeout(500);
 ok('Escape closes it',await p.evaluate(()=>!document.querySelector('dialog.ps-sheet')));
 ok('no page errors',!errors.length,errors);
}catch(e){console.log('CRASH '+e.stack);bad++;}
await b.close();console.log(bad?`FAILED ${bad}`:'ALL OK');process.exit(bad?1:0);})();
