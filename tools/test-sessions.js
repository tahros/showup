// test-planedit.js DIR — v4.6.67: Edit Plan is the same screen as Edit Logged.
// The plan column edits in place; the saved plan and today's frozen copy must
// agree afterwards, no target id may move, and logged sets stay linked.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);
let fail=0;
const ok=(name,cond,note)=>{console.log((cond?"PASS":"FAIL"),name,note!==undefined?"→ "+note:"");if(!cond)fail++;};


/* v4.6.69: a day can hold more than one workout. Complete closes a session;
   a 2-hour gap opens a new one. The bar and the card describe the SESSION;
   the day stays the day. Times below are minutes-from-midnight, today. */
const T=hm=>{const [h,m]=hm.split(':').map(Number);return new Date(todayLocal()+'T00:00').getTime()+(h*60+m)*60000;};
function todayLocal(){return run(`todayISO`);}
const seed=(sets,closed)=>run(`(function(){DB.days={};DB.settings.unit='lb';DB.settings.onboarded=true;
  DB.days[todayISO]={w:${JSON.stringify(sets.map(at=>({part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[15],at})))},doneEx:[],donePart:[],upd:1${closed?`,closed:${JSON.stringify(closed)}`:''}};
  SEED=deriveAll();view='lift';lift.part='Sixpack';lift.ex='Hanging Leg Raise';DB.settings.liveFold=false;render();})()`);
const live=now=>run(`workoutCompletionMetrics({...DB.days[todayISO],completedAt:${now}})`);

// ---- one day, two workouts, closed by Complete
seed([T('08:45'),T('09:30')]);
run(`stampWorkoutCompletion(DB.days[todayISO],${T('11:00')})`);
ok("Complete records the boundary, not just the latest time",
   run(`JSON.stringify(DB.days[todayISO].closed)`)===JSON.stringify([T('11:00')]) && run(`DB.days[todayISO].completedAt`)===T('11:00'));
let m=run(`workoutCompletionMetrics(DB.days[todayISO])`);
ok("the morning card: 2 h 15 min, 2 sets", m.minutes===135 && m.sets===2, JSON.stringify(m));
// afternoon: a set at 15:00, seen from the bar at 15:05
run(`DB.days[todayISO].w.push({part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:${T('15:00')}});reopen('Hanging Leg Raise','Sixpack');`);
m=live(T('15:05'));
ok("a set after Complete starts a NEW session: the bar counts from 15:00, not 08:45", m.minutes===5 && m.sets===1, JSON.stringify(m));
run(`stampWorkoutCompletion(DB.days[todayISO],${T('15:40')})`);
m=run(`workoutCompletionMetrics(DB.days[todayISO])`);
ok("the afternoon card describes the afternoon: 40 min, 1 set", m.minutes===40 && m.sets===1, JSON.stringify(m));
ok("...both boundaries kept, in order", run(`JSON.stringify(DB.days[todayISO].closed)`)===JSON.stringify([T('11:00'),T('15:40')]));
ok("...while the DAY still holds all three sets", run(`DB.days[todayISO].w.length`)===3);

// ---- the forgotten Complete: a 2-hour gap
seed([T('08:00'),T('08:30'),T('11:00')]);
m=live(T('11:10'));
ok("2 h 30 min of silence, no Complete: the 11:00 set is a new session", m.minutes===10 && m.sets===1, JSON.stringify(m));
seed([T('08:00'),T('08:30'),T('09:30')]);
m=live(T('09:40'));
ok("a 1-hour gap is a long rest, not a new workout", m.minutes===100 && m.sets===3, JSON.stringify(m));
seed([T('08:00'),T('09:59')]);
ok("1 h 59 min stays one session", live(T('10:00')).sets===2);
seed([T('08:00'),T('10:00')]);
ok("...2 h 00 min is the line", live(T('10:01')).sets===1);

// ---- the day before any of this
seed([T('08:45'),T('09:30')]);
m=live(T('10:00'));
ok("a day with no closes and no gaps is one session, as every past day was", m.minutes===75 && m.sets===2);
run(`DB.days[todayISO].w.forEach(s=>delete s.at)`);
ok("legacy sets with no time stay unknown, not zero", live(T('10:00')).minutes===null && live(T('10:00')).sets===2);

// ---- the bar reads the session, end to end
seed([T('08:45')],[T('11:00')]);
run(`DB.days[todayISO].w.push({part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:Date.now()-3*60000});SEED=deriveAll();render();syncLiveWorkout();`);
ok("the live bar shows the new session's minutes, not the day's",
   /^[1-4] min · 1 set$/.test(run(`document.querySelector('.live-workout-meta').textContent`)), run(`document.querySelector('.live-workout-meta').textContent`));

// ---- v4.6.71: the stray set, deleted -- the maker's own afternoon
/* Completed at 11:00. One accidental set at 15:50 reopened the day and started
   a session, which is right. Deleting it must put the day BACK in the book:
   no bar, no Finish, and certainly not the morning's 7 h 8 min. */
seed([T('08:45'),T('09:30')]);
run(`stampWorkoutCompletion(DB.days[todayISO],${T('11:00')});DB.days[todayISO].doneAll=true;render();syncLiveWorkout();`);
ok("(fixture) the morning is in the book: no bar", run(`document.getElementById('liveWorkoutBar').hidden`) && !run(`isLive()`));
run(`plLog({part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:${T('15:50')}});reopen('Hanging Leg Raise','Sixpack');save();SEED=deriveAll();render();syncLiveWorkout();`);
ok("a stray set reopens the day and the bar shows the NEW session", !run(`document.getElementById('liveWorkoutBar').hidden`) && /1 set$/.test(run(`document.querySelector('.live-workout-meta').textContent`)), run(`document.querySelector('.live-workout-meta').textContent`));
// Edit Logged, and the x on the stray row itself -- the path the maker took
run(`lift.editToday=true;renderLift();(function(){const i=dayMeta().w.findIndex(s=>s.at===${T('15:50')});document.querySelector('[data-lw-del="'+i+'"]').click();})()`);
ok("deleting it puts the day back in the book -- doneAll restored from the Complete on record", run(`DB.days[todayISO].doneAll===true`));
ok("...the bar is gone, not showing the morning", run(`document.getElementById('liveWorkoutBar').hidden`));
ok("...isLive agrees", !run(`isLive()`));
ok("...and the morning's sets are untouched", run(`DB.days[todayISO].w.length`)===2);
/* v3.3.431 still holds where it should: a day NOBODY completed does not close itself */
seed([T('08:45'),T('09:30')]);
run(`(function(){const t=dayMeta();t.w.splice(1,1);resealDay(t);})()`);
ok("a day with no Complete on record never closes itself on a delete (v3.3.431)", run(`DB.days[todayISO].doneAll!==true`));
/* and a real second session is not closed by deleting one of ITS sets while others remain */
seed([T('08:45')],[T('11:00')]);
run(`DB.days[todayISO].w.push({part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:${T('15:50')}},{part:'Sixpack',ex:'Hanging Leg Raise',w:0,reps:[12],at:${T('15:55')}});reopen('Hanging Leg Raise','Sixpack');(function(){const t=dayMeta();t.w.splice(1,1);resealDay(t);})();syncLiveWorkout();`);
ok("deleting one set of a live second session keeps it live", run(`DB.days[todayISO].doneAll===false`) && !run(`document.getElementById('liveWorkoutBar').hidden`));

// ---- sync keeps every boundary
const src=fs.readFileSync(path.join(dir,'js/core.js'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
ok("the day merge unions closed boundaries rather than dropping them", /lv\.closed\s*=\s*\[\.\.\.new Set\(\[\.\.\.\(lv\.closed\|\|\[\]\),\.\.\.rv\.closed\]\)\]/.test(src));

console.log(fail?`FAIL ${fail}`:"PASS sessions: Complete closes one, a 2 h gap opens one, the bar and card describe the session, the day stays the day");
process.exit(fail?1:0);
