// test-mascot.js DIR — real completion router, timing, milestones and themes.
const { JSDOM } = require("jsdom");
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || "stage42";

const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const order = [...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m => m[1]);
const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ""), {
  url: "https://tahros.github.io/showup/", runScripts: "outside-only", pretendToBeVisual: true });
const w = dom.window, ctx = dom.getInternalVMContext();
w.fetch = () => Promise.reject(new Error("offline"));
w.matchMedia = w.matchMedia || (() => ({ matches:false, addEventListener(){}, removeEventListener(){} }));
w.navigator.vibrate = () => {}; w.scrollTo = () => {};
w.HTMLCanvasElement.prototype.getContext = function(){ return new Proxy({}, { get: () => () => ({}) }); };
for (const s of order) vm.runInContext(fs.readFileSync(path.join(dir, s), "utf8"), ctx, { filename: s });
w.document.dispatchEvent(new w.Event("DOMContentLoaded", { bubbles: true }));
const run = c => vm.runInContext(c, ctx);

let fail=0;
const ok=(name,cond,note)=>{console.log((cond?"PASS":"FAIL"),name,note!==undefined?"→ "+note:"");if(!cond)fail++;};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));


run("DB.settings.mascotMotion='animated'");
ok('mascot enabled',run("mascotHTML('cool').includes('data-mascot=\"cool\"')"));
run("document.documentElement.dataset.theme='dark'");
ok('dark content gets white mascot',run("mascotHTML().includes('mascot-white.png')"));
ok('completed dark content gets blue still',run("mascotHTML('cool').includes('mascot-blue.png')"));
run("document.documentElement.dataset.theme='light'");
ok('light content gets charcoal mascot',run("mascotHTML().includes('mascot-charcoal.png')"));
ok('completed light content gets blue still',run("mascotHTML('cool').includes('mascot-blue.png')"));
run("DB.settings.mascotMotion='off'");
ok('off restores non-mascot layout',run("mascotHTML()===''"));
run("DB.settings.mascotMotion='animated'");
run("var end=Date.now(),record={completedAt:end,w:[{part:'Run',ex:'Run',mins:15,secs:0,reps:[],at:end-20*60000},{part:'Chest',ex:'Bench Press',reps:[8,8,7,6],at:end-18*60000},{part:'Sixpack',ex:'Hanging Leg Raise',reps:[12,12,12,12],at:end-10*60000}]};");
ok('runtime precedes the initial run log',run('workoutCompletionMetrics(record).minutes===35'));
ok('counts every rep-array set and unique exercise',run('workoutCompletionMetrics(record).sets===9&&workoutCompletionMetrics(record).exercises===3'));
ok('duration is immutable on replay',run('workoutCompletionMetrics(record).minutes===35'));
ok('untimed records never invent elapsed time',run("workoutCompletionMetrics({completedAt:end,w:[{ex:'Squat',reps:[8]}]}).minutes===null"));
ok('partially timed records are also unknown',run("workoutCompletionMetrics({completedAt:end,w:[{ex:'Squat',at:end-60000,reps:[8]},{ex:'Run'}]}).minutes===null"));
ok('empty rows are zero sets and exercises',run("workoutCompletionMetrics({w:[]}).sets===0&&workoutCompletionMetrics({w:[]}).exercises===0"));
run("DB.days={};delete DB.settings.mascot25Date;for(let i=1;i<=24;i++){const d=new Date(todayISO+'T12:00');d.setDate(d.getDate()-i*2);DB.days[d.toLocaleDateString('en-CA')]={w:[{part:'Legs',ex:'Squat',reps:[8]}]};}DB.days[todayISO]={w:record.w,doneAll:false,doneEx:[],donePart:[]};SEED=deriveAll();view='today';render();");
ok('imports/rendering never award milestone',run('!DB.settings.mascot25Date'));
run("document.querySelector('#doneAllBtn').click()");
ok('actual completion earns the 25 non-consecutive days milestone',run('DB.settings.mascot25Date===todayISO'));
run("document.querySelector('[data-dd=milestone]').click()");
ok('all 25 boxes rendered, no checkmarks',run("document.querySelectorAll('.su-milestone-grid i').length===25&&!document.querySelector('.su-milestone-grid').textContent.includes('✓')"));
const snapshot=run('JSON.stringify(DB)');
run("document.querySelector('[data-dd=\"done\"]').click();celebrateDayDone(true)");
ok('milestone replay cannot change ledger or timestamps',snapshot===run('JSON.stringify(DB)'));
run("document.querySelector('[data-dd=\"done\"]').click();reopen('Bench Press','Chest');render();");
ok('new set reopens live red mascot',run('!dayMeta().doneAll&&!!document.querySelector("[data-mascot=active]")'));
run("stampWorkoutCompletion(dayMeta(),end+60000)");
ok('recompletion updates the endpoint, keeps original start',run('workoutCompletionMetrics(dayMeta()).minutes===36'));
ok('setting is present in sync snapshot',run("'mascotMotion' in settingsSnap()"));
const renderer=fs.readFileSync(path.join(dir,'js/mascot-renderer.js'),'utf8');
ok('renderer transparent and free of glow filters',renderer.includes('alpha:true')&&renderer.includes('scene.background=null')&&!/BloomPass|blur\(|drop-shadow/.test(renderer));
ok('approved jump frames and conversion retained',renderer.includes('key(1170,{sx:1.03,sy:.98,y:-110')&&renderer.includes('lift:-f.y*.65/46.7'));
ok('local vendor supports offline',renderer.includes("../vendor/three-r169.module.min.js"));
dom.window.close();process.exit(fail?1:0);
