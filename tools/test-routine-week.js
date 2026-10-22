/* test-routine-week.js DIR -- v4.6.376: the routine plans every training day.
 * A training day with nothing saved is written from the next session that
 * morning; a rest day is not; a saved plan is never overwritten; a missed day
 * moves nothing (the session waits); Train anyway writes the next one on a rest
 * day; Today shows the coming week; routineAuto:false switches it off. */
const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),vm=require('vm');
const dir=path.resolve(process.argv[2]||'.');let fails=0;
const ok=(n,c,g)=>{console.log((c?'PASS ':'FAIL ')+n+(g!==undefined&&!c?' → '+JSON.stringify(g):''));if(!c)fails++;};
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const order=[...html.matchAll(/src="(js\/[^?"]+)\?v=/g)].map(m=>m[1]);
const dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window,ctx=dom.getInternalVMContext();
w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){}});w.navigator.vibrate=()=>{};w.scrollTo=()=>{};w.fetch=async()=>{throw new Error('offline');};
w.HTMLCanvasElement.prototype.getContext=function(){return new Proxy({},{get:()=>()=>({})});};
for(const s of order) vm.runInContext(fs.readFileSync(path.join(dir,s),'utf8'),ctx,{filename:s});
const run=c=>vm.runInContext(c,ctx),q=s=>w.document.querySelector(s);
const setup=(today,extra='')=>run(`DB={days:{},settings:{onboarded:true,routineAuto:true,unit:'lb',mascotMotion:'still',objective:'grow',weekStart:'sunday',
  plannerPreferences:{trainDays:[1,2,4,5],orderMode:'own',rotation:{preset:'ul',sessions:[{name:'Upper',parts:['Chest','Back','Shoulder','Biceps','Triceps']},{name:'Lower',parts:['Legs','Sixpack']}]}}},plan:null,week:null,planTracking:null};
  todayISO='${today}';checkDate=()=>false;save=()=>{};${extra}SEED=deriveAll();view='today';render();`);
setup('2026-10-22');   // Thursday, a training day
ok('a training day with nothing saved is written from the routine', run(`DB.plan&&DB.plan.d===todayISO&&DB.plan.auto==='routine'&&DB.plan.title==='Upper'&&DB.plan.items.length>=5`), run('JSON.stringify(DB.plan&&{d:DB.plan.d,t:DB.plan.title})'));
ok('Today names it', /Upper/.test(q('.today-focus-title')?.textContent||''));
ok('This week: seven days, today first, rest days marked', w.document.querySelectorAll('.tw-day').length===7&&q('.tw-day.today')&&w.document.querySelectorAll('.tw-day.tw-rest').length===3);
ok('...the sessions in order on the training days', run(`rtWeek().filter(x=>x.kind!=='rest').map(x=>x.name).join()`)==='Upper,Lower,Upper,Lower', run(`rtWeek().map(x=>x.name).join()`));
ok('a Lower day is mostly legs: core is one exercise', run(`(t=>t.split('\\n').filter(l=>!/^ /.test(l)).filter(e=>catFor('Sixpack').includes(e)).length)(rtDayText({parts:['Legs','Sixpack']}))`)===1);
ok('the whole week is in Plan: every training day is a saved plan', run(`['2026-10-23','2026-10-26','2026-10-27'].map(d=>pwSaved(d)&&DB.week.days[d].title).join()`)==='Lower,Upper,Lower', run(`Object.keys(DB.week?.days||{}).join()`));
ok('...rest days are not', !run(`pwSaved('2026-10-24')||pwSaved('2026-10-25')`));
ok('...and Today does not repeat them as a planned-days list', !q('.today-focus-more')&&!q('.today-focus-upcoming'));
q('[data-rtday="2026-10-23"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok('a weight not known yet is the hollow dumbbell, not words', !!q('.tw-detail .feel-ic')&&!/by feel/i.test(q('.tw-detail').textContent), q('.tw-detail')?.innerHTML.slice(0,300));
ok('tapping a day shows what it holds, with Edit this day', /Fri · Lower/.test(q('.tw-detail')?.textContent||'')&&!!q('.tw-detail [data-pw="open-date"][data-date="2026-10-23"]'));
w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){},addListener(){}});   // reduced motion: the fold opens at once
q('.tw-day.today').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok('tapping Today opens today\'s workout card and closes the open day', !q('.tw-detail')&&q('.today-focus-plan')?.open===true, {detail:!!q('.tw-detail'),open:q('.today-focus-plan')?.open});
run(`todayISO='2026-10-23';SEED=deriveAll();render();`);   // Thursday was missed
ok('a missed day: the session waits', run(`DB.plan.d===todayISO&&DB.plan.title==='Upper'`), run('DB.plan&&DB.plan.title'));
ok('...the rest of the week moves up in Plan', run(`['2026-10-26','2026-10-27','2026-10-29'].map(d=>DB.week.days[d]?.title).join()`)==='Lower,Upper,Lower', run(`JSON.stringify(Object.fromEntries(Object.entries(DB.week.days).map(([d,v])=>[d,v.title])))`));
ok('...and the missed day leaves the plan', !run(`DB.week.days['2026-10-22']`));
/* Plan's Save writes the same sets back in its own words: still the routine's */
setup('2026-10-22');
run(`{const d='2026-10-26',b=DB.week.days[d];DB.week.days[d]={...planItemsFrom(parsePlan(b.raw)),raw:b.raw.replace(/\\n  /g,'\\n    ')+'\\n',title:'Chest + Back'};}render();`);
ok('a day saved unchanged from Plan is still the routine\'s: no dot, its name kept', run(`rtWeek().find(x=>x.d==='2026-10-26').kind`)==='auto'&&run(`DB.week.days['2026-10-26'].title`)==='Upper', run(`JSON.stringify(rtWeek().find(x=>x.d==='2026-10-26'))`));
/* a day you edit stays put; the order steps round it */
setup('2026-10-22');
run(`{const t="Deadlift\\n  155 lb x 5";const {items}=planItemsFrom(parsePlan(t));DB.week.days['2026-10-26']={title:'Mine',items,note:'',raw:t};}render();`);
ok('an edited day is yours: kept as you wrote it', run(`DB.week.days['2026-10-26'].title==='Mine'&&DB.week.days['2026-10-26'].items[0].ex==='Deadlift'`));
run(`todayISO='2026-10-23';SEED=deriveAll();render();`);   // Thursday missed again
ok('...it stays put when the week moves up, and takes its turn', run(`DB.week.days['2026-10-26'].title==='Mine'&&DB.plan.title==='Upper'&&DB.week.days['2026-10-27'].title==='Upper'`), run(`JSON.stringify(Object.fromEntries(Object.entries(DB.week.days).map(([d,v])=>[d,v.title])))`));
run(`delete DB.week.days['2026-10-27'];render();`);
ok('a day you remove stays empty', !run(`DB.week.days['2026-10-27']`)&&run(`DB.week.days['2026-10-29'].title`)==='Upper', run(`JSON.stringify(Object.fromEntries(Object.entries(DB.week.days).map(([d,v])=>[d,v.title])))`));
setup('2026-10-24');   // Saturday, a rest day
ok('a rest day is not written', !run('DB.plan'));
ok('...it says rest, and what is next', /Rest day/.test(q('.tw-restline')?.textContent||'')&&/Mon · Upper/.test(q('.tw-restline').textContent), q('.tw-restline')?.textContent);
q('[data-rtanyway]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok('Train anyway writes the next session for today', run(`DB.plan&&DB.plan.d===todayISO&&DB.plan.title==='Upper'`));
ok('...and the week behind it moves up', run(`DB.week.days['2026-10-26'].title`)==='Lower', run(`JSON.stringify(Object.fromEntries(Object.entries(DB.week.days).map(([d,v])=>[d,v.title])))`));
setup('2026-10-22',`{const t="Deadlift\\n  155 lb x 5";const {items}=planItemsFrom(parsePlan(t));planSave(items,'',t,'2026-10-22');}`);
ok('a plan you saved is never overwritten', run(`DB.plan.items.length===1&&DB.plan.items[0].ex==='Deadlift'&&DB.plan.auto!=='routine'`));
ok('...it takes its turn: the next day is Lower', run(`DB.week.days['2026-10-23'].title`)==='Lower');
setup('2026-10-22',`DB.settings.routineAuto=false;`);
ok('switched off: nothing is written and no week card', !run('DB.plan')&&!run('DB.week')&&!q('.tw'));
/* v4.6.378: no set weekdays. Three a week plus an Extra; the week fills from today */
const flex=(today,extra='')=>setup(today,`DB.settings.plannerPreferences={frequency:3,trainDays:[],orderMode:'own',rotation:{preset:'ul',sessions:[{name:'Upper',parts:['Chest','Back','Shoulder','Biceps','Triceps']},{name:'Lower',parts:['Legs','Sixpack']}]},extra:{name:'',parts:['Biceps','Triceps']}};${extra}`);
const names=()=>run(`rtWeek().map(x=>x.kind==='rest'?'-':x.kind==='extra'?'X':x.name).join()`);
flex('2026-10-21');   // Wednesday, nothing done this week (weeks start Sunday)
ok('flex: the next free days take the sessions, then the Extra, then rest', names()==='Upper,Lower,Upper,X,Lower,Upper,Lower', names());
ok('...the Extra is written into Plan, marked as the Extra', /^Extra · /.test(run(`DB.week.days['2026-10-24'].title`))&&!!q('.tw-day.tw-extra'));
q('[data-rtday="2026-10-24"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
ok('...and says it is optional', /Optional · once your 3 days are done/.test(q('.tw-detail')?.textContent||''));
flex('2026-10-21',`for(const d of ['2026-10-19','2026-10-20'])DB.days[d]={w:[{ex:'Leg Press',part:'Legs',w:100,reps:[10],at:Date.parse(d+'T12:00')}]};`);
ok('flex: two done this week -- one main left, then the Extra, then rest until the new week', names()==='Upper,X,-,-,Lower,Upper,Lower', names());
flex('2026-10-21');run(`todayISO='2026-10-22';SEED=deriveAll();render();`);
ok('flex: skip a day and the rest move up; this week has no room left for the Extra; next week\'s comes after its three', names()==='Upper,Lower,Upper,Lower,Upper,Lower,X', names());
console.log(fails?`\n${fails} FAILED`:'\nALL PASS');process.exit(fails?1:0);
