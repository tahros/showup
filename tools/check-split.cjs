// v4.6.209: select sessions, add to all, No split, Fill for me.
// v4.6.207: Your split on Plan -> Preferences: sessions built by moving body-part chips.
// Real Chromium, real taps and real drags.
const {chromium}=require('playwright'),fs=require('fs');
const CHROME=[process.env.PW_CHROME,'C:/Users/sungj/AppData/Local/ms-playwright/chromium-1217/chrome-win64/chrome.exe','/opt/pw-browsers/chromium-1194/chrome-linux/chrome'].find(p=>p&&fs.existsSync(p));
const PORT=process.env.PORT||8784,SHOT=process.env.SHOT;
(async()=>{const b=await chromium.launch(CHROME?{executablePath:CHROME}:{});let bad=0;
const ok=(n,c,g)=>{console.log((c?'OK   ':'FAIL ')+n+(c||g===undefined?'':' → '+JSON.stringify(g)));if(!c)bad++;};
try{for(const [w,h] of [[402,874],[320,640]])for(const theme of ['light','dark']){const tag=`${theme} ${w}:`;
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:SHOT?2:1,serviceWorkers:'block',hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>r.request().url().startsWith(`http://127.0.0.1:${PORT}/`)?r.continue():r.abort());
 await p.goto(`http://127.0.0.1:${PORT}/?theme=${theme}`);await p.waitForLoadState('networkidle');await p.waitForTimeout(1200);
 await p.evaluate(async theme=>{
  const LB=2.20462,days={},add=(d,part,ex)=>{(days[d]=days[d]||{w:[]}).w.push({part,ex,w:50/LB,reps:[10,10,10,10],at:Date.parse(d+'T18:00')+(days[d]?days[d].w.length:0)});};
  /* the maker's six, Mon to Sat, for eight weeks, cardio before every one; the last week stops after Monday's Shoulder */
  const six=[[['Shoulder','Lateral Raise'],['Sixpack','Hanging Leg Raise']],[['Back','Lat Pulldown'],['Biceps','EZ Bar Curl']],[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']],[['Legs','Squat'],['Sixpack','Hanging Leg Raise']],[['Biceps','EZ Bar Curl'],['Triceps','Triceps Pushdown'],['Sixpack','Hanging Leg Raise']],[['Chest','Barbell Bench Press'],['Sixpack','Hanging Leg Raise']]];
  const t=new Date('2026-10-04T12:00');for(let k=62;k>=6;k--){const d=new Date(t);d.setDate(t.getDate()-k);const dow=d.getDay();if(dow===0)continue;const iso=d.toLocaleDateString('en-CA');(days[iso]=days[iso]||{w:[]}).w.push({part:'Run',ex:'Run',km:3.2,min:20,at:Date.parse(iso+'T07:00')});for(const [pt,ex] of six[dow-1])add(iso,pt,ex);}
  DB={days,settings:{onboarded:true,unit:'lb',skin:'minimal',theme,bar:theme,mascotMotion:'still',weekStart:'monday',objective:'grow',plannerPreferences:{avoid:[],trainDays:[1,2,3,4,5]}}};todayISO='2026-10-04';checkDate=()=>false;
  document.querySelector('#onb')?.remove();migrateCanon();SEED=deriveAll();applyTheme();save=()=>{};
  view='today';render();await new Promise(r=>setTimeout(r,400));pw().dates=[];pw().active=null;pwOpen(null,'dates');pfHandle('pf-prefs',{dataset:{}});await new Promise(r=>setTimeout(r,600));
 },theme);
 const dom=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],card=document.querySelector('.pf-split'),cr=card.getBoundingClientRect();
  return {tiles:q('.pf-tile').map(e=>e.dataset.value+(e.classList.contains('on')?'*':'')).join(' '),subs:q('.pf-tile small').map(e=>e.textContent),parts:q('.pf-mypart').map(e=>e.dataset.part+(e.classList.contains('on')?'*':'')).join(' '),
   pal:q('.pf-pal-chip').map(e=>e.textContent+(e.classList.contains('held')?'*':'')).join(' '),hint:document.querySelector('.pf-pal-h em')?.textContent||'',
   rows:q('.pf-ses').map(r=>[...r.querySelectorAll('.pf-rot-tag')].map(e=>e.textContent.trim()).join(' ')),ghost:q('.pf-ses').map(r=>r.querySelector('.pf-rot-ghost')?1:0).join(''),hit:q('.pf-ses').map(r=>r.querySelector('.pf-rot-tag.hit')?1:0).join(''),
   next:q('.pf-ses.next').map(r=>+r.dataset.pfRot+1),up:q('.pf-up span').map(x=>x.textContent),note:document.querySelector('.pf-split-note')?.textContent||'',empty:q('.pf-ses-in>em').length,
   over:q('.pf-split *').filter(e=>{const r=e.getBoundingClientRect();return r.width&&(r.right>cr.right+0.5||r.left<cr.left-0.5);}).map(e=>e.className||e.tagName).slice(0,4),sw:document.documentElement.scrollWidth,vw:innerWidth,
   order:q('.pf-prefs>.card>h3').map(e=>e.textContent).join('|'),grip:q('.pf-rot-grip').map(e=>Math.round(e.getBoundingClientRect().height)),chipH:q('.pf-pal-chip').map(e=>Math.round(e.getBoundingClientRect().height)),xW:q('.pf-rot-x').map(e=>Math.round(e.getBoundingClientRect().width))};});
 const see=sel=>p.evaluate(sel=>document.querySelector(sel).scrollIntoView({block:'center'}),sel);
 const mid=sel=>p.evaluate(sel=>{const r=document.querySelector(sel).getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,l:r.left,r:r.right,t:r.top,b:r.bottom};},sel);
 const tapSel=async sel=>{await see(sel);await p.waitForTimeout(60);await p.tap(sel);await p.waitForTimeout(260);};
 const drag=async(from,to,probe)=>{await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(from.x+6,from.y+12,{steps:3});await p.mouse.move(to.x,to.y,{steps:10});await p.waitForTimeout(80);const m=probe?await p.evaluate(()=>({fly:document.querySelector('.pf-fly')?.textContent||'',drop:[...document.querySelectorAll('.pf-ses.pf-drop')].map(e=>+e.dataset.pfRot+1).join(),lift:document.querySelectorAll('.pf-lift').length})):null;await p.mouse.up();await p.waitForTimeout(300);return m;};
 let d=await dom();
 ok(`${tag} Body parts you train, then Your split, sit between Your week and Each session`,d.order==='What are you training for?|Your week|Body parts you train|Your split|Each session|Exercises',d.order);
 ok(`${tag} with nothing saved: six choices, No split lit, no sessions and no chip strip yet`,d.tiles==='body ppl ul full own none*'&&!d.rows.length&&!d.pal&&/for each day/.test(d.note),d);
 await tapSel('.pf-tile[data-value="body"]');d=await dom();
 ok(`${tag} tap Body part: seven sessions, the tile counting them, and the strip of chips with Cardio first`,d.tiles==='body* ppl ul full own none'&&d.rows.join('|')==='Chest|Back|Shoulder|Legs|Biceps|Triceps|Sixpack'&&d.subs[0]==='7 sessions · one part each'&&d.pal==='Cardio Chest Back Shoulder Legs Biceps Triceps Sixpack'&&/Drag onto a session, or tap one/.test(d.hint),d);
 await tapSel('.pf-mypart[data-part="Legs"]');d=await dom();
 ok(`${tag} Legs off in Body parts you train: it leaves the strip and the split`,d.rows.length===6&&!/Legs/.test(d.pal)&&d.subs[0]==='6 sessions · one part each',d);
 await tapSel('.pf-mypart[data-part="Legs"]');
 /* v4.6.209: select sessions by their number, then a body part goes into all of them */
 const look=()=>p.evaluate(()=>{const q=s=>[...document.querySelectorAll(s)],bg=e=>getComputedStyle(e).backgroundColor,pr=document.createElement('i');pr.style.cssText='position:absolute;background:var(--accent)';document.body.append(pr);const acc=bg(pr);pr.remove();
  const tiles=q('.pf-tile').map(e=>e.getBoundingClientRect()),nx=document.querySelector('.pf-ses.next'),lab=nx&&nx.querySelector('.pf-rot-next'),un=document.querySelector('.pf-unsel'),fl=document.querySelector('.pf-fill');
  return {acc,sel:q('.pf-ses.sel').map(r=>+r.dataset.pfRot+1).join(),selBg:q('.pf-ses.sel>.pf-rot-n').map(bg),restBg:q('.pf-ses:not(.sel)>.pf-rot-n').map(bg),nextSel:nx?nx.classList.contains('sel'):null,label:lab?lab.textContent.trim():'',labelBg:lab?bg(lab):'',
   bar:document.querySelector('.pf-selbar b')?.textContent||'',unH:un?Math.round(un.getBoundingClientRect().height):0,all:q('.pf-pal-chip.all').map(e=>e.textContent).join(),nH:q('.pf-rot-n').map(e=>{const r=e.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));}),
   tileW:[...new Set(tiles.map(r=>Math.round(r.width)))].length,tileRows:[...new Set(tiles.map(r=>Math.round(r.top)))].length,fill:fl?fl.textContent.trim():'',fillH:fl?Math.round(fl.getBoundingClientRect().height):0,did:document.querySelector('.pf-did')?.textContent.trim()||'',
   fillIn:fl?(()=>{const a=fl.getBoundingClientRect(),c=document.querySelector('.pf-split').getBoundingClientRect();return a.right<=c.right+0.5&&a.left>=c.left;})():false};});
 let L=await look();
 ok(`${tag} six tiles of one size in three rows; Next up is a label on its session, and no number is filled blue until you select one`,L.tileW===1&&L.tileRows===3&&L.label==='Next up'&&L.labelBg!==L.acc&&!L.selBg.length&&L.restBg.every(c=>c!==L.acc)&&L.nH.every(n=>n>=28),L);
 await tapSel('.pf-ses[data-pf-rot="0"] .pf-rot-n');await tapSel('.pf-ses[data-pf-rot="2"] .pf-rot-n');await tapSel('.pf-ses[data-pf-rot="3"] .pf-rot-n');L=await look();d=await dom();
 ok(`${tag} tap 1, 3 and 4: those three are selected and filled blue, the others are not, and the strip says "3 selected" with Unselect all`,L.sel==='1,3,4'&&L.selBg.length===3&&L.selBg.every(c=>c===L.acc)&&L.restBg.every(c=>c!==L.acc)&&L.bar==='3 selected'&&L.unH>=28&&/Tap a body part to add it/.test(d.hint)&&!d.over.length&&d.sw<=d.vw,{L,hint:d.hint,over:d.over});
 await tapSel('.pf-pal-chip[data-pf-chip="Sixpack"]');L=await look();d=await dom();
 ok(`${tag} tap Sixpack: it is in all three, its chip is lit, and they stay selected`,d.rows.join('|')==='Chest Sixpack|Back|Shoulder Sixpack|Legs Sixpack|Biceps|Triceps|Sixpack'&&L.all==='Sixpack'&&L.sel==='1,3,4'&&d.tiles==='body ppl ul full own* none',{rows:d.rows,L});
 await tapSel('.pf-pal-chip[data-pf-chip="Run"]');d=await dom();
 ok(`${tag} tap Cardio: first in each of the three`,d.rows[0]==='Cardio Chest Sixpack'&&d.rows[2]==='Cardio Shoulder Sixpack'&&d.rows[3]==='Cardio Legs Sixpack'&&d.rows[1]==='Back',d.rows);
 if(SHOT&&w===402){await p.evaluate(()=>{document.querySelector('.pf-split').scrollIntoView({block:'start'});scrollBy(0,-110);});await p.waitForTimeout(250);await p.screenshot({path:`${SHOT}/split-selected-${theme}.png`});}
 await tapSel('.pf-pal-chip[data-pf-chip="Sixpack"]');d=await dom();
 ok(`${tag} tap the lit Sixpack: out of all three`,d.rows[0]==='Cardio Chest'&&d.rows[2]==='Cardio Shoulder'&&d.rows[3]==='Cardio Legs'&&d.rows[6]==='Sixpack',d.rows);
 await tapSel('.pf-unsel');L=await look();d=await dom();
 ok(`${tag} Unselect all: none selected, no blue number, the strip is back to Body parts, and the sessions are as they were`,L.sel===''&&!L.bar&&!L.selBg.length&&L.restBg.every(c=>c!==L.acc)&&/Drag onto a session, or tap one/.test(d.hint)&&d.rows[0]==='Cardio Chest',{L,hint:d.hint});
 /* Fill for me: from the log */
 const was=d.rows.join('|');L=await look();
 ok(`${tag} Fill for me sits beside "The order you train in", inside the card`,L.fill==='Fill for me'&&L.fillH>=30&&L.fillIn,L);
 await tapSel('.pf-fill');L=await look();d=await dom();
 ok(`${tag} tap it: the six sessions come back from the log, Chest twice, cardio first, starting on Monday's Shoulder`,d.rows.join('|')==='Cardio Shoulder Sixpack|Cardio Back Biceps|Cardio Chest Sixpack|Cardio Legs Sixpack|Cardio Biceps Triceps Sixpack|Cardio Chest Sixpack',d.rows);
 ok(`${tag} ...it says what it read, and the button is Undo`,/^Filled from your last \d weeks: 6 sessions, cardio before each\. Change anything with the chips\.$/.test(L.did)&&L.fill==='Undo'&&!d.over.length&&d.sw<=d.vw,L);
 if(SHOT&&w===402){await p.evaluate(()=>{document.querySelector('.pf-split').scrollIntoView({block:'start'});scrollBy(0,-110);});await p.setViewportSize({width:402,height:1400});await p.waitForTimeout(250);await p.screenshot({path:`${SHOT}/split-filled-${theme}.png`});await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);}
 await tapSel('.pf-fill');L=await look();d=await dom();
 ok(`${tag} Undo: back to what was there, and Fill for me is offered again`,d.rows.join('|')===was&&L.fill==='Fill for me'&&!L.did,{rows:d.rows,L});
 /* No split */
 await tapSel('.pf-tile[data-value="none"]');d=await dom();
 ok(`${tag} tap No split: it is lit, the sessions and the strip are gone, and your own sessions are kept`,d.tiles==='body ppl ul full own none*'&&!d.rows.length&&!d.pal&&/Your own sessions are kept under My own/.test(d.note),d);
 await tapSel('.pf-tile[data-value="own"]');d=await dom();
 ok(`${tag} ...and My own brings them back`,d.rows.join('|')===was&&d.tiles==='body ppl ul full own* none',d.rows);
 await p.evaluate(()=>{const j=pfState(),r=j.prefs.rotation;r.preset=null;r.sessions=[];r.own=null;j.rotSel=[];pfSplitRefresh();});
 /* My own, from nothing, by hand */
 await tapSel('.pf-tile[data-value="own"]');d=await dom();
 ok(`${tag} My own starts with one empty box asking for a body part`,d.tiles==='body ppl ul full own* none'&&d.rows.length===1&&d.rows[0]===''&&d.empty===1,d);
 /* tap to pick up, tap where it belongs */
 await tapSel('.pf-pal-chip[data-pf-chip="Shoulder"]');d=await dom();
 ok(`${tag} tap Shoulder in the strip: it is held, the hint changes, the box offers "+ Shoulder"`,/Shoulder\*/.test(d.pal)&&/Tap the sessions Shoulder belongs in/.test(d.hint)&&d.ghost==='1',d);
 await tapSel('.pf-ses[data-pf-rot="0"]');d=await dom();
 ok(`${tag} tap the box: Shoulder is in, lit; nothing more to offer there`,d.rows[0]==='Shoulder'&&d.hit==='1'&&d.ghost==='0',d);
 await tapSel('.pf-pal-chip[data-pf-chip="Shoulder"]');d=await dom();
 ok(`${tag} tap the held chip again: put down`,!/\*/.test(d.pal)&&/Drag onto a session/.test(d.hint),d);
 for(let k=0;k<5;k++)await tapSel('[data-pw="pf-rot-add"]');d=await dom();
 ok(`${tag} + Add a session five times: six boxes`,d.rows.length===6&&d.empty===5,d.rows);
 /* a real drag from the strip */
 await see('.pf-ses[data-pf-rot="1"]');await p.waitForTimeout(100);
 let m=await drag(await mid('.pf-pal-chip[data-pf-chip="Back"]'),await mid('.pf-ses[data-pf-rot="1"]'),true);d=await dom();
 ok(`${tag} drag Back from the strip: the chip flies under the pointer, session 2 lights, and on release Back is in it`,m.fly==='Back'&&m.drop==='2'&&m.lift===1&&d.rows[1]==='Back'&&d.pal.includes('Back'),{m,rows:d.rows});
 if(SHOT&&w===402){const from=await mid('.pf-pal-chip[data-pf-chip="Biceps"]'),to=await mid('.pf-ses[data-pf-rot="1"]');await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(from.x+6,from.y+12,{steps:3});await p.mouse.move(to.x+40,to.y,{steps:8});await p.waitForTimeout(120);await p.screenshot({path:`${SHOT}/split-drag-${theme}.png`});await p.mouse.up();await p.waitForTimeout(300);}
 else await drag(await mid('.pf-pal-chip[data-pf-chip="Biceps"]'),await mid('.pf-ses[data-pf-rot="1"]'));
 d=await dom();ok(`${tag} ...and Biceps after it: one session, two body parts`,d.rows[1]==='Back Biceps',d.rows);
 /* the rest of the six, then Sixpack by tapping */
 await p.evaluate(()=>{const r=pfState().prefs.rotation;[[2,'Chest'],[3,'Legs'],[4,'Biceps'],[4,'Triceps'],[5,'Chest']].forEach(([i,t])=>pfRotPut(r,i,t));pfSplitRefresh();});
 await tapSel('.pf-pal-chip[data-pf-chip="Sixpack"]');for(const i of [0,2,3,4,5])await tapSel(`.pf-ses[data-pf-rot="${i}"]`);d=await dom();
 ok(`${tag} hold Sixpack and tap five sessions: it lands in each, and the one left out still offers it`,d.rows.join('|')==='Shoulder Sixpack|Back Biceps|Chest Sixpack|Legs Sixpack|Biceps Triceps Sixpack|Chest Sixpack'&&d.ghost==='010000'&&d.hit==='101111',d);
 await tapSel('.pf-pal-chip[data-pf-chip="Sixpack"]');
 /* Cardio: dragged to the front of one, tapped into the rest */
 await see('.pf-ses[data-pf-rot="0"]');await p.waitForTimeout(100);
 {const first=await mid('.pf-ses[data-pf-rot="0"] .pf-rot-tag');await drag(await mid('.pf-pal-chip[data-pf-chip="Run"]'),{x:first.l+4,y:first.y});}
 d=await dom();ok(`${tag} drag Cardio onto the left of session 1's first chip: it goes in FIRST`,d.rows[0]==='Cardio Shoulder Sixpack',d.rows);
 await tapSel('.pf-pal-chip[data-pf-chip="Run"]');for(const i of [1,2,3,4,5])await tapSel(`.pf-ses[data-pf-rot="${i}"]`);await tapSel('.pf-pal-chip[data-pf-chip="Run"]');d=await dom();
 ok(`${tag} hold Cardio and tap the other five: it goes first in each (before lifting)`,d.rows.every(x=>x.startsWith('Cardio '))&&d.rows[4]==='Cardio Biceps Triceps Sixpack',d.rows);
 ok(`${tag} Next up is read from the log, cardio and all (Shoulder was last, so Back + Biceps), and Coming up says Cardio`,d.next.join()==='2'&&d.up[0]==='Mon, 10/5Cardio + Back + Biceps'&&d.up.length===5&&!/Run/.test(d.up.join()),d);
 ok(`${tag} nothing overflows the card or the screen; chips, handles and the x are tappable sizes`,!d.over.length&&d.sw<=d.vw&&d.grip.every(n=>n>=30)&&d.chipH.every(n=>n>=32)&&d.xW.every(n=>n>=24),d);
 /* the strip stays in reach */
 const stick=await p.evaluate(async()=>{document.querySelector('.pf-ses[data-pf-rot="5"]').scrollIntoView({block:'center'});await new Promise(r=>setTimeout(r,250));const pr=document.querySelector('.pf-pal').getBoundingClientRect(),hb=document.querySelector('header').getBoundingClientRect().bottom,s6=document.querySelector('.pf-ses[data-pf-rot="5"]').getBoundingClientRect(),first=document.querySelector('.pf-tiles').getBoundingClientRect();return {top:Math.round(pr.top),hb:Math.round(hb),bottom:Math.round(pr.bottom),s6:Math.round(s6.top),tilesGone:first.bottom<hb,h:innerHeight};});
 ok(`${tag} scrolled down to session 6, the strip is pinned just under the header, above it, on screen`,stick.top>=stick.hb&&stick.top<=stick.hb+24&&stick.bottom<=stick.h*0.42&&stick.tilesGone,stick);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/split-pinned-${theme}.png`});
 /* the x, a drag between sessions, a drag out */
 await tapSel('.pf-ses[data-pf-rot="5"] .pf-rot-tag[data-pf-chip="Sixpack"] .pf-rot-x');d=await dom();
 ok(`${tag} the x takes Sixpack out of session 6 only`,d.rows[5]==='Cardio Chest'&&d.rows[4].includes('Sixpack'),d.rows);
 await see('.pf-ses[data-pf-rot="4"]');await p.waitForTimeout(100);
 await drag(await mid('.pf-ses[data-pf-rot="4"] .pf-rot-tag[data-pf-chip="Sixpack"]'),await mid('.pf-ses[data-pf-rot="5"] .pf-rot-n'));d=await dom();
 ok(`${tag} drag a chip from session 5 to session 6: it moves`,d.rows[4]==='Cardio Biceps Triceps'&&d.rows[5].includes('Sixpack'),d.rows);
 {const f=await mid('.pf-ses[data-pf-rot="5"] .pf-rot-tag[data-pf-chip="Sixpack"]');const out=await p.evaluate(()=>{const r=document.querySelector('.pf-rot-add').getBoundingClientRect();return {x:r.left+40,y:r.top+10};});await drag(f,out);d=await dom();ok(`${tag} let go of a chip on empty space: nothing changes`,d.rows[5].includes('Sixpack'),d.rows);
  await see('.pf-ses[data-pf-rot="5"]');await p.waitForTimeout(100);await drag(await mid('.pf-ses[data-pf-rot="5"] .pf-rot-tag[data-pf-chip="Sixpack"]'),await mid('.pf-pal-h'));}
 d=await dom();ok(`${tag} carry a chip back to the strip: it is taken out of that session`,d.rows[5]==='Cardio Chest',d.rows);
 await p.evaluate(()=>{const r=pfState().prefs.rotation;pfRotPut(r,4,'Sixpack');pfRotPut(r,5,'Sixpack');pfSplitRefresh();});
 /* under a finger: a swipe that starts on a session chip scrolls the page and moves nothing; a short hold picks the chip up */
 {const cdp=await p.context().newCDPSession(p);await see('.pf-ses[data-pf-rot="2"]');await p.waitForTimeout(150);
  const before=(await dom()).rows.join('|'),c=await mid('.pf-ses[data-pf-rot="2"] .pf-rot-tag[data-pf-chip="Sixpack"]'),y0=await p.evaluate(()=>scrollY);
  const T=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1}]});
  await T('touchStart',c.x,c.y);for(let k=1;k<=8;k++){await T('touchMove',c.x,c.y-12*k);await p.waitForTimeout(16);}await T('touchEnd');await p.waitForTimeout(400);
  const sw=await p.evaluate(()=>({y:scrollY,fly:document.querySelectorAll('.pf-fly').length}));d=await dom();
  ok(`${tag} a finger swipe that starts on a session chip scrolls the page and moves nothing`,d.rows.join('|')===before&&sw.fly===0&&sw.y>y0+20,{sw,y0,rows:d.rows});
  await p.evaluate(()=>{const e=document.querySelector('.pf-ses[data-pf-rot="1"]'),pb=document.querySelector('.pf-pal').getBoundingClientRect().bottom;scrollBy(0,e.getBoundingClientRect().top-pb-14);});await p.waitForTimeout(200);
  const c2=await mid('.pf-ses[data-pf-rot="2"] .pf-rot-tag[data-pf-chip="Sixpack"]'),t2=await mid('.pf-ses[data-pf-rot="1"] .pf-rot-n');
  await T('touchStart',c2.x,c2.y);await p.waitForTimeout(320);const lifted=await p.evaluate(()=>document.querySelectorAll('.pf-ses .pf-rot-tag.pf-lift').length);
  for(let k=1;k<=8;k++){await T('touchMove',c2.x+(t2.x-c2.x)*k/8,c2.y+(t2.y-c2.y)*k/8);await p.waitForTimeout(16);}await p.waitForTimeout(80);const fly=await p.evaluate(()=>document.querySelector('.pf-fly')?.textContent||'');await T('touchEnd');await p.waitForTimeout(350);d=await dom();
  ok(`${tag} hold a session chip a moment: it lifts; carry it to another session and it moves there`,lifted===1&&fly==='Sixpack'&&d.rows[1].includes('Sixpack')&&!d.rows[2].includes('Sixpack'),{lifted,fly,rows:d.rows});
  await p.evaluate(()=>{const r=pfState().prefs.rotation;r.sessions[1].parts=r.sessions[1].parts.filter(x=>x!=='Sixpack');pfRotPut(r,2,'Sixpack');pfSplitRefresh();});await cdp.detach();}
 /* the session handle still reorders */
 await see('.pf-ses[data-pf-rot="4"]');await p.waitForTimeout(150);
 {const t=await mid('.pf-ses[data-pf-rot="4"]'),g=await mid('[data-pf-rot-grip="5"]');await drag(g,{x:t.l+22,y:t.y});}d=await dom();
 ok(`${tag} drag a session by its handle: it lands where it was dropped`,d.rows[4]==='Cardio Chest Sixpack'&&d.rows[5]==='Cardio Biceps Triceps Sixpack',d.rows);
 await p.evaluate(()=>{const r=pfState().prefs.rotation;const [x]=r.sessions.splice(4,1);r.sessions.push(x);pfRotTouch(r);pfSplitRefresh();});
 if(SHOT&&w===402){await p.evaluate(()=>{document.querySelector('.pf-split').scrollIntoView({block:'start'});scrollBy(0,-110);});await p.setViewportSize({width:402,height:1500});await p.evaluate(()=>{const dk=document.querySelector('.pw-save-dock');if(dk)dk.style.visibility='hidden';document.getElementById('nav').style.visibility='hidden';});await p.waitForTimeout(300);await p.screenshot({path:`${SHOT}/split-built-${theme}.png`});
  await p.tap('.pf-pal-chip[data-pf-chip="Triceps"]');await p.waitForTimeout(300);await p.screenshot({path:`${SHOT}/split-held-${theme}.png`});await p.tap('.pf-pal-chip[data-pf-chip="Triceps"]');await p.waitForTimeout(200);
  await p.evaluate(()=>{const dk=document.querySelector('.pw-save-dock');if(dk)dk.style.visibility='';document.getElementById('nav').style.visibility='';});await p.setViewportSize({width:w,height:h});await p.waitForTimeout(200);}
 /* save, Dates, and a generated day */
 await tapSel('[data-pw="pf-prefs-save"]');await p.waitForTimeout(400);
 const st=await p.evaluate(async()=>{pw().dates=[];pw().active=null;pwOpen(null,'dates');await new Promise(r=>setTimeout(r,500));return {rot:DB.settings.plannerPreferences.rotation,days:pw().dates.map(d=>d.slice(5)+' '+pwDay(d).parts.join('+')).join(' | '),line:(document.querySelector('.pf-split-line')?.textContent||'').replace(/\s+/g,' '),brk:document.querySelector('.pf-date-breakdown').textContent};});
 ok(`${tag} Save stores the six with Cardio first in each; Dates opens with each day carrying its parts in that order`,st.rot&&st.rot.sessions.length===6&&st.rot.sessions.every(x=>x.parts[0]==='Run')&&st.days==='10-05 Run+Back+Biceps | 10-06 Run+Chest+Sixpack | 10-07 Run+Legs+Sixpack | 10-08 Run+Biceps+Triceps+Sixpack | 10-09 Run+Chest+Sixpack',st);
 ok(`${tag} ...as new days, with a line naming each, Cardio included`,/^5 new days$/.test(st.brk)&&/^Mon Cardio \+ Back \+ Biceps/.test(st.line),st);
 await p.evaluate(()=>{window.__pl=null;writerWaitStart=()=>{};writeSession=async pl=>{window.__pl=pl;return {days:pw().dates.map(d=>({date:d,part:'Back',title:'x',text:'Lat Pulldown\n  50 lb × 10 10 10 10\n\nEZ Bar Curl\n  50 lb × 10 10 10'})),reason:null};};});
 await p.getByText('Plan 5 new days').tap();await p.waitForTimeout(1500);
 const ed=await p.evaluate(async()=>{pw().active='2026-10-05';pwRender();await new Promise(r=>setTimeout(r,400));const ex=[...document.querySelectorAll('.pw-exercises>*')];
  return {page:pfState().page,note:/Do not write cardio lines/.test(window.__pl?.note||''),first:ex[0]?.className||'',name:ex[0]?.querySelector('strong')?.textContent,tag:ex[0]?.querySelector('.pf-mtag')?.textContent,line:ex[0]?.querySelector('.pf-cardio-line')?.textContent,cardio:document.querySelectorAll('.pf-cardio').length,unread:document.querySelectorAll('.pw-unread').length,sel:[...document.querySelectorAll('.pf-part.selected')].map(e=>e.textContent.trim()).join(),hint:document.querySelector('.pf-set-hint,.pf-count-hint')?.textContent||document.getElementById('view').textContent.match(/\d+ sets · \d+ exercises/)?.[0]||'',fits:(()=>{const a=document.querySelector('.pf-cardio'),c=a.closest('.card')||a.parentElement;return a.getBoundingClientRect().right<=c.getBoundingClientRect().right+0.5;})()};});
 ok(`${tag} a planned day opens with its cardio line, as a row tagged Cardio (your last cardio, as logged), not a block of text`,ed.page==='edit'&&ed.note&&/pf-cardio/.test(ed.first)&&ed.name==='Run'&&ed.tag==='Cardio'&&/20 min/.test(ed.line)&&ed.cardio===1&&ed.unread===0&&ed.fits,ed);
 ok(`${tag} ...and the day's body parts show Cardio selected with the rest`,/Cardio/.test(ed.sel)&&/Back/.test(ed.sel)&&/Biceps/.test(ed.sel),ed.sel);
 if(SHOT&&w===402)await p.screenshot({path:`${SHOT}/split-cardio-day-${theme}.png`});
 ok(`${tag} no page errors`,!errors.length,errors);
 await p.close();}
}finally{await b.close();}
console.log(bad?`${bad} FAILED`:'all OK');process.exit(bad?1:0);})();
