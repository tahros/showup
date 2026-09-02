// test-writer.js DIR — v3.3.400. THE SESSION WRITER, with the model stubbed.
// The contract is assertable without asserting text: what leaves the device,
// what the guardrails do to what comes back, and how the ask screen behaves.
// WRITER_STUB replaces the network; every response below is a stub, and the
// probes are the same as always: revert a guardrail, watch its line go red.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only",
  pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){
  return new Proxy({measureText:()=>({width:10})},{get:(o,k)=>k in o?o[k]:()=>({})}); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);
const tick = () => new Promise(r => setTimeout(r, 20));

let fail = 0;
const ok = (name, cond, note) => {
  console.log((cond ? "PASS" : "FAIL"), name, note ? "→ " + note : "");
  if (!cond) fail++;
};

/* a ledger: eight weeks of Back / Chest / Legs, Deadlift best 100 kg, no shoulders ever */
run(`(function(){DB.days={}; DB.plan=null; DB.week=null; DB.suggest=null; delete DB.settings.dayDone; delete DB.settings.objective;
  DB.settings.myParts=['Back','Chest','Legs','Shoulder'];
  for(let i=1;i<=56;i++){ const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-i); const iso=d.toLocaleDateString('en-CA');
    const k=i%3; if(d.getDay()===0) continue;
    DB.days[iso]={w:[k===0?{part:'Back',ex:'Deadlift',w:i%9===0?100:90,reps:[5,5,5],at:1}:k===1?{part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8,8],at:1}:{part:'Legs',ex:'Squat',w:95,reps:[8,8],at:1}],upd:1}; }
  DB.settings.unit='lb'; DB.settings.onboarded=true; SEED=deriveAll(); view='today'; lift.plan=null; lift.write=null; render();})()`);

/* ---- the door ---- */
ok("the plan line's door is Write, with the sparkle", run(`(function(){const b=document.querySelector('[data-planwrite]'); return !!b && !!b.querySelector('.ic-sparkle') && /Write/.test(b.textContent);})()`));
run(`document.querySelector('[data-planwrite]').click()`);
ok("tapping it opens the ask screen", run(`lift.plan==='write' && !!document.querySelector('.writecard')`));
ok("...three scopes: today, tomorrow, this week", run(`document.querySelectorAll('[data-writescope]').length`)===3);
ok("...with nothing logged, the ledger picks today", run(`writerState().scope==='today'`) && run(`document.querySelector('[data-writescope="today"]').classList.contains('sel')`));
ok("...For defaults to the writer's call and names the rotation's pick beside it",
   run(`writerState().part==='auto'`) && /rotation says/.test(run(`document.querySelector('.writecard').textContent`)));
ok("...the objective defaults to Grow and is remembered when tapped",
   run(`writerState().objective==='grow'`) && (run(`document.querySelector('[data-writeobj="strength"]').click(); DB.settings.objective`)==='strength'));
ok("...the privacy line says what leaves", /Eight weeks of your sets, every part/.test(run(`document.querySelector('.writecard').textContent`)));
ok("Paste one instead is the old door, one tap on", run(`(function(){document.querySelector('[data-writepaste]').click(); return lift.plan==='paste';})()`));
run(`(function(){lift.plan=null; render(); document.querySelector('[data-planwrite]').click();})()`);
ok("Cancel returns to Today with nothing changed", run(`(function(){document.querySelector('[data-writeback]').click(); return lift.plan===null && !DB.plan;})()`));

/* ---- the ledger rule on the seg ---- */
run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8],at:1}); save(true); lift.write=null; lift.plan='write'; render();})()`);
ok("with a set in the record, the seg defaults to tomorrow", run(`writerState().scope==='tomorrow'`));
ok("...and says why", /in the record already|writes .* and opens it at midnight/.test(run(`(function(){document.querySelector('[data-writescope="today"]').click(); return document.querySelector('.writecard').textContent;})()`)));
run(`(function(){DB.days[todayISO].w=[]; save(true); lift.write=null; lift.plan='write'; render();})()`);

/* ---- what leaves the device ---- */
const pay = JSON.parse(run(`JSON.stringify(writerPayload(writerState()))`));
ok("the payload is a day for today with the rotation's ranking", pay.scope==='day' && pay.days.length===1 && pay.days[0]===run(`todayISO`) && !!pay.rotation.pick && pay.rotation.ranking.length>=3);
ok("...the part is null: the writer's call", pay.part===null);
ok("...eight weeks of sets, every part, nothing older", pay.history.length>40 && pay.history.every(h=>h[0]>=run(`(function(){const d=new Date(todayISO+'T00:00'); d.setDate(d.getDate()-56); return d.toLocaleDateString('en-CA');})()`)));
ok("...the catalog for the parts you train, nothing else", Object.keys(pay.catalog).sort().join()==='Back,Chest,Legs,Shoulder');
ok("...a coverage table with the zero-set heads spelled out", pay.coverage.Shoulder && Object.values(pay.coverage.Shoulder).every(v=>v===0) && pay.coverage.Back && Object.values(pay.coverage.Back).some(v=>v>0));
/* v3.3.405: the app has always known which head an exercise trains; the writer
   was only ever handed the counts, never the mapping, and put a Dip in an
   incline session. The mapping goes out now. */
ok("...and which head each catalog exercise trains, grouped by head",
   !!pay.heads && !!pay.heads.Chest && Object.keys(pay.heads.Chest).length>=2, JSON.stringify(Object.keys(pay.heads||{})));
ok("...so an incline press and a Dip are visibly different movements",
   pay.heads.Chest['upper-chest'].includes('Incline Barbell Bench Press') &&
   pay.heads.Chest['chest'].includes('Dip') &&
   !pay.heads.Chest['upper-chest'].includes('Dip'), JSON.stringify(pay.heads.Chest));
ok("...and every catalog exercise is placed, none left out",
   Object.entries(pay.catalog).every(([p2,list])=>{ const flat=Object.values(pay.heads[p2]||{}).flat();
     return list.every(ex=>flat.includes(ex)); }));
ok("...and neither a name nor a day count", !JSON.stringify(pay).includes('"name"') && !('sessions' in pay) && !('totals' in pay));
ok("...under 60 KB", JSON.stringify(pay).length<60000, JSON.stringify(pay).length+' bytes');

/* ---- guardrails on stubbed answers ---- */
const check = (resp) => run(`(function(){try{ const o=writerState(); const p=writerPayload(o); const r=writerCheck(${JSON.stringify(resp)},{payload:p});
  return JSON.stringify({ok:true, ex:r.rows.filter(x=>x.kind==='ex'&&x.ex).map(x=>x.ex), notes:r.notes, reason:r.reason, est:r.rows.filter(x=>x.kind==='ex'&&x.ex).map(x=>({ex:x.ex,est:x.lines.some(l=>l.est),w:x.lines[0]&&x.lines[0].w}))});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`);
const today = run(`todayISO`);
let r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  220 lb x 5 5 5\n\nBent-Over Row\n  175 lb x 10 10\n\nCable Pullover\n  40 lb x 12 12"}]}));
ok("1 · a name not in your catalog survives as a note, never an item", r.ok && r.ex.join()==='Deadlift,Bent-Over Row' && r.notes.some(n=>/Cable Pullover/.test(n)), JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\n  by feel x 12 12"}]}));
ok("2 · a part that differs from the rotation's without a reason is refused whole", !r.ok && /without a reason/.test(r.refused), r.refused);
r = JSON.parse(check({days:[{date:today,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\n  by feel x 12 12"}],reason:{head:'Shoulder, not Back',text:'Nothing on record for shoulders in eight weeks.'}}));
ok("...and with a reason it is kept, reason and all", r.ok && r.reason && r.reason.head==='Shoulder, not Back');
r = JSON.parse(check({days:[{date:today,part:'Biceps',title:'Arms',text:"Barbell Curl\n  50 lb x 10"}],reason:{head:'x',text:'y'}}));
ok("...a part you do not train is refused", !r.ok && /not one you train/.test(r.refused), r.refused);
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  315 lb x 5"}]}));
ok("3 · a load more than 10% above the eight-week best is clamped and marked ≈", r.ok && r.est[0].est===true && Math.abs(r.est[0].w-242.5)<1.5, JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  230 lb x 5"}]}));
ok("...under the ceiling it passes untouched", r.ok && !r.est[0].est && r.est[0].w===230);
/* v3.3.402: the band has ONE side. The first live answer came back with the
   maker's own warm-up ramp under his best, and a symmetric band clamped every
   warm-up UP into a working set. Lighter is free. */
r = JSON.parse(run(`(function(){try{ const o=writerState(); const p=writerPayload(o);
  const rr=writerCheck({days:[{date:'${today}',part:'Back',title:'Back',text:"Deadlift\\n  135 lb x 5            (warm-up)\\n  185 lb x 5\\n  215 lb x 5 5 5"}]},{payload:p});
  const l=rr.rows.find(x=>x.ex==='Deadlift').lines;
  return JSON.stringify({ok:true, w:l.map(x=>x.w), est:l.map(x=>!!x.est), notes:rr.notes});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`));
ok("...and a warm-up ramp under the best survives, every line, unmarked",
   r.ok && JSON.stringify(r.w)==='[135,185,215]' && r.est.every(x=>!x) && !r.notes.length, JSON.stringify(r));
/* Chest: the ledger has Barbell Bench Press, so the 'chest' head has work;
   Machine Chest Press is the same head and has never been lifted. */
r = JSON.parse(check({days:[{date:today,part:'Chest',title:'Chest',text:"Barbell Bench Press\n  150 lb x 8\n\nMachine Chest Press\n  120 lb x 10 10"}],reason:{head:'Chest, not Back',text:'chest is furthest out'}}));
ok("4 · a load for an exercise never lifted, in a head that HAS work, is ≈", r.ok && r.est[1].ex==='Machine Chest Press' && r.est[1].est===true && !r.est[0].est, JSON.stringify(r.est)+' '+JSON.stringify(r.notes));
/* v3.3.405: ≈ claims a guess FROM something. With the whole head empty there is
   nothing to guess from, and a number is invented. The live writer offered
   ≈135 lb for a Standing Calf Raise on a ledger with no calf work at all. */
r = JSON.parse(run(`(function(){try{ const o=writerState(); const p=writerPayload(o);
  const rr=writerCheck({days:[{date:'${today}',part:'Legs',title:'Legs',text:"Squat\\n  205 lb x 8\\n\\nStanding Calf Raise\\n  \\u2248135 lb x 12 12"}],reason:{head:'Legs, not Back',text:'legs are furthest out'}},{payload:p});
  const cr=rr.rows.find(x=>x.ex==='Standing Calf Raise').lines[0];
  return JSON.stringify({ok:true, nw:!!cr.nw, est:!!cr.est, w:cr.w, notes:rr.notes});
  }catch(e){ return JSON.stringify({ok:false, refused:e.refused||String(e)}); }})()`));
ok("13 · a head with no work at all gets no number: by feel, not ≈",
   r.ok && r.nw===true && !r.est && r.w===0 && r.notes.some(n=>/nothing on record for calves/.test(n)), JSON.stringify(r));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5"},{date:today,part:'Back',title:'Back again',text:"Pull Up\n  BW x 8"}]}));
ok("5 · two sessions for one date are refused whole", !r.ok && /two sessions/.test(r.refused));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5"},{date:run(`tomorrowISO()`),part:'Legs',title:'Legs',text:"Squat\n  205 lb x 8"}]}));
ok("6 · a day you did not pick is dropped, and said so", r.ok && r.ex.join()==='Deadlift' && r.notes.some(n=>/not a day you picked/.test(n)));
r = JSON.parse(check({days:[{date:today,part:'Back',title:'Back',text:"Deadlift\n  215 lb x 5\n\nSeated Cable Row\n  by feel x 10\n\nT-Bar Row\n  by feel x 10\n\nPendlay Row\n  by feel x 10"}]}));
ok("7 · a third NEW movement becomes a note", r.ok && r.ex.join()==='Deadlift,Seated Cable Row,T-Bar Row' && r.notes.some(n=>/third new/.test(n)), r.ex.join());
r = JSON.parse(check({days:[]}));
ok("...an empty answer is refused", !r.ok && /empty/.test(r.refused));

/* ---- the whole flow through the stub: tap Write, read back, accept ---- */
run(`WRITER_STUB=async(p)=>{ await new Promise(r=>setTimeout(r,120)); return {days:[{date:p.date,part:'Back',title:'Back + Biceps',text:"Deadlift\\n  215 lb x 5 5 5\\n\\nBent-Over Row\\n  175 lb x 10 10 8 8\\n\\nPull Up\\n  BW +10 x 8 8"}],reason:null}; };`);
run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
/* v3.3.406: the wait is a full screen and a receipt */
ok("Write it takes the screen over: the wait, not the ask", run(`lift.plan==='writing' && !!document.querySelector('.writing') && !document.querySelector('.writecard')`));
ok("...eight weeks of squares, the square that means a day", run(`document.querySelectorAll('.writing .wsq').length`)===56 &&
   run(`[...document.querySelectorAll('.writing .wsq')].every((e,i)=>e.style.getPropertyValue('--i')==String(i))`));
ok("...the sparkle, and one line that says what is happening", run(`!!document.querySelector('.writing .ic-sparkle')`) &&
   /Reading eight weeks/.test(run(`document.getElementById('writeLine').textContent`)));
ok("...no exclamation mark, nothing red", !/!/.test(run(`document.querySelector('.writing').textContent`)) &&
   !/--record|--live/.test((()=>{ const css=fs.readFileSync(path.join(dir,"css/app.css"),"utf8"); const i=css.indexOf('.writing{'); return css.slice(i, i+1400); })()));
ok("...and a Cancel that is the only control", run(`document.querySelectorAll('.writing button').length`)===1 && run(`!!document.querySelector('[data-writecancel]')`));
ok("the square keeps the one ratio, at source", /\.writing \.wsq\{[^}]*border-radius:var\(--sq\)/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
ok("...and reduced motion lights every square and stills the sparkle", /prefers-reduced-motion:reduce\)\{\.writing \.wsq\{animation:none;background:var\(--accent\)\}\.writing \.wspark\{animation:none\}/.test(fs.readFileSync(path.join(dir,"css/app.css"),"utf8")));
await_(async()=>{
  for(let i=0;i<20&&run(`lift.plan==='writing'`);i++) await tick();
  ok("the answer lands on the read-back, read from the writer", run(`lift.plan==='preview'`) && /Read from the writer/.test(run(`document.querySelector('#view h2').textContent`)));
  ok("...with every row resolved and no reason header, since the part is the rotation's", run(`document.querySelectorAll('.planpv.ok').length`)===3 && run(`!document.querySelector('.planreason')`));
  ok("...and nothing saved yet", run(`!DB.plan`));
  run(`document.querySelector('[data-planaccept]').click()`);
  ok("Use today's plan saves it for today, through planSave", run(`!!planNow() && planNow().items.length===3 && DB.plan.d===todayISO`));
  ok("...and the record is untouched", run(`(DB.days[todayISO]&&DB.days[todayISO].w||[]).length`)===0);
  ok("...and Train next walks it", /Deadlift/.test(run(`(document.querySelector('.tnextplan')||{}).textContent||''`)));
  run(`planClear()`);
  /* cancel: back to the ask screen, quietly, nothing saved */
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  ok("Cancel on the wait returns to the ask screen with no error", run(`(function(){document.querySelector('[data-writecancel]').click(); return lift.plan==='write' && !writerState().err && !writerState().busy;})()`));
  for(let i=0;i<20;i++) await tick();
  ok("...and a late answer after a cancel changes nothing", run(`lift.plan==='write' && !DB.plan`));

  /* 8 · the stamp follows the ledger */
  run(`(function(){day(todayISO).w.push({part:'Chest',ex:'Barbell Bench Press',w:70,reps:[8],at:1}); save(true); lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  for(let i=0;i<20&&run(`lift.plan==='writing'`);i++) await tick();
  run(`document.querySelector('[data-planaccept]').click()`);
  ok("8 · with a set logged, the written plan is stamped tomorrow and lies dormant", run(`DB.plan.d===tomorrowISO() && planNow()===null && !!planPending()`) && /opens at midnight/.test(run(`document.querySelector('#view').textContent`)));
  run(`(function(){DB.days[todayISO].w=[]; planClear(); save(true);})()`);

  /* 9 · offline: the rotation stands */
  run(`WRITER_STUB=async(p)=>{ const e=new Error('Failed to fetch'); throw e; };`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  ok("9 · without signal the ask screen says so and nothing is saved", /Needs signal/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)) && run(`!DB.plan && lift.plan==='write'`));
  run(`document.querySelector('[data-writeback]').click()`);
  ok("...and the rotation card stands", run(`!!document.querySelector('[data-go]')`));
  run(`WRITER_STUB=async(p)=>{ const e=new Error('aborted'); e.name='AbortError'; throw e; };`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  /* v3.3.403: a timeout is NOT "needs signal" -- the signal is usually fine
     and the function was merely cold. The two failures say different things. */
  ok("...a timeout says so in its own words, and invites a retry",
     /took too long[\s\S]*tap Write again/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)),
     run(`(document.querySelector('.writeerr')||{}).textContent||''`));
  ok("...and the patience is long enough for a cold function",
     run(`WRITER_TIMEOUT_MS.day`)>=25000 && run(`WRITER_TIMEOUT_MS.week`)>=40000,
     run(`JSON.stringify(WRITER_TIMEOUT_MS)`));
  run(`WRITER_STUB=async(p)=>({days:[{date:p.date,part:'Shoulder',title:'Shoulder',text:"Lateral Raise\\n  by feel x 12"}]});`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writego]').click();})()`);
  await tick(); await tick();
  ok("...a refused answer says why, and nothing is saved", /refused/.test(run(`(document.querySelector('.writeerr')||{}).textContent||''`)) && run(`!DB.plan`));

  /* 10 · a week through the stub, on the days picked */
  run(`WRITER_STUB=async(p)=>({days:p.days.map((d,i)=>({date:d,part:['Back','Chest','Legs'][i%3],title:['Back','Chest','Legs'][i%3],text:['Deadlift\\n  215 lb x 5','Barbell Bench Press\\n  150 lb x 8','Squat\\n  205 lb x 8'][i%3]})).concat([{date:'2099-01-01',part:'Back',title:'x',text:'Deadlift\\n  215 lb x 5'}])});`);
  run(`(function(){lift.write=null; lift.plan='write'; render(); document.querySelector('[data-writescope="week"]').click();})()`);
  ok("10 · the week scope shows the days through Sunday, prefilled from your habit", run(`document.querySelectorAll('[data-writeday]').length`)>=1 &&
     run(`(function(){const span=writerDays(writerState()); return new Date(span[span.length-1]+'T00:00').getDay()===0;})()`) &&
     run(`[...writerState().days].every(iso=>new Date(iso+'T00:00').getDay()!==0)`));
  const picked = run(`writerState().days.size`);
  ok("...the button counts them", new RegExp(`Write ${picked} session`).test(run(`document.querySelector('[data-writego]').textContent`)), run(`document.querySelector('[data-writego]').textContent`));
  run(`document.querySelector('[data-writego]').click()`);
  await tick(); await tick();
  ok("...the read-back shows exactly those days, the stray one dropped", run(`document.querySelectorAll('.planpv.day').length`)===picked && run(`lift.planNotes.some(n=>/2099/.test(n))`));
  run(`document.querySelector('[data-planaccept]').click()`);
  ok("...Use this week saves the week on the week scope", run(`!!weekNow() && Object.keys(weekNow().days).length===${picked} && lift.planScope==='week'`));
  ok("...and today's plan is its first day", picked===0 || run(`(function(){const p=planNow(); const d=weekNow().days[todayISO]; return d?(!!p&&p.fromWeek):true;})()`));
  run(`weekClear()`);

  /* 11 · a Sunday write: one day, and the offer of the following days */
  /* a click would call checkDate() and undo the simulated Sunday, so this
     block drives the state directly and renders */
  run(`(function(){const d=new Date(todayISO+'T00:00'); while(d.getDay()!==0) d.setDate(d.getDate()+1); todayISO=d.toLocaleDateString('en-CA'); SEED=deriveAll(); lift.write=null; lift.plan='write'; writerState().scope='week'; render();})()`);
  ok("11 · on a Sunday the week is one day", run(`writerDays(writerState()).length`)===1 && run(`!!document.querySelector('[data-writenext="1"]')`), run(`JSON.stringify(writerDays(writerState()))`));
  run(`(function(){const o=writerState(); o.nextWeek=true; o.days=null; render();})()`);
  ok("...Next week extends it through the following Sunday", run(`writerDays(writerState()).length`)===8 && run(`!document.querySelector('[data-writenext="1"]')`));
  run(`todayISO=new Date().toLocaleDateString('en-CA'); SEED=deriveAll(); lift.plan=null; lift.write=null; render();`);

  /* 12 · never scored, never written: the writer's files are under the same wall */
  const wsrc = fs.readFileSync(path.join(dir,"js/writer.js"),"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
  ok("12 · writer.js never touches the record", !/DB\.days\s*\[[^\]]*\]\s*=|\.w\.push|DB\.days\[[^\]]+\]\.w\s*=/.test(wsrc));
  ok("...and never counts a plan", !/planLoggedToday|adheren|completed|remaining|missed/i.test(wsrc));

  process.exit(fail ? 1 : 0);
});
function await_(f){ f().catch(e=>{ console.log("CRASH", e && e.stack || e); process.exit(1); }); }
