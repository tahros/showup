// Synthetic fixtures only. An optional local backup path is read, never saved.
const fs=require('fs'),vm=require('vm'),assert=require('assert'),{JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8'),dom=new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g,''),{url:'https://tahros.github.io/showup/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,c=dom.getInternalVMContext();
w.fetch=()=>Promise.reject(Error('offline'));w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};
w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*10})},{get:(o,k)=>o[k]||(()=>{})});
for(const m of html.matchAll(/src="(js\/[^?"]+)\?v=/g))vm.runInContext(fs.readFileSync(m[1],'utf8'),c);
const run=s=>vm.runInContext(s,c),start=Date.parse('2026-09-18T13:00:00Z');
w.fixture=[{part:'Run',ex:'Run',mins:30,secs:0,at:start,w:3,reps:[]},{part:'Biceps',ex:'Curl',w:10,reps:[8],at:start+60000},{part:'Biceps',ex:'Curl',w:10,reps:[8],at:start+181000}];
const before=JSON.stringify(w.fixture),m=run('historyTiming(fixture)');assert.equal(m.exercises.Curl.seconds,121);assert.equal(m.exercises.Run.seconds,1800);assert.equal(m.total.seconds,1981);assert(m.total.estimated);assert.equal(JSON.stringify(w.fixture),before);
assert.equal(run('historyTiming([{ex:"Curl",reps:[8],at:fixture[1].at}]).exercises.Curl'),undefined);
assert.equal(run('historyTiming([{ex:"Curl",reps:[8,8]}]).total'),null);
assert.equal(run('historyTiming([{ex:"Run",mins:0,reps:[],at:fixture[0].at}]).total'),null);
assert.equal(run('historyTiming([{ex:"Curl",reps:[8],at:1},{ex:"Curl",reps:[8],at:2}]).total'),null);
assert.equal(run('historyTiming([{ex:"Curl",reps:[8],at:fixture[1].at},{ex:"Curl",reps:[8],at:fixture[1].at}]).total'),null);
assert.equal(run('historyTiming([...fixture,{ex:"Curl",reps:[8]}]).total'),null);
run(`todayISO='2026-09-20';checkDate=()=>false;DB={days:{'2026-09-18':{w:fixture,completedAt:fixture[2].at+6*3600000}},settings:{onboarded:true,unit:'lb'}};SEED=deriveAll();hist={y:2026,m:9,part:null};view='history';renderHistory();`);
assert(w.document.querySelector('.history-totals'));assert(w.document.querySelector('.history-time'));assert(w.document.querySelector('.history-totals').textContent.includes('~33 min'));
let drawn=[];w.ctx2=new Proxy({canvas:{height:0},measureText:s=>({width:String(s).length*14}),fillText(t,x,y){drawn.push({t:String(t),x,y});}},{get:(o,k)=>o[k]||(()=>{})});run("drawDayCard(ctx2,1080,'2026-09-18')");assert(drawn.some(t=>t.t==='2m 01s'));assert(drawn.some(t=>t.t==='~33 min'&&t.x===96));assert(drawn.some(t=>t.t==='3'&&t.x>700));
if(process.argv[2]){const backup=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));w.privateDoc=backup.doc;const original=JSON.stringify(backup.doc);run('DB=privateDoc;SEED=deriveAll()');const actual=run("historyTiming(DB.days['2026-09-18'].w)");assert.equal(actual.exercises['EZ Bar Curl'].seconds,378);assert.equal(actual.exercises['Skull Crusher'].seconds,536);assert.equal(actual.total.seconds,4637);drawn=[];run("drawDayCard(ctx2,1080,'2026-09-18')");assert(drawn.some(t=>t.t==='~77 min'));assert(drawn.some(t=>t.t==='22'));assert.equal(JSON.stringify(backup.doc),original);console.log('PASS optional backup: verified timing, total sets, share output and unchanged records');}
console.log('PASS timing semantics, missing/invalid/legacy/single-set data, history footer and canvas positions');dom.window.close();process.exit(0);
